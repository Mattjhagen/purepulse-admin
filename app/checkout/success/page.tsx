'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const params = useSearchParams()
  const token = params.get('token')

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.logo}>PurePulse</span>
      </div>

      <div style={s.center}>
        <div style={s.card}>
          <div style={s.checkCircle}>✓</div>
          <h1 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, textAlign: 'center' }}>
            You&apos;re all set!
          </h1>
          <p style={{ color: '#555', lineHeight: 1.7, textAlign: 'center', margin: '0 0 8px', fontSize: '0.9375rem' }}>
            Your deposit payment was received and your project is now confirmed.
          </p>
          <p style={{ color: '#555', lineHeight: 1.7, textAlign: 'center', margin: '0 0 32px', fontSize: '0.9375rem' }}>
            We&apos;ll be in touch within <strong>1 business day</strong> to schedule your kick-off call and gather any remaining content.
          </p>

          <div style={s.infoBox}>
            <p style={s.infoLabel}>What happens next</p>
            <ol style={{ margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 2, fontSize: '0.9rem' }}>
              <li>Look for a confirmation receipt from Stripe in your inbox</li>
              <li>We&apos;ll email you within 1 business day to kick off</li>
              <li>Content collection &amp; discovery call scheduled</li>
              <li>Build begins — delivery in 2–4 weeks</li>
            </ol>
          </div>

          <a
            href="mailto:contact@purepulse.one"
            style={s.emailLink}
          >
            Questions? Email us →
          </a>

          {token && (
            <a
              href={`/sign/${token}`}
              style={s.contractLink}
            >
              View your signed contract
            </a>
          )}
        </div>
      </div>

      <div style={s.footer}>
        © {new Date().getFullYear()} PurePulse · Web Design &amp; Maintenance ·{' '}
        <a href="https://purepulse.one" style={{ color: 'inherit' }}>purepulse.one</a>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 130px)', padding: '40px 16px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '40px 36px', maxWidth: 480, width: '100%' },
  checkCircle: { width: 56, height: 56, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.375rem', margin: '0 auto 24px', lineHeight: '56px', textAlign: 'center' },
  infoBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 24 },
  infoLabel: { margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#9ca3af' },
  emailLink: { display: 'block', textAlign: 'center', fontWeight: 600, color: '#111', fontSize: '0.9375rem', marginBottom: 12, textDecoration: 'none' },
  contractLink: { display: 'block', textAlign: 'center', fontSize: '0.8125rem', color: '#9ca3af', textDecoration: 'underline' },
  footer: { textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '0.8rem' },
}
