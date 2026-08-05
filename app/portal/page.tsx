'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, TicketPriority } from '@/lib/types'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import { Plus, X, LogOut } from 'lucide-react'

export default function CustomerPortalPage() {
  const supabase = createClient()
  const [session, setSession] = useState<{ user: { email?: string; id: string } } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [clientId, setClientId] = useState<string | null>(null)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession({ user: { email: data.session.user.email, id: data.session.user.id } })
    })
  }, [supabase])

  const loadTickets = useCallback(async () => {
    if (!session) return
    setTicketsLoading(true)
    const { data: portalUser } = await supabase.from('portal_users').select('client_id').eq('auth_user_id', session.user.id).single()
    if (portalUser?.client_id) {
      setClientId(portalUser.client_id)
      const { data } = await supabase.from('tickets').select('*').eq('client_id', portalUser.client_id).order('created_at', { ascending: false })
      setTickets(data ?? [])
    }
    setTicketsLoading(false)
  }, [session, supabase])

  useEffect(() => { if (session) loadTickets() }, [session, loadTickets])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthError(''); setAuthLoading(true)
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSession({ user: { email: data.user?.email, id: data.user?.id ?? '' } })
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('portal_users').insert({ auth_user_id: data.user.id, email })
          setSession({ user: { email: data.user.email, id: data.user.id } })
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Auth failed')
    }
    setAuthLoading(false)
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setSubmitting(true)
    await supabase.from('tickets').insert({ client_id: clientId, subject: newSubject, description: newDesc, priority: newPriority, status: 'open' })
    setNewSubject(''); setNewDesc(''); setShowNew(false)
    await loadTickets()
    setSubmitting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null); setTickets([]); setClientId(null)
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <a href="https://purepulse.one" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
            </a>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Client Portal</p>
          </div>
          <div className="card-elevated" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem' }}>
              {(['login', 'signup'] as const).map(m => (
                <button key={m} className="btn btn-ghost" style={{ flex: 1, borderRadius: m === 'login' ? 'var(--radius-full) 0 0 var(--radius-full)' : '0 var(--radius-full) var(--radius-full) 0', background: authMode === m ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  onClick={() => setAuthMode(m)}>{m === 'login' ? 'Sign in' : 'Sign up'}</button>
              ))}
            </div>
            {authError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', color: 'var(--accent-red)', fontSize: '0.875rem' }}>{authError}</div>}
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Email</label>
                <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ width: '100%', justifyContent: 'center' }}>
                {authLoading ? <span className="spinner" /> : authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Admin? <a href="/login" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Admin portal</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.75rem' }}>Client Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{session.user.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}><LogOut size={14} /> Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Support Tickets</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Submit and track your IT support requests.</p>
          </div>
          {clientId && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={16} /> New ticket
            </button>
          )}
        </div>

        {!clientId && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Your account isn&apos;t linked to a client profile yet. Contact <a href="mailto:contact@purepulse.one" style={{ color: 'var(--text)' }}>contact@purepulse.one</a> to get set up.</p>
          </div>
        )}

        {ticketsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : tickets.length === 0 && clientId ? (
          <div className="empty-state">
            <p>No tickets yet. Submit one above if you need help!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map(t => (
              <div key={t.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.375rem' }}>{t.subject}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{t.description}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Opened {formatDate(t.created_at)}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end' }}>
                    <span className={statusBadgeClass(t.status)}>{t.status.replace('_', ' ')}</span>
                    <span className={t.priority === 'urgent' ? 'badge badge-red' : t.priority === 'high' ? 'badge badge-amber' : 'badge badge-white'}>{t.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New ticket modal */}
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>New Support Ticket</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={submitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Subject *</label>
                <input className="input" required value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief summary of the issue" />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea className="input" required value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Please describe the issue in detail…" style={{ minHeight: '100px' }} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as TicketPriority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : 'Submit ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
