'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, Client, TicketStatus, TicketPriority } from '@/lib/types'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import { Plus, Search, X } from 'lucide-react'
import Link from 'next/link'

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'blocked', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

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
  const [modal, setModal] = useState<{ open: boolean; ticket?: Ticket | null }>({ open: false })

  const load = useCallback(async () => {
    setLoading(true)
    const [ticketsRes, clientsRes] = await Promise.all([
      supabase.from('tickets').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTickets((ticketsRes.data ?? []) as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClients((clientsRes.data ?? []) as any[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = tickets.filter(t => {
    const matchSearch = search === '' || t.subject.toLowerCase().includes(search.toLowerCase()) || (t.clients?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>IT Tickets</h1>
            <p>Track and resolve client support requests.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, ticket: null })}>
            <Plus size={16} /> New ticket
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
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
                    <Link href={`/tickets/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontWeight: 500 }}>{t.subject}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{t.description}</p>
                    </Link>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.clients?.name ?? '—'}</td>
                  <td>
                    <span className={t.priority === 'urgent' ? 'badge badge-red' : t.priority === 'high' ? 'badge badge-amber' : t.priority === 'medium' ? 'badge badge-blue' : 'badge badge-white'}>
                      {t.priority}
                    </span>
                  </td>
                  <td><span className={statusBadgeClass(t.status)}>{t.status.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(t.created_at)}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, ticket: t })}>Edit</button></td>
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
