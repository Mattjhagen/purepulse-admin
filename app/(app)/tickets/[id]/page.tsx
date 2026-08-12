'use client'
import { useState, useEffect, useCallback, use, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, TicketStatus, TicketPriority } from '@/lib/types'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import { ChevronLeft, Send, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'blocked', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

type Comment = { id: string; ticket_id: string; user_id: string | null; is_client: boolean; body: string; created_at: string }

function priorityBadgeClass(p: TicketPriority) {
  if (p === 'urgent') return 'badge badge-red'
  if (p === 'high') return 'badge badge-amber'
  if (p === 'medium') return 'badge badge-blue'
  return 'badge badge-white'
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const [ticket, setTicket] = useState<(Ticket & { clients: { name: string; email: string } | null }) | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tickets').select('*, clients(name, email)').eq('id', id).single(),
      supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTicket(t as any)
    setComments(c ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function updateField(field: 'status' | 'priority', value: string) {
    setUpdating(true)
    await supabase.from('tickets').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
    setUpdating(false)
  }

  async function quickAction(status: TicketStatus) {
    setUpdating(true)
    await supabase.from('tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
    setUpdating(false)
  }

  async function sendReply(e?: React.FormEvent) {
    e?.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert({ ticket_id: id, user_id: user?.id ?? null, is_client: false, body: reply.trim() })
    setReply('')
    await load()
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      sendReply()
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!ticket) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Ticket not found.</div>

  const isOpen = ticket.status !== 'resolved' && ticket.status !== 'closed'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/tickets" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Tickets</Link>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {ticket.clients?.name ?? '—'}
        </span>
        <span className={priorityBadgeClass(ticket.priority)}>{ticket.priority}</span>
        <span className={statusBadgeClass(ticket.status)}>{ticket.status.replace('_', ' ')}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Ticket card */}
          <div className="card-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{ticket.subject}</h1>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Opened {formatDate(ticket.created_at)}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{ticket.description}</p>
          </div>

          {/* Conversation */}
          <div className="card-elevated">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Conversation</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', maxHeight: '420px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No replies yet. Start the conversation below.</p>
              ) : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: c.is_client ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth: '80%', border: '1px solid var(--border)', padding: '0.625rem 0.875rem',
                    background: c.is_client ? 'var(--bg-elevated)' : '#fff',
                    borderRadius: c.is_client ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                  }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: c.is_client ? 'var(--text-muted)' : 'rgba(8,8,8,0.55)' }}>
                      {c.is_client ? (ticket.clients?.name ?? 'Client') : 'You'}
                    </p>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, color: c.is_client ? 'var(--text)' : '#080808', whiteSpace: 'pre-wrap' }}>{c.body}</p>
                    <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: c.is_client ? 'var(--text-muted)' : 'rgba(8,8,8,0.55)' }}>{formatDate(c.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendReply} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                className="input"
                style={{ resize: 'vertical', minHeight: '72px' }}
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply to this ticket… (Ctrl+Enter to send)"
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={sending || !reply.trim()}>
                  {sending ? <span className="spinner" /> : <><Send size={14} /> Send reply</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick actions */}
          {isOpen && (
            <div className="card-elevated">
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ticket.status !== 'in_progress' && (
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }} onClick={() => quickAction('in_progress')} disabled={updating}>
                    <Clock size={14} color="#f59e0b" /> Mark In Progress
                  </button>
                )}
                {ticket.status !== 'blocked' && (
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }} onClick={() => quickAction('blocked')} disabled={updating}>
                    <AlertCircle size={14} color="#ef4444" /> Mark Blocked
                  </button>
                )}
                {ticket.status !== 'open' && (
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }} onClick={() => quickAction('open')} disabled={updating}>
                    <RefreshCw size={14} /> Reopen
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }} onClick={() => quickAction('resolved')} disabled={updating}>
                  <CheckCircle size={14} color="#22c55e" /> Mark Resolved
                </button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem', color: 'var(--text-muted)' }} onClick={() => quickAction('closed')} disabled={updating}>
                  <XCircle size={14} /> Close ticket
                </button>
              </div>
            </div>
          )}

          {/* Resolved/closed reopen */}
          {!isOpen && (
            <div className="card-elevated">
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Actions</h3>
              <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem', width: '100%' }} onClick={() => quickAction('open')} disabled={updating}>
                <RefreshCw size={14} /> Reopen ticket
              </button>
            </div>
          )}

          {/* Details */}
          <div className="card-elevated">
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Status</p>
                <select className="input input-sm" value={ticket.status} onChange={e => updateField('status', e.target.value)} disabled={updating}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Priority</p>
                <select className="input input-sm" value={ticket.priority} onChange={e => updateField('priority', e.target.value)} disabled={updating}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ticket.clients?.name ?? '—'}</p>
                {ticket.clients?.email && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{ticket.clients.email}</p>}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Opened</p>
                <p style={{ fontSize: '0.875rem' }}>{formatDate(ticket.created_at)}</p>
              </div>
              {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Last updated</p>
                  <p style={{ fontSize: '0.875rem' }}>{formatDate(ticket.updated_at)}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Replies</p>
                <p style={{ fontSize: '0.875rem' }}>{comments.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
