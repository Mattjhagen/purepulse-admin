'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, Client, TicketStatus, TicketPriority } from '@/lib/types'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import { Plus, Search, X, AlertCircle, Clock, CheckCircle, XCircle, Ticket as TicketIcon } from 'lucide-react'
import Link from 'next/link'

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'blocked', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

function priorityBadgeClass(p: TicketPriority) {
  if (p === 'urgent') return 'badge badge-red'
  if (p === 'high') return 'badge badge-amber'
  if (p === 'medium') return 'badge badge-blue'
  return 'badge badge-white'
}

function TicketModal({ ticket, clients, onClose, onSave }: {
  ticket?: Ticket | null; clients: Client[]; onClose: () => void; onSave: () => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    client_id: ticket?.client_id ?? '',
    subject: ticket?.subject ?? '',
    description: ticket?.description ?? '',
    status: (ticket?.status ?? 'open') as TicketStatus,
    priority: (ticket?.priority ?? 'medium') as TicketPriority,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    const { error: err } = ticket?.id
      ? await supabase.from('tickets').update(payload).eq('id', ticket.id)
      : await supabase.from('tickets').insert(payload)
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>{ticket ? 'Edit Ticket' : 'New Ticket'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Client *</label>
            <select className="input" required value={form.client_id} onChange={e => set('client_id', e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Subject *</label>
            <input className="input" required value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief summary of the issue" />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea className="input" required value={form.description} onChange={e => set('description', e.target.value)} placeholder="Full details…" style={{ minHeight: '120px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : ticket ? 'Save' : 'Create ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TicketsPage() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<(Ticket & { clients: { name: string } | null })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [modal, setModal] = useState<{ open: boolean; ticket?: Ticket | null }>({ open: false })

  const load = useCallback(async () => {
    setLoading(true)
    const [ticketsRes, clientsRes] = await Promise.all([
      supabase.from('tickets').select('*, clients(name, plan)').order('created_at', { ascending: true }),
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    const PLAN_WEIGHTS: Record<string, number> = {
      '$100': 4, '$100/mo': 4, 'enterprise': 4,
      '$75': 3, '$75/mo': 3, 'pro': 3,
      '$50': 2, '$50/mo': 2, 'growth': 2,
      '$20': 1, '$20/mo': 1, 'starter': 1,
    }
    const PRIORITY_WEIGHTS: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

    const raw = (ticketsRes.data ?? []) as any[]
    raw.sort((a, b) => {
      const planA = a.clients?.plan || ''
      const planB = b.clients?.plan || ''
      const wA = PLAN_WEIGHTS[planA.toLowerCase()] || PRIORITY_WEIGHTS[a.priority] || 1
      const wB = PLAN_WEIGHTS[planB.toLowerCase()] || PRIORITY_WEIGHTS[b.priority] || 1
      if (wA !== wB) return wB - wA
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    setTickets(raw)
    setClients((clientsRes.data ?? []) as any[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = tickets.filter(t => {
    const matchSearch = search === '' || t.subject.toLowerCase().includes(search.toLowerCase()) || (t.clients?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  // Stats
  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const blockedCount = tickets.filter(t => t.status === 'blocked').length
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Tickets</h1>
            <p>Track and resolve client support requests.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, ticket: null })}>
            <Plus size={16} /> New ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TicketIcon size={18} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{openCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Open</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{inProgressCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>In Progress</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={18} color="#ef4444" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{blockedCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Blocked</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: urgentCount > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <XCircle size={18} color={urgentCount > 0 ? '#ef4444' : undefined} style={urgentCount === 0 ? { opacity: 0.3 } : undefined} />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{urgentCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Urgent</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="btn btn-ghost btn-sm"
              style={{
                fontWeight: statusFilter === s ? 700 : 400,
                background: statusFilter === s ? 'var(--bg-card-hover)' : undefined,
                borderColor: statusFilter === s ? 'var(--border-strong)' : undefined,
                textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['all', ...PRIORITIES].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className="btn btn-ghost btn-sm"
              style={{
                fontWeight: priorityFilter === p ? 700 : 400,
                background: priorityFilter === p ? 'var(--bg-card-hover)' : undefined,
                borderColor: priorityFilter === p ? 'var(--border-strong)' : undefined,
                textTransform: 'capitalize',
              }}
            >
              {p === 'all' ? 'Any priority' : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal({ open: true, ticket: null })}><Plus size={16} /> Create ticket</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Ticket</th><th>Client</th><th>Priority</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <p style={{ fontWeight: 600 }}>{t.subject}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{t.description}</p>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.clients?.name ?? '—'}</td>
                  <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                  <td><span className={statusBadgeClass(t.status)}>{t.status.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(t.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <Link href={`/tickets/${t.id}`} className="btn btn-ghost btn-sm">View</Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, ticket: t })}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <TicketModal
          ticket={modal.ticket}
          clients={clients}
          onClose={() => setModal({ open: false })}
          onSave={() => { setModal({ open: false }); load() }}
        />
      )}
    </>
  )
}
