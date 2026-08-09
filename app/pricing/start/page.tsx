'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/lib/types'

const PLAN_IDS = ['starter', 'growth', 'premium', 'business'] as const

function StartForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') as Plan | null
  const plan: Plan = planParam && (PLAN_IDS as readonly string[]).includes(planParam) ? planParam : 'starter'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const monthlyRate = PLAN_PRICES[plan]
  const depositAmt = 150
  const todayTotal = depositAmt + monthlyRate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pricing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, plan, description }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      router.push(`/sign/${data.token}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <a href="https://purepulse.one" style={s.logo}>PurePulse</a>
        <a href="/pricing" style={s.back}>← Back to pricing</a>
      </header>

      <main style={s.main}>
        <div style={s.layout}>
          {/* Left: summary */}
          <aside style={s.summary}>
            <p style={s.eyebrow}>You selected</p>
            <h2 style={s.planName}>{PLAN_LABELS[plan]}</h2>
            <div style={s.priceRow}>
              <span style={s.dollar}>$</span>
              <span style={s.price}>{monthlyRate}</span>
              <span style={s.perMo}>/mo</span>
            </div>
            <div style={s.divider} />
            <div style={s.lineRow}>
              <span>One-time deposit</span>
              <span style={s.lineAmt}>${depositAmt}.00</span>
            </div>
            <div style={s.lineRow}>
              <span>First month ({PLAN_LABELS[plan]})</span>
              <span style={s.lineAmt}>${monthlyRate}.00</span>
            </div>
            <div style={{ ...s.lineRow, ...s.totalRow }}>
              <span>Due today</span>
              <span style={s.lineAmt}>${todayTotal}.00</span>
            </div>
            <p style={s.fine}>
              After today, you&apos;ll be billed ${monthlyRate}/mo. Cancel anytime with 30 days&apos; notice.
            </p>
          </aside>

          {/* Right: form */}
          <div style={s.formCard}>
            <h1 style={s.h1}>Tell us about your project</h1>
            <p style={s.sub}>We&apos;ll send you a contract to review and sign, then you&apos;ll complete payment.</p>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Full name *</label>
                  <input
                    style={s.input}
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Email *</label>
                  <input
                    style={s.input}
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Company / business name</label>
                <input
                  style={s.input}
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Acme Corp (optional)"
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Tell us about your website *</label>
                <textarea
                  style={{ ...s.input, minHeight: 120, resize: 'vertical' }}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What kind of site do you need? What does your business do? Any existing site or specific goals?"
                />
              </div>

              {error && <p style={s.errorMsg}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ ...s.btn, opacity: loading ? 0.65 : 1 }}
              >
                {loading ? 'Setting up your contract…' : 'Continue to contract →'}
              </button>

              <p style={s.legal}>
                By continuing you&apos;ll receive a contract via email. No charge until after you sign.
              </p>
            </form>
          </div>
        </div>
      </main>

      <footer style={s.footer}>
        © {new Date().getFullYear()} PurePulse · Web Design &amp; Maintenance ·{' '}
        <a href="https://purepulse.one" style={{ color: '#9ca3af', textDecoration: 'underline' }}>purepulse.one</a>
      </footer>
    </div>
  )
}

export default function StartPage() {
  return (
    <Suspense>
      <StartForm />
    </Suspense>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  back: { fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' },
  main: { maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 40, alignItems: 'start' },
  summary: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '28px 24px', position: 'sticky', top: 84 },
  eyebrow: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 8px' },
  planName: { fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#111', margin: '0 0 4px' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 20 },
  dollar: { fontSize: '1.1rem', fontWeight: 700 },
  price: { fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' },
  perMo: { fontSize: '0.875rem', color: '#6b7280', marginLeft: 2 },
  divider: { borderTop: '1px solid #f3f4f6', margin: '0 0 16px' },
  lineRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#555', marginBottom: 10 },
  lineAmt: { fontWeight: 600, color: '#111' },
  totalRow: { borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4, fontWeight: 700, color: '#111', fontSize: '0.9375rem' },
  fine: { fontSize: '0.75rem', color: '#9ca3af', marginTop: 16, lineHeight: 1.6 },
  formCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '36px 32px' },
  h1: { fontSize: 'clamp(1.4rem, 3vw, 1.875rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' },
  sub: { fontSize: '0.9rem', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 18 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 5 },
  label: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#374151' },
  input: { padding: '11px 13px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, width: '100%' },
  errorMsg: { color: '#b91c1c', fontSize: '0.875rem', margin: 0 },
  btn: { padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  legal: { fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' as const, margin: '4px 0 0', lineHeight: 1.5 },
  footer: { textAlign: 'center' as const, padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb' },
}
