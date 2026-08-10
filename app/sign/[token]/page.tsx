'use client'
import { useState, useEffect, use, useRef } from 'react'
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad'

type Contract = {
  id: string
  title: string
  plan: string
  monthly_rate: number
  hourly_rate: number
  start_date: string
  status: string
  content: string
  signed_at: string | null
  signed_by: string | null
  clients: { name: string; email: string; company?: string } | null
}

function planLabel(p: string) {
  return { starter: 'Starter', growth: 'Growth', premium: 'Premium', business: 'Business' }[p] ?? p
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedName, setSignedName] = useState('')
  const [initials, setInitials] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw')
  const [padEmpty, setPadEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle>(null)

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setContract(d)
      })
      .catch(() => setError('Failed to load contract.'))
      .finally(() => setLoading(false))
  }, [token])

  function getTypedSignatureDataURL(text: string, font: string, width = 480, height = 120): string {
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
    ctx.font = `${Math.min(52, Math.floor(width / (text.length * 0.55 + 1)))}px ${font}`
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 16, height / 2)
    return canvas.toDataURL('image/png')
  }

  async function sign() {
    if (!signedName.trim() || !initials.trim() || !agreed) return
    if (sigMode === 'draw' && padEmpty) return
    setSigning(true)

    let signature_data: string | null = null
    if (sigMode === 'draw') {
      signature_data = padRef.current?.toDataURL() ?? null
    } else {
      signature_data = getTypedSignatureDataURL(signedName, '"Dancing Script", "Brush Script MT", cursive')
    }

    const res = await fetch(`/api/sign/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signed_by: signedName, signature_data }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSigning(false); return }
    // Redirect to deposit checkout
    window.location.href = `/checkout/${token}`
  }

  const canSign = signedName.trim() && initials.trim() && agreed && (sigMode === 'type' || !padEmpty)

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    </div>
  )

  if (error) return (
    <div style={styles.page}>
      <div style={styles.center}>
        <div style={styles.card}>
          <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: 8 }}>Unable to load contract</p>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>{error}</p>
        </div>
      </div>
    </div>
  )

  if (!contract) return null

  const alreadySigned = contract.status === 'signed' || done

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.logo}>PurePulse</span>
        <span style={styles.headerTag}>Web Services Agreement</span>
      </div>

      <div style={styles.wrap}>
        {/* Meta */}
        <div style={styles.metaGrid}>
          <div>
            <p style={styles.metaLabel}>Client</p>
            <p style={styles.metaVal}>{contract.clients?.name}</p>
          </div>
          <div>
            <p style={styles.metaLabel}>Plan</p>
            <p style={styles.metaVal}>{planLabel(contract.plan)} — ${Number(contract.monthly_rate).toFixed(2)}/mo</p>
          </div>
          <div>
            <p style={styles.metaLabel}>Hourly Rate</p>
            <p style={styles.metaVal}>${Number(contract.hourly_rate).toFixed(2)}/hr</p>
          </div>
          <div>
            <p style={styles.metaLabel}>Start Date</p>
            <p style={styles.metaVal}>{fmt(contract.start_date)}</p>
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Contract body */}
        <div style={styles.body}>
          <pre style={styles.pre}>{contract.content}</pre>
        </div>

        <hr style={styles.divider} />

        {/* Signature section */}
        {alreadySigned ? (
          <div style={styles.signedBanner}>
            <span style={styles.checkmark}>✓</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.125rem', margin: '0 0 4px' }}>
                {done ? 'Contract signed successfully' : 'This contract has already been signed'}
              </p>
              <p style={{ color: '#374151', margin: 0, fontSize: '0.9rem' }}>
                Signed by <strong>{contract.signed_by ?? signedName}</strong>
                {contract.signed_at && <> on {fmt(contract.signed_at)}</>}
              </p>
            </div>
          </div>
        ) : (
          <div style={styles.signBox}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.125rem', fontWeight: 700 }}>Sign this agreement</h3>
            <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 24px', lineHeight: 1.6 }}>
              Enter your full legal name, provide your initials, then draw or type your signature.
            </p>

            {/* Name + initials row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
              <div>
                <label style={styles.label}>Full legal name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={signedName}
                  onChange={e => setSignedName(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Initials</label>
                <input
                  type="text"
                  placeholder="JS"
                  maxLength={5}
                  value={initials}
                  onChange={e => setInitials(e.target.value.toUpperCase())}
                  style={{ ...styles.input, width: 72, textAlign: 'center', letterSpacing: '0.1em', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Signature mode toggle */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: '1.5px solid #d1d5db', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
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
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {mode === 'draw' ? '✍ Draw' : 'Aa Type'}
                </button>
              ))}
            </div>

            {/* Draw pad */}
            {sigMode === 'draw' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={styles.label}>Draw your signature</label>
                  <button
                    type="button"
                    onClick={() => { padRef.current?.clear(); setPadEmpty(true) }}
                    style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    Clear
                  </button>
                </div>
                <SignaturePad
                  ref={padRef}
                  height={160}
                  onBegin={() => setPadEmpty(false)}
                />
                {padEmpty && (
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '6px 0 0', textAlign: 'center' }}>
                    Sign above using your mouse or finger
                  </p>
                )}
              </div>
            )}

            {/* Typed signature preview */}
            {sigMode === 'type' && (
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Signature preview</label>
                <div style={{
                  background: '#fafafa',
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  padding: '16px 20px',
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {signedName.trim() ? (
                    <span style={{
                      fontFamily: '"Dancing Script", "Brush Script MT", cursive',
                      fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
                      color: '#111',
                      borderBottom: '1.5px solid #374151',
                      paddingBottom: 2,
                      display: 'inline-block',
                    }}>
                      {signedName}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Your name will appear here in signature style</span>
                  )}
                </div>
              </div>
            )}

            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginRight: 8, accentColor: '#111' }}
              />
              I have read and agree to the terms of this Web Services Agreement.
            </label>

            <button
              onClick={sign}
              disabled={!canSign || signing}
              style={{
                ...styles.signBtn,
                opacity: (!canSign || signing) ? 0.45 : 1,
                cursor: (!canSign || signing) ? 'not-allowed' : 'pointer',
              }}
            >
              {signing ? 'Signing…' : 'Sign Contract'}
            </button>

            <p style={styles.legalNote}>
              This electronic signature is legally binding under the ESIGN Act and UETA.
              Your IP address and timestamp will be recorded.
            </p>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        &copy; {new Date().getFullYear()} PurePulse · Web Design &amp; Maintenance · purepulse.one
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#111',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontWeight: 800,
    fontSize: '1.125rem',
    letterSpacing: '-0.03em',
  },
  headerTag: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    fontWeight: 500,
  },
  wrap: {
    maxWidth: 760,
    margin: '40px auto',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '32px',
    maxWidth: 440,
    textAlign: 'center' as const,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e5e7eb',
    borderTopColor: '#111',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
    padding: '24px 28px',
  },
  metaLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    margin: '0 0 4px',
  },
  metaVal: {
    fontWeight: 600,
    fontSize: '0.9375rem',
    margin: 0,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: 0,
  },
  body: {
    padding: '28px',
    maxHeight: '55vh',
    overflowY: 'auto' as const,
    background: '#fafafa',
  },
  pre: {
    whiteSpace: 'pre-wrap' as const,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    lineHeight: 1.8,
    color: '#111',
    margin: 0,
  },
  signBox: {
    padding: '28px',
  },
  signedBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    padding: '28px',
    background: '#f0fdf4',
    borderTop: '1px solid #bbf7d0',
  },
  checkmark: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#22c55e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.125rem',
    flexShrink: 0,
    lineHeight: '36px',
    textAlign: 'center' as const,
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    fontSize: '1rem',
    border: '1.5px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    marginBottom: 16,
    transition: 'border-color 0.15s',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0,
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: 1.5,
    marginBottom: 24,
    cursor: 'pointer',
  },
  signBtn: {
    display: 'block',
    width: '100%',
    padding: '14px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '1rem',
    fontFamily: 'inherit',
    marginBottom: 16,
    transition: 'opacity 0.15s',
  },
  legalNote: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    lineHeight: 1.6,
    margin: 0,
    textAlign: 'center' as const,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '32px 24px',
    color: '#9ca3af',
    fontSize: '0.8rem',
  },
}
