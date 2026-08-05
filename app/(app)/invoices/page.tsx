'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Invoice, Client, InvoiceStatus } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, generateInvoiceNumber } from '@/lib/utils'
import { Plus, Search, X, Printer } from 'lucide-react'
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

    // Auto line items based on client plan
    const lineItems = []
    if (client) {
      const planPrice = PLAN_PRICES[client.plan] ?? 0
      if (planPrice > 0) {
        lineItems.push({ type: 'monthly_plan', description: `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan — Monthly fee`, quantity: 1, unit_price: planPrice, total: planPrice })
      }
    }

    const subtotal = lineItems.reduce((s, l) => s + l.total, 0)
    const total = subtotal

    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      client_id: clientId,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate,
      subtotal, tax_rate: 0, tax_amount: 0, discount: 0, total,
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
              Auto-adding: <strong style={{ color: 'var(--text)' }}>{client.plan} plan</strong> at <strong style={{ color: 'var(--text)' }}>{formatMoney(PLAN_PRICES[client.plan] ?? 0)}/mo</strong>. You can edit line items after creation.
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
  const [invoices, setInvoices] = useState<(Invoice & { clients: { name: string } | null })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [invRes, clientsRes] = await Promise.all([
      supabase.from('invoices').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setInvoices((invRes.data ?? []) as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClients((clientsRes.data ?? []) as any[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = invoices.filter(i => {
    const matchSearch = search === '' || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || (i.clients?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchSearch && matchStatus
  })

  const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'void']

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
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{inv.invoice_number}</td>
                  <td style={{ fontWeight: 500 }}>{(inv.clients as { name: string } | null)?.name ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(inv.issue_date)}</td>
                  <td style={{ color: inv.status === 'overdue' ? 'var(--accent-red)' : 'var(--text-muted)' }}>{formatDate(inv.due_date)}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(inv.total)}</td>
                  <td><span className={statusBadgeClass(inv.status)}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <InvoiceModal
          clients={clients}
          onClose={() => setModal(false)}
          onSave={(id) => { setModal(false); load() }}
        />
      )}
    </>
  )
}
