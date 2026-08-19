'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad'
import { AFFILIATE_TERMS } from '@/lib/affiliate-utils'

type Step = 1 | 2 | 3

function getTypedSignatureDataURL(text: string, width = 480, height = 120): string {
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#111111'
  ctx.font = `${Math.min(52, Math.floor(width / (text.length * 0.55 + 1)))}px "Dancing Script", "Brush Script MT", cursive`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 16, height / 2)
  return canvas.toDataURL('image/png')
}

export default function ApplyPage() {
  const [step, setStep] = useState<Step>(1)

  // Step 1 fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [step1Error, setStep1Error] = useState('')

  // Step 2 fields
  const [signedBy, setSignedBy] = useState('')
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw')
  const [padEmpty, setPadEmpty] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const padRef = useRef<SignaturePadHandle>(null)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [resultEmail, setResultEmail] = useState('')
  const [actionLink, setActionLink] = useState('')

  function validateStep1() {
    if (!name.trim()) { setStep1Error('Please enter your name.'); return false }
    if (!email.trim() || !email.includes('@')) { setStep1Error('Please enter a valid email.'); return false }
    setStep1Error('')
    return true
  }

  function goToStep2() {
    if (!validateStep1()) return
    setSignedBy(name)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canSign = signedBy.trim() && agreed && (sigMode === 'type' ? true : !padEmpty)

  async function submitApplication() {
    if (!canSign) return
    setSubmitting(true)
    setSubmitError('')

    let signatureData: string
    if (sigMode === 'draw') {
      signatureData = padRef.current?.toDataURL() ?? ''
      if (!signatureData) { setSubmitError('Please draw your signature.'); setSubmitting(false); return }
    } else {
      signatureData = getTypedSignatureDataURL(signedBy)
    }

    try {
      const res = await fetch('/api/affiliates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          signed_by: signedBy.trim(),
          signature_data: signatureData,
        }),
      })
      const data = await res.json()
      if (data.error) { setSubmitError(data.error); setSubmitting(false); return }
      setReferralCode(data.referral_code)
      setResultEmail(data.email)
      if (data.action_link) {
        setActionLink(data.action_link)
      }
      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const referralUrl = referralCode ? `https://purepulse.one/pricing?ref=${referralCode}` : ''

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/affiliates" style={s.logo}>
          Pure<span style={{ color: '#7B2FFF' }}>Pulse</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={s.headerTag}>Affiliate Program</span>
          <Link href="/affiliates/login" style={{ fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </header>

      {/* Progress */}
      {step < 3 && (
        <div style={s.progress}>
          {(['1', '2'] as const).map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <div style={{ ...s.progressLine, background: step > 1 ? '#111' : '#e5e7eb' }} />}
              <div style={{
                ...s.progressDot,
                background: step >= Number(n) ? '#111' : '#e5e7eb',
                color: step >= Number(n) ? '#fff' : '#9ca3af',
              }}>
                {n}
              </div>
              <span style={{ ...s.progressLabel, color: step >= Number(n) ? '#111' : '#9ca3af' }}>
                {n === '1' ? 'Your Information' : 'Sign Agreement'}
              </span>
            </div>
          ))}
        </div>
      )}

      <main style={s.main}>
        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div style={s.card}>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7B2FFF' }}>
                Partner Onboarding
              </span>
              <h1 style={s.h1}>Apply to become a PurePulse Affiliate</h1>
              <p style={s.sub}>
                Earn up to $50/mo recurring commission on every active client you refer, plus free business plan perks.
              </p>
            </div>

            <div style={s.form}>
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
                  <label style={s.label}>Email address *</label>
                  <input
                    style={s.input}
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Phone number</label>
                <input
                  style={s.input}
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>How do you plan to promote PurePulse?</label>
                <textarea
                  style={{ ...s.input, minHeight: 90, resize: 'vertical' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Local business networking, flyers in co-working spaces, LinkedIn/social media, agency client referrals, etc."
                />
              </div>

              {step1Error && <p style={s.errorMsg}>{step1Error}</p>}

              <button onClick={goToStep2} style={s.btn}>
                Continue to Agreement →
              </button>

              <p style={s.fine}>
                No fee or credit card required. Free to join. You&apos;ll sign the affiliate agreement on the next step.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Terms + Signature ── */}
        {step === 2 && (
          <div style={s.card}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7B2FFF' }}>
                Agreement
              </span>
              <h1 style={s.h1}>Affiliate Program Agreement</h1>
              <p style={s.sub}>
                Review the terms below, sign electronically, and your portal will be activated immediately.
              </p>
            </div>

            {/* Terms scroll box */}
            <div style={s.termsBox}>
              <pre style={s.termsPre}>{AFFILIATE_TERMS}</pre>
            </div>

            {/* Signature area */}
            <div style={{ marginTop: 24 }}>
              <div style={s.field}>
                <label style={s.label}>Full legal name</label>
                <input
                  style={s.input}
                  value={signedBy}
                  onChange={e => setSignedBy(e.target.value)}
                  placeholder="Your full legal name"
                />
              </div>

              {/* Sig mode toggle */}
              <div style={{ display: 'flex', gap: 0, margin: '14px 0 10px', border: '1.5px solid #d1d5db', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
                {(['draw', 'type'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setSigMode(mode); setPadEmpty(true); padRef.current?.clear() }}
                    style={{
                      padding: '7px 18px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: sigMode === mode ? '#111' : '#fff',
                      color: sigMode === mode ? '#fff' : '#374151',
                    }}
                  >
                    {mode === 'draw' ? '✍ Draw Signature' : 'Aa Type Signature'}
                  </button>
                ))}
              </div>

              {sigMode === 'draw' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={s.label}>Draw your signature below</label>
                    <button
                      type="button"
                      onClick={() => { padRef.current?.clear(); setPadEmpty(false) }}
                      style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                  <SignaturePad ref={padRef} height={150} onBegin={() => setPadEmpty(false)} />
                  {padEmpty && (
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '6px 0 0', textAlign: 'center' }}>
                      Sign above using your finger or mouse
                    </p>
                  )}
                </div>
              )}

              {sigMode === 'type' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={s.label}>Signature preview</label>
                  <div style={{ background: '#fafafa', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '16px 20px', minHeight: 70, display: 'flex', alignItems: 'center' }}>
                    {signedBy.trim() ? (
                      <span style={{ fontFamily: '"Dancing Script","Brush Script MT",cursive', fontSize: 'clamp(1.5rem,5vw,2.25rem)', color: '#111', borderBottom: '1.5px solid #374151', paddingBottom: 2 }}>
                        {signedBy}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Type your legal name above to generate signature</span>
                    )}
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem', color: '#374151', lineHeight: 1.5, marginBottom: 20, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  style={{ marginTop: 3, accentColor: '#7B2FFF', width: 16, height: 16, flexShrink: 0 }}
                />
                <span>
                  I have read and agree to the PurePulse Affiliate Program Agreement, including recurring commission terms, performance bonuses, and conduct standards.
                </span>
              </label>

              {submitError && <p style={{ ...s.errorMsg, marginBottom: 16 }}>{submitError}</p>}

              <button
                onClick={submitApplication}
                disabled={!canSign || submitting}
                style={{ ...s.btn, background: '#7B2FFF', opacity: (!canSign || submitting) ? 0.45 : 1, cursor: (!canSign || submitting) ? 'not-allowed' : 'pointer', marginBottom: 12 }}
              >
                {submitting ? 'Creating your affiliate portal…' : 'Sign Terms & Open Affiliate Portal →'}
              </button>

              <button
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{ ...s.btn, background: '#f3f4f6', color: '#111' }}
              >
                ← Back to info
              </button>

              <p style={{ ...s.fine, marginTop: 16 }}>
                Electronic signature legally binding under ESIGN Act &amp; UETA. Timestamp and IP logged.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success & Portal Entry ── */}
        {step === 3 && (
          <div style={s.card}>
            <div style={s.successIcon}>✓</div>
            <h1 style={{ ...s.h1, textAlign: 'center', marginBottom: 6 }}>You&apos;re officially a partner! 🎉</h1>
            <p style={{ ...s.sub, textAlign: 'center', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
              Your affiliate portal is active. We sent a backup login link to <strong>{resultEmail}</strong>. You can enter your portal right now below.
            </p>

            {/* Referral code & Link box */}
            <div style={s.codeBox}>
              <p style={s.codeLabel}>Your Unique Partner Code</p>
              <p style={s.code}>{referralCode}</p>
              
              <p style={{ ...s.codeLabel, marginTop: 16 }}>Your Referral Link</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <code style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 8, fontSize: '0.875rem', color: '#7B2FFF', wordBreak: 'break-all' }}>
                  {referralUrl}
                </code>
                <CopyButton text={referralUrl} label="Copy Link" />
              </div>
            </div>

            {/* Direct Portal CTA */}
            <div style={{ background: 'linear-gradient(135deg, rgba(123,47,255,0.08), rgba(0,212,255,0.06))', border: '1.5px solid #e0d4fc', borderRadius: 12, padding: '24px 20px', marginBottom: 24, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.125rem', fontWeight: 800, color: '#111' }}>
                Ready to explore your partner tools?
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#555', lineHeight: 1.5 }}>
                Inside your portal: download high-res printable flyers, generate social media graphics and campaigns, track commissions live, and link your bank account.
              </p>
              <a
                href={actionLink || '/affiliates/dashboard'}
                style={{
                  display: 'inline-block',
                  background: '#111',
                  color: '#fff',
                  padding: '14px 32px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                Enter Affiliate Portal Now →
              </a>
            </div>

            {/* QR code */}
            <div style={s.qrWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr?data=${encodeURIComponent(referralUrl)}&size=360`}
                alt="Referral QR code"
                width={160}
                height={160}
                style={{ display: 'block', margin: '0 auto', borderRadius: 10, border: '1px solid #e5e7eb' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 8 }}>
                Scan with your phone to preview your partner landing page
              </p>
            </div>

            <div style={s.nextSteps}>
              <p style={s.nextStepsLabel}>What&apos;s available in your portal:</p>
              <ul style={s.nextStepsList}>
                <li><strong>Printable Assets:</strong> Full-page flyers, business cards, tear-off tab posters &amp; vector QR codes</li>
                <li><strong>Social Media Studio:</strong> 1:1, 9:16, 16:9 graphic generator &amp; pre-written high-converting copy</li>
                <li><strong>Commission Tracking:</strong> Live breakdown of active clients, MRR earnings, and payout dates</li>
                <li><strong>Bank &amp; Payouts:</strong> Direct deposit setup via Stripe Connect for automatic monthly deposits</li>
              </ul>
            </div>

            <a
              href={actionLink || '/affiliates/dashboard'}
              style={{ ...s.btn, background: '#7B2FFF', marginTop: 8 }}
            >
              Open Affiliate Portal →
            </a>
          </div>
        )}
      </main>

      <footer style={s.footer}>
        © {new Date().getFullYear()} PurePulse · <Link href="/affiliates" style={{ color: '#9ca3af' }}>Affiliate Program</Link> · <a href="https://purepulse.one" style={{ color: '#9ca3af' }}>purepulse.one</a>
      </footer>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: '8px 16px',
        background: copied ? '#22c55e' : '#111',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontWeight: 600,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.2s',
      }}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  headerTag: { fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 },
  progress: { display: 'flex', alignItems: 'center', gap: 0, padding: '16px 24px', background: '#fff', borderBottom: '1px solid #f3f4f6', justifyContent: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 },
  progressLine: { width: 48, height: 2, flexShrink: 0 },
  progressLabel: { fontSize: '0.8125rem', fontWeight: 600 },
  main: { maxWidth: 680, margin: '40px auto', padding: '0 24px 80px' },
  card: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '36px 32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  h1: { fontSize: 'clamp(1.4rem, 4vw, 1.875rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' },
  sub: { fontSize: '0.9375rem', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' },
  input: { padding: '11px 13px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', width: '100%' },
  errorMsg: { color: '#b91c1c', fontSize: '0.875rem', margin: 0 },
  btn: { display: 'block', width: '100%', padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' },
  fine: { fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', margin: 0, lineHeight: 1.6 },
  termsBox: { background: '#fafafa', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', maxHeight: '38vh', overflowY: 'auto' },
  termsPre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.8, color: '#374151', margin: 0 },
  successIcon: { width: 56, height: 56, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', margin: '0 auto 16px', lineHeight: '56px', textAlign: 'center' },
  codeBox: { background: '#f8f8f8', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 20, textAlign: 'center' },
  codeLabel: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: '0 0 6px' },
  code: { fontSize: '2.25rem', fontWeight: 800, letterSpacing: '0.1em', color: '#111', margin: 0, fontFamily: 'monospace' },
  qrWrap: { textAlign: 'center', marginBottom: 20 },
  nextSteps: { background: '#f9f9f9', borderRadius: 10, padding: '16px 20px', marginBottom: 20 },
  nextStepsLabel: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', margin: '0 0 8px' },
  nextStepsList: { margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: '0.875rem', lineHeight: 1.8 },
  footer: { textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb' },
}
