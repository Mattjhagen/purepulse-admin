'use client'
import { useState, useEffect, use } from 'react'

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
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)

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

  async function sign() {
    if (!signedName.trim() || !agreed) return
    setSigning(true)
    const res = await fetch(`/api/sign/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signed_by: signedName }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSigning(false); return }
    setDone(true)
  }

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
              By typing your full legal name below and clicking "Sign Contract", you agree to the terms of this
              Web Services Agreement and confirm that you are authorised to enter into this agreement.
            </p>

            <label style={styles.label}>Full legal name</label>
            <input
              type="text"
              placeholder="e.g. Jane Smith"
              value={signedName}
              onChange={e => setSignedName(e.target.value)}
              style={styles.input}
            />

            {/* Signature preview */}
            {signedName.trim() && (
              <div style={styles.sigPreview}>
                <p style={styles.sigPreviewLabel}>Your signature will appear as:</p>
                <p style={styles.sigScript}>{signedName}</p>
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
              disabled={!signedName.trim() || !agreed || signing}
              style={{
                ...styles.signBtn,
                opacity: (!signedName.trim() || !agreed || signing) ? 0.45 : 1,
                cursor: (!signedName.trim() || !agreed || signing) ? 'not-allowed' : 'pointer',
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
  sigPreview: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 20,
  },
  sigPreviewLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: '0 0 6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  sigScript: {
    fontFamily: '"Dancing Script", "Brush Script MT", cursive',
    fontSize: '1.75rem',
    color: '#111',
    margin: 0,
    borderBottom: '1.5px solid #374151',
    paddingBottom: 4,
    display: 'inline-block',
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
