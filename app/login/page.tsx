'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
          if (!error && data.session) {
            const role = data.session.user.user_metadata?.role
            if (role === 'affiliate') {
              window.location.href = '/affiliates/dashboard'
              return
            }
            const { data: aff } = await supabase
              .from('affiliates')
              .select('id')
              .or(`auth_user_id.eq.${data.session.user.id},email.eq.${data.session.user.email?.toLowerCase().trim()}`)
              .single()
            if (aff) {
              window.location.href = '/affiliates/dashboard'
              return
            }
            window.location.href = '/portal'
          }
        })
      }
    }
  }, [supabase])


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await signIn(email.toLowerCase().trim(), password)
      const user = data.user
      const userRole = user?.user_metadata?.role

      if (userRole === 'affiliate') {
        router.push('/affiliates/dashboard')
        return
      }

      // Check team members table
      const { data: member } = await supabase
        .from('team_members')
        .select('role, status')
        .or(`auth_user_id.eq.${user?.id},email.eq.${email.toLowerCase().trim()}`)
        .maybeSingle()

      if (member) {
        router.push('/dashboard')
        return
      }

      // Check affiliates table
      const { data: aff } = await supabase
        .from('affiliates')
        .select('id')
        .or(`auth_user_id.eq.${user?.id},email.eq.${email.toLowerCase().trim()}`)
        .maybeSingle()

      if (aff) {
        router.push('/affiliates/dashboard')
        return
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <a href="https://purepulse.one" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text)' }}>
              PurePulse
            </span>
          </a>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Admin Portal</p>
        </div>
        <div className="card-elevated" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.375rem' }}>
            Sign in
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Access your admin dashboard
          </p>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: 'var(--accent-red)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@purepulse.one"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
            >
              {loading ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Customer?{' '}
          <a href="/portal" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
            Access the client portal
          </a>
        </p>
      </div>
    </div>
  )
}
