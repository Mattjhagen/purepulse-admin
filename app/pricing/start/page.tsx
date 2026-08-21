'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/lib/types'

const PLAN_IDS = ['starter', 'growth', 'premium', 'business'] as const

function StartForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') as Plan | null
  const plan: Plan = planParam && (PLAN_IDS as readonly string[]).includes(planParam) ? planParam : 'starter'
  const refCode = searchParams.get('ref') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [websiteType, setWebsiteType] = useState('brochure')
  const [businessSummary, setBusinessSummary] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [pages, setPages] = useState('Home, About, Services, Contact')
  const [features, setFeatures] = useState('Contact form')
  const [styleNotes, setStyleNotes] = useState('')
  const [exampleSites, setExampleSites] = useState('')
  const [contentStatus, setContentStatus] = useState('needs_help')
  const [desiredLaunchDate, setDesiredLaunchDate] = useState('')
  const [spendingCap, setSpendingCap] = useState('500')
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
        body: JSON.stringify({
          name,
          email,
          company,
          plan,
          ref_code: refCode || undefined,
          website_type: websiteType,
          business_summary: businessSummary,
          target_audience: targetAudience,
          pages: pages.split(',').map(value => value.trim()).filter(Boolean),
          features: features.split(',').map(value => value.trim()).filter(Boolean),
          style_notes: styleNotes,
          example_sites: exampleSites.split(/[,\n]/).map(value => value.trim()).filter(Boolean),
          content_status: contentStatus,
          desired_launch_date: desiredLaunchDate || undefined,
          spending_cap_dollars: Number(spendingCap),
        }),
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
            <div style={s.lineRow}>
              <span>Build work</span>
              <span style={s.lineAmt}>$25/hour</span>
            </div>
            <div style={{ ...s.lineRow, ...s.totalRow }}>
              <span>Due today</span>
              <span style={s.lineAmt}>${todayTotal}.00</span>
            </div>
            <p style={s.fine}>
              Your deposit is credited toward build work. The pipeline pauses automatically at your approved spending cap.
            </p>
          </aside>

          {/* Right: form */}
          <div style={s.formCard}>
            <h1 style={s.h1}>Get started</h1>
            <p style={s.sub}>Tell us what you need. We&apos;ll turn this brief into your contract and a capped, trackable build project.</p>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.sectionHeading}>
                <span style={s.step}>1</span>
                <div><strong>Contact</strong><span style={s.sectionHint}>Who should approve the project?</span></div>
              </div>
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

              <div style={s.sectionHeading}>
                <span style={s.step}>2</span>
                <div><strong>Website brief</strong><span style={s.sectionHint}>Describe the result you want.</span></div>
              </div>

              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Website type *</label>
                  <select style={s.input} value={websiteType} onChange={e => setWebsiteType(e.target.value)}>
                    <option value="brochure">Business / brochure</option>
                    <option value="booking">Booking or appointments</option>
                    <option value="store">Online store</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="membership">Membership</option>
                    <option value="custom">Custom web app</option>
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Content readiness *</label>
                  <select style={s.input} value={contentStatus} onChange={e => setContentStatus(e.target.value)}>
                    <option value="ready">Copy and images are ready</option>
                    <option value="partial">Some content is ready</option>
                    <option value="needs_help">I need content help</option>
                  </select>
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>What does your business do? *</label>
                <textarea style={s.textarea} required value={businessSummary} onChange={e => setBusinessSummary(e.target.value)} placeholder="We help local homeowners…" rows={3} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Who is the website for? *</label>
                <textarea style={s.textarea} required value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Homeowners in the Chicago area who…" rows={2} />
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Pages <span style={s.optional}>(comma separated)</span></label>
                  <input style={s.input} value={pages} onChange={e => setPages(e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Features <span style={s.optional}>(comma separated)</span></label>
                  <input style={s.input} value={features} onChange={e => setFeatures(e.target.value)} placeholder="Booking, payments, gallery" />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Style, colors, and personality</label>
                <textarea style={s.textarea} value={styleNotes} onChange={e => setStyleNotes(e.target.value)} placeholder="Clean, warm, premium; avoid corporate blue…" rows={2} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Example websites</label>
                <textarea style={s.textarea} value={exampleSites} onChange={e => setExampleSites(e.target.value)} placeholder="One URL per line" rows={2} />
              </div>

              <div style={s.sectionHeading}>
                <span style={s.step}>3</span>
                <div><strong>Budget controls</strong><span style={s.sectionHint}>Work stops before it exceeds this amount.</span></div>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Desired launch date</label>
                  <input style={s.input} type="date" value={desiredLaunchDate} onChange={e => setDesiredLaunchDate(e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Hard spending cap *</label>
                  <div style={s.moneyInput}><span>$</span><input style={s.moneyField} required type="number" min="25" max="25000" step="25" value={spendingCap} onChange={e => setSpendingCap(e.target.value)} /></div>
                </div>
              </div>
              <div style={s.capNotice}>
                At $25/hour, a ${Number(spendingCap || 0).toLocaleString()} cap authorizes up to <strong>{(Number(spendingCap || 0) / 25).toFixed(1)} hours</strong>. You&apos;ll see the time ledger and receive alerts before the cap is reached.
              </div>

              {error && <p style={s.errorMsg}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ ...s.btn, opacity: loading ? 0.65 : 1 }}
              >
                {loading ? 'Creating your project…' : 'Review contract & start project →'}
              </button>

              <p style={s.legal}>
                Nothing starts until you sign the contract and authorize payment. Build time is billed in one-minute increments.
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
  sectionHeading: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 18, borderTop: '1px solid #f0f1f3', fontSize: '0.95rem' },
  step: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 999, background: '#111', color: '#fff', fontSize: '0.75rem', fontWeight: 800 },
  sectionHint: { display: 'block', color: '#9ca3af', fontSize: '0.75rem', marginTop: 2, fontWeight: 400 },
  label: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#374151' },
  optional: { color: '#9ca3af', fontWeight: 500, textTransform: 'none' as const, letterSpacing: 0 },
  input: { padding: '11px 13px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, width: '100%' },
  textarea: { padding: '11px 13px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, width: '100%', resize: 'vertical' as const },
  moneyInput: { display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #d1d5db', borderRadius: 8, padding: '0 13px', fontWeight: 700 },
  moneyField: { border: 0, outline: 0, padding: '11px 0', fontSize: '0.9375rem', fontFamily: 'inherit', width: '100%', background: 'transparent' },
  capNotice: { padding: '13px 14px', borderRadius: 8, background: '#f3f4f6', color: '#4b5563', fontSize: '0.8rem', lineHeight: 1.55 },
  errorMsg: { color: '#b91c1c', fontSize: '0.875rem', margin: 0 },
  btn: { padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  legal: { fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' as const, margin: '4px 0 0', lineHeight: 1.5 },
  footer: { textAlign: 'center' as const, padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb' },
}
