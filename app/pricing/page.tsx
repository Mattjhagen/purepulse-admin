'use client'
import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 20,
    description: 'Essential care for a site that just needs to stay online and up-to-date.',
    features: [
      'Secure hosting & uptime monitoring',
      'Up to 2 content updates per month',
      'Bug fixes & security patches',
      'Email support',
    ],
    notIncluded: ['Priority response time', 'SEO optimization', 'Analytics dashboard'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 50,
    description: 'More updates, better search visibility, and the data to help your site perform.',
    features: [
      'Everything in Starter',
      'Unlimited content updates',
      'Priority email support (24h)',
      'Basic SEO optimization',
      'Google Analytics setup',
      'Monthly performance report',
    ],
    notIncluded: ['Custom feature development'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 75,
    description: 'Hands-on support, advanced SEO, and custom development when you need it.',
    features: [
      'Everything in Growth',
      'Custom feature development',
      'Advanced SEO & keyword tracking',
      'Phone & video support',
      'Quarterly design refresh',
      'Social media integration',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 100,
    description: 'A dedicated website partner for businesses with ongoing changes and growth plans.',
    features: [
      'Everything in Premium',
      'Monthly planning call',
      'Priority email & phone support',
      'Up to 2 hours of approved custom website work',
    ],
  },
]

function EnterpriseForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [project, setProject] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, project: `[Enterprise] ${company ? company + ' — ' : ''}${project}`, plan: 'enterprise' }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modal.backdrop} onClick={onClose}>
      <div style={modal.box} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={modal.checkCircle}>✓</div>
            <h3 style={{ margin: '16px 0 8px', fontWeight: 700, fontSize: '1.25rem' }}>We&apos;ll be in touch soon</h3>
            <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.6 }}>
              Thanks, {name.split(' ')[0]}! We&apos;ve received your inquiry and will reach out within one business day to discuss your project.
            </p>
            <button onClick={onClose} style={modal.closeBtn}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '1.25rem' }}>Enterprise inquiry</h3>
              <p style={{ color: '#555', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                Tell us about your project. We&apos;ll get back to you within one business day to discuss a custom plan.
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={modal.row}>
                <div style={modal.field}>
                  <label style={modal.label}>Full name *</label>
                  <input style={modal.input} required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div style={modal.field}>
                  <label style={modal.label}>Email *</label>
                  <input style={modal.input} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
                </div>
              </div>
              <div style={modal.field}>
                <label style={modal.label}>Company</label>
                <input style={modal.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div style={modal.field}>
                <label style={modal.label}>Tell us about your project *</label>
                <textarea
                  style={{ ...modal.input, minHeight: 100, resize: 'vertical' }}
                  required
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  placeholder="What kind of site do you need? What's the scale? Any specific requirements?"
                />
              </div>
              {error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={onClose} style={modal.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} style={{ ...modal.submitBtn, opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Sending…' : 'Send inquiry'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [showEnterprise, setShowEnterprise] = useState(false)

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <a href="https://purepulse.one" style={s.logo}>PurePulse</a>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="https://purepulse.one" style={s.navLink}>Home</a>
          <a href="mailto:contact@purepulse.one" style={s.navLink}>Contact</a>
        </nav>
      </header>

      <main style={s.main}>
        {/* Hero */}
        <div style={s.hero}>
          <p style={s.eyebrow}>Pricing</p>
          <h1 style={s.h1}>Simple, monthly website care.</h1>
          <p style={s.subhead}>
            All plans include a one-time <strong>$150 deposit</strong> to kick off your project,
            then a flat monthly rate — no surprises, no hourly guesswork.
          </p>
        </div>

        {/* Plan cards */}
        <div style={s.grid}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ ...s.card, ...(plan.popular ? s.popularCard : {}) }}>
              {plan.popular && <div style={s.popularBadge}>Most Popular</div>}
              <div style={s.cardTop}>
                <p style={s.planName}>{plan.name}</p>
                <div style={s.priceRow}>
                  <span style={s.dollar}>$</span>
                  <span style={s.price}>{plan.price}</span>
                  <span style={s.perMo}>/mo</span>
                </div>
                <p style={s.planDesc}>{plan.description}</p>
              </div>
              <ul style={s.featureList}>
                {plan.features.map(f => (
                  <li key={f} style={s.featureItem}>
                    <span style={s.checkmark}>✓</span> {f}
                  </li>
                ))}
                {plan.notIncluded?.map(f => (
                  <li key={f} style={{ ...s.featureItem, ...s.notIncluded }}>
                    <span style={s.dash}>–</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/pricing/start?plan=${plan.id}`}
                style={{ ...s.btn, ...(plan.popular ? s.btnPrimary : s.btnSecondary) }}
              >
                Get Started
              </Link>
            </div>
          ))}

          {/* Enterprise card */}
          <div style={{ ...s.card, ...s.enterpriseCard }}>
            <div style={s.cardTop}>
              <p style={s.planName}>Enterprise</p>
              <div style={s.priceRow}>
                <span style={{ ...s.price, fontSize: '2rem' }}>Custom</span>
              </div>
              <p style={s.planDesc}>
                Complex projects with custom budgets, dedicated support, and tailored deliverables. Let&apos;s talk.
              </p>
            </div>
            <ul style={s.featureList}>
              {['Everything in Business', 'Custom scope & deliverables', 'Dedicated account manager', 'Custom SLA', 'Volume & multi-site discounts', 'White-label options'].map(f => (
                <li key={f} style={s.featureItem}>
                  <span style={s.checkmark}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowEnterprise(true)} style={{ ...s.btn, ...s.btnSecondary }}>
              Contact Us
            </button>
          </div>
        </div>

        {/* Deposit callout */}
        <div style={s.depositNote}>
          <strong>All plans require a $150 one-time deposit</strong> to begin your project.
          The deposit is non-refundable and covers initial setup, design research, and project kickoff.
          Your first month&apos;s plan fee is charged alongside the deposit, then monthly thereafter.
        </div>
      </main>

      <footer style={s.footer}>
        © {new Date().getFullYear()} PurePulse · Web Design &amp; Maintenance ·{' '}
        <a href="https://purepulse.one" style={{ color: '#9ca3af', textDecoration: 'underline' }}>purepulse.one</a>
      </footer>

      {showEnterprise && <EnterpriseForm onClose={() => setShowEnterprise(false)} />}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  navLink: { fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' },
  main: { maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' },
  hero: { textAlign: 'center', marginBottom: 56 },
  eyebrow: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 12px' },
  h1: { fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.15 },
  subhead: { fontSize: '1.0625rem', color: '#555', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, alignItems: 'start' },
  card: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', overflow: 'hidden' },
  popularCard: { border: '1.5px solid #111', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' },
  enterpriseCard: { border: '1.5px solid #e5e7eb', background: '#fafafa' },
  popularBadge: { position: 'absolute', top: 16, right: 16, background: '#111', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999 },
  cardTop: { display: 'flex', flexDirection: 'column', gap: 8 },
  planName: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: 0 },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 2 },
  dollar: { fontSize: '1.25rem', fontWeight: 700 },
  price: { fontSize: '2.75rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' },
  perMo: { fontSize: '0.9rem', color: '#6b7280', marginLeft: 2 },
  planDesc: { fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6, margin: 0 },
  featureList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.875rem', lineHeight: 1.5 },
  checkmark: { color: '#111', fontWeight: 700, flexShrink: 0, marginTop: 1 },
  notIncluded: { color: '#9ca3af' },
  dash: { color: '#d1d5db', fontWeight: 700, flexShrink: 0, marginTop: 1 },
  btn: { display: 'block', width: '100%', padding: '13px', borderRadius: 8, fontWeight: 700, fontSize: '0.9375rem', textAlign: 'center', textDecoration: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'opacity 0.15s' },
  btnPrimary: { background: '#111', color: '#fff' },
  btnSecondary: { background: '#f3f4f6', color: '#111' },
  depositNote: { marginTop: 48, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', fontSize: '0.875rem', color: '#555', lineHeight: 1.7, textAlign: 'center', maxWidth: 680, marginInline: 'auto' },
  footer: { textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb' },
}

const modal: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  box: { background: '#fff', borderRadius: 14, padding: '32px', maxWidth: 560, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  checkCircle: { width: 52, height: 52, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.375rem', margin: '0 auto', lineHeight: '52px', textAlign: 'center' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151' },
  input: { padding: '10px 12px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', width: '100%' },
  cancelBtn: { padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, background: '#f3f4f6', color: '#111', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
  submitBtn: { padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
  closeBtn: { padding: '10px 28px', fontSize: '0.9rem', fontWeight: 700, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
}
