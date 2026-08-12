'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, TicketStatus, TicketPriority } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { ChevronLeft, Send } from 'lucide-react'
import Link from 'next/link'

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'blocked', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

type Comment = { id: string; ticket_id: string; user_id: string | null; is_client: boolean; body: string; created_at: string }

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const [ticket, setTicket] = useState<(Ticket & { clients: { name: string } | null }) | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tickets').select('*, clients(name)').eq('id', id).single(),
      supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTicket(t as any)
    setComments(c ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  async function updateField(field: 'status' | 'priority', value: string) {
    await supabase.from('tickets').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert({ ticket_id: id, user_id: user?.id ?? null, is_client: false, body: reply.trim() })
    setReply('')
    await load()
    setSending(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!ticket) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Ticket not found.</div>

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/tickets" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Tickets</Link>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{ticket.clients?.name ?? '—'}</span>
      </div>

      <div className="card-elevated" style={{ maxWidth: '640px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{ticket.subject}</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>Opened {formatDate(ticket.created_at)}</span>
        </div>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>{ticket.description}</p>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Status</label>
            <select className="input input-sm" value={ticket.status} onChange={e => updateField('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select className="input input-sm" value={ticket.priority} onChange={e => updateField('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card-elevated" style={{ maxWidth: '640px' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Conversation</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {comments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No replies yet.</p>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: c.is_client ? 'flex-start' : 'flex-end' }}>
              <div style={{
                maxWidth: '80%', border: '1px solid var(--border)', padding: '0.625rem 0.875rem',
                background: c.is_client ? 'var(--bg-elevated)' : '#fff',
                borderRadius: c.is_client ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: c.is_client ? 'var(--text-muted)' : 'rgba(8,8,8,0.55)' }}>
                  {c.is_client ? (ticket.clients?.name ?? 'Client') : 'Matty'}
                </p>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, color: c.is_client ? 'var(--text)' : '#080808' }}>{c.body}</p>
                <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: c.is_client ? 'var(--text-muted)' : 'rgba(8,8,8,0.55)' }}>{formatDate(c.created_at)}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={sendReply} style={{ display: 'flex', gap: '0.75rem' }}>
          <input className="input" style={{ flex: 1 }} value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to this ticket…" required />
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? <span className="spinner" /> : <><Send size={14} /> Send</>}
          </button>
        </form>
      </div>
    </>
  )
}
