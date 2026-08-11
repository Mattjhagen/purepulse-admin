'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import { Plus, X, LogOut, CheckCircle, Circle, Clock, MessageCircle, FileText, CreditCard, LifeBuoy } from 'lucide-react'

type Tab = 'progress' | 'messages' | 'invoices' | 'tickets'

type Stage = { id: string; name: string; status: 'pending' | 'in_progress' | 'complete'; note?: string; completed_at?: string; sort_order: number }
type Message = { id: string; sender: 'admin' | 'client'; sender_name: string; body: string; created_at: string }
type Invoice = { id: string; invoice_number: string; status: string; issue_date: string; due_date: string; total: number; stripe_payment_link?: string }
type Ticket = { id: string; subject: string; description: string; status: string; priority: string; created_at: string }

export default function CustomerPortalPage() {
  const supabase = createClient()
  const [session, setSession] = useState<{ user: { email?: string; id: string } } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [tab, setTab] = useState<Tab>('progress')

  // Data
  const [stages, setStages] = useState<Stage[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)

  // New ticket
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketDesc, setTicketDesc] = useState('')
  const [ticketPriority, setTicketPriority] = useState('medium')
  const [submittingTicket, setSubmittingTicket] = useState(false)

  // New message
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession({ user: { email: data.session.user.email, id: data.session.user.id } })
    })
  }, [supabase])

  const loadData = useCallback(async () => {
    if (!session) return
    setLoading(true)

    const { data: pu } = await supabase.from('portal_users').select('client_id').eq('auth_user_id', session.user.id).single()
    if (!pu?.client_id) { setLoading(false); return }
    setClientId(pu.client_id)

    const { data: client } = await supabase.from('clients').select('name').eq('id', pu.client_id).single()
    if (client) setClientName(client.name)

    const [{ data: s }, { data: m }, { data: inv }, { data: t }] = await Promise.all([
      supabase.from('project_stages').select('*').eq('client_id', pu.client_id).order('sort_order'),
      supabase.from('client_messages').select('*').eq('client_id', pu.client_id).order('created_at'),
      supabase.from('invoices').select('id,invoice_number,status,issue_date,due_date,total,stripe_payment_link').eq('client_id', pu.client_id).order('issue_date', { ascending: false }),
      supabase.from('tickets').select('*').eq('client_id', pu.client_id).order('created_at', { ascending: false }),
    ])

    setStages(s ?? [])
    setMessages(m ?? [])
    setInvoices(inv ?? [])
    setTickets(t ?? [])
    setLoading(false)
  }, [session, supabase])

  useEffect(() => { if (session) loadData() }, [session, loadData])

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
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'Auth failed') }
    setAuthLoading(false)
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setSubmittingTicket(true)
    await supabase.from('tickets').insert({ client_id: clientId, subject: ticketSubject, description: ticketDesc, priority: ticketPriority, status: 'open' })
    setTicketSubject(''); setTicketDesc(''); setShowNewTicket(false)
    await loadData()
    setSubmittingTicket(false)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !newMessage.trim()) return
    setSendingMessage(true)
    await supabase.from('client_messages').insert({ client_id: clientId, sender: 'client', sender_name: clientName || session?.user.email || 'Client', body: newMessage.trim() })
    setNewMessage('')
    await loadData()
    setSendingMessage(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null); setClientId(null); setStages([]); setMessages([]); setInvoices([]); setTickets([])
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
            {authError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>{authError}</div>}
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'progress', label: 'Progress', icon: <CheckCircle size={16} /> },
    { id: 'messages', label: 'Messages', icon: <MessageCircle size={16} />, count: messages.filter(m => m.sender === 'admin').length },
    { id: 'invoices', label: 'Invoices', icon: <CreditCard size={16} />, count: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length },
    { id: 'tickets', label: 'Tickets', icon: <LifeBuoy size={16} />, count: tickets.filter(t => t.status === 'open').length },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.75rem' }}>Client Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{clientName || session.user.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}><LogOut size={14} /> Sign out</button>
        </div>
      </header>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 2rem', display: 'flex', gap: '0.25rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? 'var(--text)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--text)' : '2px solid transparent', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: tab === t.id ? 'var(--text)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
            {t.icon} {t.label}
            {t.count ? <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, padding: '0 5px', borderRadius: '100px', minWidth: '18px', textAlign: 'center' }}>{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : !clientId ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Your account isn&apos;t linked to a project yet. Contact <a href="mailto:matty@purepulse.one" style={{ color: 'var(--text)' }}>matty@purepulse.one</a> to get set up.</p>
          </div>
        ) : (
          <>
            {/* PROGRESS TAB */}
            {tab === 'progress' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Project Progress</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Track where your project stands.</p>
                {stages.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Clock size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>Your project stages will appear here once we kick things off.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {stages.map((stage, i) => (
                      <div key={stage.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', opacity: stage.status === 'pending' && i > 0 && stages[i-1].status !== 'complete' ? 0.5 : 1 }}>
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                          {stage.status === 'complete' ? <CheckCircle size={20} color="#22c55e" /> : stage.status === 'in_progress' ? <Clock size={20} color="#f59e0b" /> : <Circle size={20} style={{ opacity: 0.3 }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <p style={{ fontWeight: 600 }}>{stage.name}</p>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '100px', background: stage.status === 'complete' ? 'rgba(34,197,94,0.1)' : stage.status === 'in_progress' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', color: stage.status === 'complete' ? '#22c55e' : stage.status === 'in_progress' ? '#f59e0b' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {stage.status.replace('_', ' ')}
                            </span>
                          </div>
                          {stage.note && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{stage.note}</p>}
                          {stage.completed_at && <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Completed {formatDate(stage.completed_at)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {tab === 'messages' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Messages</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Communicate directly with the PurePulse team.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {messages.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                      <MessageCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p style={{ color: 'var(--text-muted)' }}>No messages yet. Send one below!</p>
                    </div>
                  ) : messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '75%', background: m.sender === 'client' ? 'var(--accent-primary, #7B2FFF)' : 'var(--card)', border: '1px solid var(--border)', borderRadius: m.sender === 'client' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: m.sender === 'client' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: '0.25rem' }}>{m.sender_name}</p>
                        <p style={{ color: m.sender === 'client' ? '#fff' : 'var(--text)', lineHeight: 1.6, fontSize: '0.9375rem' }}>{m.body}</p>
                        <p style={{ fontSize: '0.75rem', color: m.sender === 'client' ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', marginTop: '0.375rem' }}>{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                  <input className="input" style={{ flex: 1 }} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message…" required />
                  <button type="submit" className="btn btn-primary" disabled={sendingMessage}>
                    {sendingMessage ? <span className="spinner" /> : 'Send'}
                  </button>
                </form>
              </div>
            )}

            {/* INVOICES TAB */}
            {tab === 'invoices' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Invoices</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>View and pay your invoices.</p>
                {invoices.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No invoices yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {invoices.map(inv => (
                      <div key={inv.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontWeight: 600 }}>{inv.invoice_number}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>${inv.total.toFixed(2)}</p>
                          <span className={statusBadgeClass(inv.status)}>{inv.status}</span>
                          {(inv.status === 'sent' || inv.status === 'overdue') && inv.stripe_payment_link && (
                            <a href={inv.stripe_payment_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                              <CreditCard size={14} /> Pay Now
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TICKETS TAB */}
            {tab === 'tickets' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Support Tickets</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Submit and track support requests.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowNewTicket(true)}><Plus size={16} /> New ticket</button>
                </div>
                {tickets.length === 0 ? (
                  <div className="empty-state"><p>No tickets yet. Submit one if you need help!</p></div>
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
            )}
          </>
        )}
      </div>

      {/* New ticket modal */}
      {showNewTicket && (
        <div className="modal-backdrop" onClick={() => setShowNewTicket(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>New Support Ticket</h2>
              <button onClick={() => setShowNewTicket(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={submitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Subject *</label>
                <input className="input" required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Brief summary" />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea className="input" required value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="Describe the issue…" style={{ minHeight: '100px' }} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="input" value={ticketPriority} onChange={e => setTicketPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewTicket(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingTicket}>{submittingTicket ? <span className="spinner" /> : 'Submit ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
