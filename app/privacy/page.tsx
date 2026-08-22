import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ backgroundColor: '#0B0F19', color: '#F9FAFB', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#111827', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ color: '#8B5CF6', fontSize: '28px', marginBottom: '8px' }}>PurePulse Partner Hub - Privacy Policy</h1>
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '24px' }}>Last Updated: August 21, 2026</p>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>1. Information We Collect</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            PurePulse (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects information to provide affiliate partner services, referral tracking, instant payout processing, and team communication. This includes your name, email address, OAuth profile information (Google and Apple Sign-In), referral link stats, and payment details processed securely through Stripe Connect.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>2. How We Use Information</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            We use collected data to authenticate your partner account, calculate monthly recurring commissions, facilitate live coaching huddles, send payout receipts via Resend, and allow instant cashouts via Stripe Express.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>3. Data Sharing & Third-Party Services</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            We do not sell your personal data. Data is shared strictly with essential service providers:
          </p>
          <ul style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px' }}>
            <li><strong>Supabase</strong>: Database hosting, authentication, and realtime messaging.</li>
            <li><strong>Stripe Connect</strong>: Financial verification and affiliate commission payouts.</li>
            <li><strong>Google & Apple OAuth</strong>: Secure single sign-on authentication.</li>
            <li><strong>Jitsi Meet</strong>: Low-latency live video/audio coaching huddles.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>4. Data Protection & Security</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            All traffic is encrypted via 256-bit TLS/SSL protocols. Financial credentials and banking details are submitted directly to Stripe and never stored on PurePulse servers.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFF' }}>5. Contact Us</h2>
          <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: '1.6' }}>
            If you have questions regarding this Privacy Policy, please contact us at <a href="mailto:support@purepulse.one" style={{ color: '#8B5CF6' }}>support@purepulse.one</a> or visit <a href="https://purepulse.one" style={{ color: '#8B5CF6' }}>https://purepulse.one</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
