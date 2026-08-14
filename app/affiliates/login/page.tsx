'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function AffiliateLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${appUrl}/auth/callback?next=/affiliates/dashboard`,
      },
    })
    setLoading(false)
    if (otpError) {
      setError('No affiliate account found for that email. Please check the address or apply below.')
      return
    }
    setSent(true)
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError('Invalid email or password.')
      return
    }
    router.push('/affiliates/dashboard')
    router.refresh()
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/affiliates" style={s.logo}>PurePulse</Link>
        <span style={s.headerTag}>Affiliate Portal</span>
      </header>

      <main style={s.main}>
        <div style={s.card}>
          {sent ? (
            <div style={s.sentWrap}>
              <div style={s.sentIcon}>✉️</div>
              <h1 style={s.h1}>Check your email</h1>
              <p style={s.sub}>
                We sent a sign-in link to <strong>{email}</strong>.<br />
                Click it to access your dashboard — no password needed.
              </p>
              <button onClick={() => setSent(false)} style={s.ghostBtn}>
                ← Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 style={s.h1}>Affiliate sign in</h1>
              <p style={s.sub}>
                {mode === 'magic'
                  ? 'Enter your email and we\'ll send you a sign-in link.'
                  : 'Sign in with your email and password.'}
              </p>

              {mode === 'magic' ? (
                <form onSubmit={handleMagicLink} style={s.form}>
                  <div style={s.field}>
                    <label style={s.label}>Email address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={s.input}
                    />
                  </div>
                  {error && <p style={s.error}>{error}</p>}
                  <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Sending…' : 'Send sign-in link →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePassword} style={s.form}>
                  <div style={s.field}>
                    <label style={s.label}>Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={s.input}
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password"
                      style={s.input}
                    />
                  </div>
                  {error && <p style={s.error}>{error}</p>}
                  <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              )}

              <div style={s.dividerRow}>
                <span style={s.dividerLine} />
                <span style={s.dividerText}>or</span>
                <span style={s.dividerLine} />
              </div>

              <button
                onClick={() => { setMode(mode === 'magic' ? 'password' : 'magic'); setError('') }}
                style={s.ghostBtn}
              >
                {mode === 'magic' ? 'Sign in with password instead' : 'Send me a sign-in link instead'}
              </button>

              <p style={s.footer}>
                Not an affiliate yet?{' '}
                <Link href="/affiliates/apply" style={{ color: '#7B2FFF', textDecoration: 'none', fontWeight: 600 }}>Apply here →</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  headerTag: { fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 },
  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' },
  card: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 420 },
  h1: { fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' },
  sub: { fontSize: '0.875rem', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#374151' },
  input: { padding: '11px 13px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, width: '100%' },
  error: { fontSize: '0.875rem', color: '#b91c1c', margin: 0 },
  btn: { padding: '13px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { display: 'block', width: '100%', padding: '11px', background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' as const },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 12px' },
  dividerLine: { flex: 1, height: 1, background: '#e5e7eb', display: 'block' },
  dividerText: { fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' as const },
  footer: { fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center' as const, marginTop: 24 },
  sentWrap: { textAlign: 'center' as const },
  sentIcon: { fontSize: '2.5rem', marginBottom: 12 },
}
