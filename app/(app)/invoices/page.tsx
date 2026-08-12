'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Invoice, Client, InvoiceStatus } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, generateInvoiceNumber } from '@/lib/utils'
import { Plus, Search, X, Send, Link2, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'

const PLAN_PRICES: Record<string, number> = { starter: 20, growth: 50, premium: 75, business: 100 }

function InvoiceModal({ clients, onClose, onSave }: { clients: Client[]; onClose: () => void; onSave: (id: string) => void }) {
  const supabase = createClient()
  const [clientId, setClientId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const client = clients.find(c => c.id === clientId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const invoiceNumber = generateInvoiceNumber()

    const lineItems = []
    if (client) {
      const planPrice = PLAN_PRICES[client.plan] ?? 0
      if (planPrice > 0) {
        lineItems.push({ type: 'monthly_plan', description: `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan — Monthly fee`, quantity: 1, unit_price: planPrice, total: planPrice })
      }
    }

    const subtotal = lineItems.reduce((s, l) => s + l.total, 0)

    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      client_id: clientId,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate,
      subtotal, tax_rate: 0, tax_amount: 0, discount: 0, total: subtotal,
      notes: notes || null,
    }).select().single()

    if (invErr || !inv) { setError(invErr?.message ?? 'Failed'); setLoading(false); return }

    if (lineItems.length > 0) {
      await supabase.from('invoice_line_items').insert(lineItems.map((l, i) => ({ ...l, invoice_id: inv.id, sort_order: i })))
    }

    onSave(inv.id)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>New Invoice</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Client *</label>
            <select className="input" required value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.plan}</option>)}
            </select>
          </div>
          {client && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Auto-adding: <strong style={{ color: 'var(--text)' }}>{client.plan} plan</strong> at <strong style={{ color: 'var(--text)' }}>{formatMoney(PLAN_PRICES[client.plan] ?? 0)}/mo</strong>. Edit line items after creation.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Issue Date</label>
              <input className="input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, instructions…" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Create invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoices, setInvoices] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modal, setModal] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [invRes, clientsRes] = await Promise.all([
      supabase.from('invoices').select('*, clients(name, email)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setInvoices((invRes.data ?? []) as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClients((clientsRes.data ?? []) as any[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Auto-mark overdue: sent invoices whose due_date has passed
  useEffect(() => {
    if (invoices.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const overdueIds = invoices
      .filter(i => i.status === 'sent' && i.due_date < today)
      .map(i => i.id)
    if (overdueIds.length === 0) return
    supabase.from('invoices').update({ status: 'overdue' }).in('id', overdueIds).then(() => load())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices.length])

  async function quickSend(inv: typeof invoices[0]) {
    setSendingId(inv.id)
    try {
      const res = await fetch(`/api/invoices/${inv.id}/send`, { method: 'POST' })
      if (res.ok) {
        setSentId(inv.id)
        setTimeout(() => setSentId(null), 3000)
        await load()
      }
    } finally {
      setSendingId(null)
    }
  }

  const filtered = invoices.filter(i => {
    const matchSearch = search === '' || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || (i.clients?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchSearch && matchStatus
  })

  const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'void']

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.total ?? 0), 0)
  const paidThisMonth = invoices.filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= monthStart).reduce((s, i) => s + (i.total ?? 0), 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const draftCount = invoices.filter(i => i.status === 'draft').length

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Invoices</h1>
            <p>Create and manage client invoices.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> New invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(outstanding)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Outstanding</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={18} color="#22c55e" />
            </div>
            <div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(paidThisMonth)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Paid this month</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={18} color="#ef4444" />
            </div>
            <div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{overdueCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overdue</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle size={18} style={{ opacity: 0.4 }} />
            </div>
            <div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{draftCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Drafts</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No invoices found.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Client</th><th>Issued</th><th>Due</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients
                const isSending = sendingId === inv.id
                const wasSent = sentId === inv.id
                const canSend = ['draft', 'sent', 'overdue'].includes(inv.status) && inv.total > 0
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{inv.invoice_number}</td>
                    <td style={{ fontWeight: 500 }}>{client?.name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(inv.issue_date)}</td>
                    <td style={{ color: inv.status === 'overdue' ? '#ef4444' : 'var(--text-muted)' }}>{formatDate(inv.due_date)}</td>
                    <td style={{ fontWeight: 700 }}>{formatMoney(inv.total)}</td>
                    <td><span className={statusBadgeClass(inv.status)}>{inv.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">View</Link>
                        {inv.stripe_payment_link && inv.status !== 'paid' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Copy payment link"
                            onClick={() => navigator.clipboard.writeText(inv.stripe_payment_link)}
                          >
                            <Link2 size={13} />
                          </button>
                        )}
                        {canSend && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={isSending}
                            title={inv.stripe_payment_link ? 'Resend to client' : 'Generate link & email client'}
                            onClick={() => quickSend(inv)}
                            style={wasSent ? { color: '#22c55e' } : {}}
                          >
                            {isSending ? <span className="spinner" style={{ width: 12, height: 12 }} /> : wasSent ? <CheckCircle size={13} /> : <Send size={13} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <InvoiceModal
          clients={clients}
          onClose={() => setModal(false)}
          onSave={() => { setModal(false); load() }}
        />
      )}
    </>
  )
}
