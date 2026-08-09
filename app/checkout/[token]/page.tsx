'use client'
import { useState, useEffect, use } from 'react'

type ContractSummary = {
  id: string
  plan: string
  monthly_rate: number
  status: string
  payment_status: string
  clients: { name: string; email: string } | null
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  premium: 'Premium',
  business: 'Business',
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  starter: 'Secure hosting, uptime monitoring, 2 content updates/mo, bug fixes & email support',
  growth: 'Everything in Starter + unlimited updates, priority support (24h), SEO & analytics',
  premium: 'Everything in Growth + custom dev, advanced SEO, phone/video support, quarterly refresh',
  business: 'Everything in Premium + monthly planning call & 2 hrs custom work/mo',
}

export default function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [contract, setContract] = useState<ContractSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setContract(d)
      })
      .catch(() => setError('Failed to load contract details.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCheckout() {
    setRedirecting(true)
    try {
      const res = await fetch(`/api/checkout/${token}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) { setError(data.error); setRedirecting(false); return }
      window.location.href = data.url
    } catch {
      setError('Failed to start checkout. Please try again.')
      setRedirecting(false)
    }
  }

  if (loading) return (
    <div style={s.page}><div style={s.center}><div style={s.spinner} /></div></div>
  )

  if (error) return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={s.card}>
          <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: 8 }}>Something went wrong</p>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>{error}</p>
        </div>
      </div>
    </div>
  )

  if (!contract) return null

  if (contract.payment_status === 'paid') return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={s.checkCircle}>✓</div>
          <h2 style={{ margin: '16px 0 8px', fontWeight: 700 }}>Already paid</h2>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>This contract has already been paid. Check your email for a confirmation receipt.</p>
        </div>
      </div>
    </div>
  )

  const plan = contract.plan
  const planLabel = PLAN_LABELS[plan] ?? plan
  const monthly = Number(contract.monthly_rate)
  const firstInvoice = 150 + monthly

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.logo}>PurePulse</span>
        <span style={s.headerTag}>Secure Checkout</span>
      </div>

      <div style={s.wrap}>
        <div style={s.topBanner}>
          <span style={s.checkCircleSmall}>✓</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>Contract signed</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#374151' }}>One more step — complete your deposit to kick off the project.</p>
          </div>
        </div>

        <div style={s.body}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.375rem', fontWeight: 800 }}>Complete your deposit</h2>
          <p style={{ color: '#555', margin: '0 0 32px', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            You&apos;re signed up for the <strong>{planLabel}</strong> plan. Pay your deposit to secure your spot and start the project.
          </p>

          {/* Plan summary */}
          <div style={s.planCard}>
            <div style={s.planHeader}>
              <span style={s.planBadge}>{planLabel}</span>
              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>12-month agreement</span>
            </div>
            <p style={{ margin: '8px 0 12px', fontSize: '0.875rem', color: '#555', lineHeight: 1.6 }}>
              {PLAN_DESCRIPTIONS[plan]}
            </p>
          </div>

          {/* Invoice breakdown */}
          <div style={s.invoiceBox}>
            <p style={s.invoiceTitle}>Today&apos;s payment</p>
            <div style={s.lineItem}>
              <span>One-time project deposit</span>
              <span>$150.00</span>
            </div>
            <div style={s.lineItem}>
              <span>{planLabel} plan — Month 1</span>
              <span>${monthly.toFixed(2)}</span>
            </div>
            <div style={s.divider} />
            <div style={{ ...s.lineItem, fontWeight: 700, fontSize: '1.0625rem' }}>
              <span>Total due today</span>
              <span>${firstInvoice.toFixed(2)}</span>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
              Then ${monthly.toFixed(2)}/mo starting next month. Cancel anytime with 30-day notice.
            </p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={redirecting}
            style={{
              ...s.btn,
              opacity: redirecting ? 0.6 : 1,
              cursor: redirecting ? 'not-allowed' : 'pointer',
            }}
          >
            {redirecting ? 'Redirecting to Stripe…' : `Pay $${firstInvoice.toFixed(2)} → Secure checkout`}
          </button>

          <p style={s.secureNote}>
            🔒 Payments processed securely by Stripe. PurePulse never stores your card details.
          </p>
        </div>
      </div>

      <div style={s.footer}>
        © {new Date().getFullYear()} PurePulse · Web Design &amp; Maintenance · purepulse.one
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em' },
  headerTag: { fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 },
  wrap: { maxWidth: 520, margin: '40px auto', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' },
  topBanner: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' },
  checkCircle: { width: 48, height: 48, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', flexShrink: 0, lineHeight: '48px', textAlign: 'center', margin: '0 auto 16px' },
  checkCircleSmall: { width: 28, height: 28, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, lineHeight: '28px', textAlign: 'center' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '32px', maxWidth: 440 },
  spinner: { width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  body: { padding: '28px' },
  planCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20 },
  planHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  planBadge: { fontWeight: 700, fontSize: '0.9375rem' },
  invoiceBox: { background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 24 },
  invoiceTitle: { margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' },
  lineItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', marginBottom: 8 },
  divider: { borderTop: '1px solid #e5e7eb', margin: '12px 0' },
  btn: { display: 'block', width: '100%', padding: '15px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', marginBottom: 16, transition: 'opacity 0.15s', boxSizing: 'border-box' },
  secureNote: { fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', margin: 0, lineHeight: 1.6 },
  footer: { textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem' },
}
