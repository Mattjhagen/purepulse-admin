import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div style={{ backgroundColor: '#0B0F19', color: '#F9FAFB', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#111827', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ color: '#8B5CF6', fontSize: '28px', marginBottom: '8px' }}>PurePulse Partner Hub - Terms of Service</h1>
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '24px' }}>Last Updated: August 21, 2026</p>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>1. Acceptance of Terms</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            By registering as a partner or accessing the PurePulse Partner Hub (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>2. Affiliate Referral Program & Commissions</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            Partners earn recurring commissions on active paying client subscriptions referred through their unique referral link or partner code. Commissions are calculated based on partner tier levels (Bronze, Silver, Gold, Platinum, PurePulse Black Card).
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>3. Payouts & Stripe Connect</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            Payouts are processed via Stripe Connect Express. Partners are responsible for providing valid payout credentials and complying with applicable tax requirements. Instant cashout fees or minimum threshold rules may apply.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>4. Code of Conduct & Community Huddles</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            Partners participating in live Jitsi huddles, group channels, or forums must maintain professional conduct. Spamming, misleading advertising, or harassment will result in immediate termination of partner access.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>5. Contact Information</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            For support or questions regarding these Terms, contact <a href="mailto:support@purepulse.one" style={{ color: '#8B5CF6' }}>support@purepulse.one</a> or visit <a href="https://login.purepulse.one" style={{ color: '#8B5CF6' }}>https://login.purepulse.one</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
