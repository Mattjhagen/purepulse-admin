import Link from 'next/link'

const COMMISSION_TIERS = [
  { plan: 'Starter', price: 20, rate: 10, monthly: 2.00 },
  { plan: 'Growth', price: 50, rate: 40, monthly: 20.00 },
  { plan: 'Premium', price: 75, rate: 45, monthly: 33.75 },
  { plan: 'Business', price: 100, rate: 50, monthly: 50.00 },
]

const HOW_IT_WORKS = [
  { n: '1', title: 'Apply & sign', body: 'Fill out a quick application and sign the affiliate agreement. Instant approval.' },
  { n: '2', title: 'Get your link', body: 'Receive a unique referral link and QR code to share with your network.' },
  { n: '3', title: 'Earn monthly', body: 'Every client who signs up through your link pays you a recurring commission — forever.' },
]

export default function AffiliatesPage() {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <a href="https://purepulse.one" style={s.logo}>PurePulse</a>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link href="/affiliates/login" style={s.navLink}>Affiliate Login</Link>
          <Link href="/affiliates/apply" style={s.applyBtn}>Apply Now →</Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section style={s.hero}>
          <p style={s.eyebrow}>Affiliate Program</p>
          <h1 style={s.h1}>Earn up to $50/mo per<br />client you refer.</h1>
          <p style={s.subhead}>
            Share your unique link. When someone signs up for PurePulse through it,
            you earn a recurring monthly commission as long as they&apos;re a client.
          </p>
          <Link href="/affiliates/apply" style={s.heroCta}>Get Started — It&apos;s Free</Link>
          <p style={s.heroFine}>No cost to join · Instant approval · Cancel anytime</p>
        </section>

        {/* Commission table */}
        <section style={s.section}>
          <div style={s.sectionInner}>
            <p style={s.sectionEyebrow}>Commissions</p>
            <h2 style={s.sectionH2}>What you&apos;ll earn</h2>
            <p style={s.sectionSub}>Paid monthly for every active client you refer, indefinitely.</p>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Plan</th>
                    <th style={s.th}>Client pays</th>
                    <th style={s.th}>Your rate</th>
                    <th style={{ ...s.th, color: '#111' }}>You earn</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMISSION_TIERS.map(t => (
                    <tr key={t.plan} style={s.tr}>
                      <td style={s.td}>{t.plan}</td>
                      <td style={s.td}>${t.price}/mo</td>
                      <td style={s.td}>{t.rate}%</td>
                      <td style={{ ...s.td, fontWeight: 800, color: '#111', fontSize: '1.0625rem' }}>${t.monthly.toFixed(2)}/mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={s.tableFine}>
              Commissions begin after the client&apos;s first full active month and continue every month they remain subscribed.
            </p>
          </div>
        </section>

        {/* Bonus */}
        <section style={s.bonusSection}>
          <div style={s.sectionInner}>
            <div style={s.bonusCard}>
              <div style={s.bonusBadge}>Performance Bonus</div>
              <h2 style={s.bonusH2}>1 sale/month = free Business plan</h2>
              <p style={s.bonusBody}>
                Refer at least <strong>one new client per calendar month</strong> and we&apos;ll give you
                complimentary access to the{' '}
                <strong>vibecodes.space Business Plan</strong> — a <strong>$49/month value</strong> — for your own business.
              </p>
              <ul style={s.bonusList}>
                <li style={s.bonusItem}>✓ Unlimited sites</li>
                <li style={s.bonusItem}>✓ White-labeling</li>
                <li style={s.bonusItem}>✓ Team collaboration</li>
                <li style={s.bonusItem}>✓ Priority support</li>
              </ul>
              <p style={s.bonusFine}>Resets monthly — keep referring, keep the plan.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={s.section}>
          <div style={s.sectionInner}>
            <p style={s.sectionEyebrow}>How it works</p>
            <h2 style={s.sectionH2}>Three steps to start earning</h2>
            <div style={s.stepsGrid}>
              {HOW_IT_WORKS.map(step => (
                <div key={step.n} style={s.stepCard}>
                  <div style={s.stepNum}>{step.n}</div>
                  <h3 style={s.stepTitle}>{step.title}</h3>
                  <p style={s.stepBody}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={s.ctaSection}>
          <div style={s.sectionInner}>
            <h2 style={s.ctaH2}>Ready to start earning?</h2>
            <p style={s.ctaBody}>Apply in under 2 minutes. Sign the affiliate agreement and get your link immediately.</p>
            <Link href="/affiliates/apply" style={s.ctaBtn}>Apply for the Affiliate Program →</Link>
            <p style={s.ctaFine}>Already applied? <Link href="/affiliates/login" style={{ color: '#7B2FFF' }}>Log in to your dashboard</Link></p>
          </div>
        </section>
      </main>

      <footer style={s.footer}>
        © {new Date().getFullYear()} PurePulse · Web Design &amp; Maintenance ·{' '}
        <a href="https://purepulse.one" style={{ color: '#9ca3af', textDecoration: 'underline' }}>purepulse.one</a>
        {' · '}
        <Link href="/pricing" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Pricing</Link>
      </footer>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  navLink: { fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' },
  applyBtn: { fontSize: '0.875rem', fontWeight: 700, color: '#fff', background: '#111', padding: '8px 18px', borderRadius: 8, textDecoration: 'none' },
  hero: { textAlign: 'center', padding: '80px 24px 72px', maxWidth: 700, margin: '0 auto' },
  eyebrow: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9ca3af', margin: '0 0 16px' },
  h1: { fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 20px' },
  subhead: { fontSize: '1.0625rem', color: '#555', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 32px' },
  heroCta: { display: 'inline-block', background: '#111', color: '#fff', padding: '16px 36px', borderRadius: 10, fontWeight: 700, fontSize: '1.0625rem', textDecoration: 'none', marginBottom: 12 },
  heroFine: { fontSize: '0.8125rem', color: '#9ca3af', margin: 0 },
  section: { padding: '72px 24px' },
  bonusSection: { padding: '0 24px 72px' },
  sectionInner: { maxWidth: 820, margin: '0 auto' },
  sectionEyebrow: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 12px', textAlign: 'center' },
  sectionH2: { fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', textAlign: 'center' },
  sectionSub: { fontSize: '1rem', color: '#6b7280', textAlign: 'center', margin: '0 0 40px', lineHeight: 1.6 },
  tableWrap: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', background: '#fafafa', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '16px 20px', fontSize: '0.9375rem', color: '#374151' },
  tableFine: { fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', marginTop: 16, lineHeight: 1.5 },
  bonusCard: { background: '#111', borderRadius: 16, padding: '40px 40px', color: '#fff', position: 'relative', overflow: 'hidden' },
  bonusBadge: { display: 'inline-block', background: '#f59e0b', color: '#000', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 999, marginBottom: 16 },
  bonusH2: { fontSize: 'clamp(1.375rem, 3.5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff' },
  bonusBody: { fontSize: '1rem', color: '#d1d5db', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 560 },
  bonusList: { listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexWrap: 'wrap', gap: '10px 28px' },
  bonusItem: { fontSize: '0.9375rem', color: '#d1fae5', fontWeight: 500 },
  bonusFine: { fontSize: '0.8125rem', color: '#6b7280', margin: 0 },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 },
  stepCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '28px 24px' },
  stepNum: { width: 36, height: 36, borderRadius: '50%', background: '#111', color: '#fff', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepTitle: { fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' },
  stepBody: { fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6, margin: 0 },
  ctaSection: { padding: '72px 24px', background: '#fff', borderTop: '1px solid #e5e7eb', textAlign: 'center' },
  ctaH2: { fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' },
  ctaBody: { fontSize: '1rem', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 },
  ctaBtn: { display: 'inline-block', background: '#111', color: '#fff', padding: '16px 36px', borderRadius: 10, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', marginBottom: 16 },
  ctaFine: { fontSize: '0.875rem', color: '#9ca3af' },
  footer: { textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb' },
}
