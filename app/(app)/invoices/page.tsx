'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Client, InvoiceStatus } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, generateInvoiceNumber } from '@/lib/utils'
import {
  Plus, Search, X, Send, Link2, CheckCircle, AlertCircle, Clock,
  DollarSign, Eye, Zap, FileText, TrendingUp, ChevronDown, Filter,
} from 'lucide-react'
import Link from 'next/link'

const PLAN_PRICES: Record<string, number> = { starter: 20, growth: 50, premium: 75, business: 100 }
const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'void']

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 48 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%',
            height: `${Math.max((d.value / max) * 36, d.value > 0 ? 3 : 0)}px`,
            background: d.value > 0 ? '#7B2FFF' : 'rgba(255,255,255,0.06)',
            borderRadius: '3px 3px 0 0',
          }} />
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '3px', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── New Invoice Modal ────────────────────────────────────────────────────────

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
    const planPrice = PLAN_PRICES[client?.plan ?? ''] ?? 0

    const lineItems = client && planPrice > 0
      ? [{ type: 'monthly_plan', description: `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan — Monthly fee`, quantity: 1, unit_price: planPrice, total: planPrice }]
      : []
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

// ─── Bulk Monthly Modal ───────────────────────────────────────────────────────

function BulkMonthlyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pending, setPending] = useState<{ id: string; name: string; plan: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/invoices/bulk-monthly').then(r => r.json()).then(d => {
      setPending(d.pending ?? [])
      setLoading(false)
    })
  }, [])

  async function generate() {
    setGenerating(true)
    const res = await fetch('/api/invoices/bulk-monthly', { method: 'POST' })
    const data = await res.json()
    setResult(data.created ?? 0)
    setGenerating(false)
  }

  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Generate Monthly Invoices</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {result !== null ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle size={36} color="#22c55e" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{result} invoice{result !== 1 ? 's' : ''} generated</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>All set for {month}. Review and send them from the invoices list.</p>
            <button className="btn btn-primary" onClick={() => { onDone() }} style={{ marginTop: '1.5rem' }}>Done</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle size={32} color="#22c55e" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600 }}>All clients billed for {month}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>No unbilled active clients this month.</p>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: '1.5rem' }}>Close</button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {pending.length} active client{pending.length !== 1 ? 's' : ''} don&apos;t have an invoice for {month}:
            </p>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.5rem' }}>
              {pending.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{c.plan} — {formatMoney(PLAN_PRICES[c.plan] ?? 0)}/mo</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={generate} disabled={generating}>
                {generating ? <span className="spinner" /> : <><Zap size={14} /> Generate {pending.length} invoice{pending.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoices, setInvoices] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [modal, setModal] = useState(false)
  const [bulkModal, setBulkModal] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [revenueByMonth, setRevenueByMonth] = useState<{ label: string; value: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [invRes, clientsRes] = await Promise.all([
      supabase.from('invoices').select('*, clients(id, name, email)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allInvoices = (invRes.data ?? []) as any[]
    setInvoices(allInvoices)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClients((clientsRes.data ?? []) as any[])

    // Build 6-month revenue chart from paid invoices
    const now = new Date()
    const months: { label: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short' })
      const value = allInvoices
        .filter(inv => inv.status === 'paid' && inv.paid_at && inv.paid_at.startsWith(key))
        .reduce((s, inv) => s + (inv.total ?? 0), 0)
      months.push({ label, value })
    }
    setRevenueByMonth(months)

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Auto-mark overdue
  useEffect(() => {
    if (invoices.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const overdueIds = invoices.filter(i => i.status === 'sent' && i.due_date < today).map(i => i.id)
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

  async function quickMarkPaid(invId: string) {
    setMarkingPaidId(invId)
    try {
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', invId)
      await load()
    } finally {
      setMarkingPaidId(null)
    }
  }

  function copyLink(inv: typeof invoices[0]) {
    navigator.clipboard.writeText(inv.stripe_payment_link)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = invoices.filter(i => {
    const client = Array.isArray(i.clients) ? i.clients[0] : i.clients
    const matchSearch = search === '' ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (client?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    const matchClient = clientFilter === 'all' || (client?.id ?? '') === clientFilter
    return matchSearch && matchStatus && matchClient
  })

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const outstanding = invoices.filter(i => ['sent', 'overdue', 'viewed'].includes(i.status)).reduce((s, i) => s + (i.total ?? 0), 0)
  const paidThisMonth = invoices.filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= monthStart).reduce((s, i) => s + (i.total ?? 0), 0)
  const allTimePaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const viewedCount = invoices.filter(i => i.status === 'viewed').length
  const draftCount = invoices.filter(i => i.status === 'draft').length

  // Clients with invoices for the filter dropdown
  const clientsWithInvoices = clients.filter(c =>
    invoices.some(i => {
      const ic = Array.isArray(i.clients) ? i.clients[0] : i.clients
      return ic?.id === c.id
    })
  )

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1>Invoices</h1>
            <p>Create and manage client invoices.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => setBulkModal(true)}>
              <Zap size={14} /> Monthly batch
            </button>
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              <Plus size={16} /> New invoice
            </button>
          </div>
        </div>
      </div>

      {/* Stats + revenue chart */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }}
            onClick={() => setStatusFilter('all')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(outstanding)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Outstanding</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={18} color="#22c55e" />
            </div>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(paidThisMonth)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Paid this month</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={18} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(allTimePaid)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>All-time</p>
            </div>
          </div>
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: overdueCount > 0 ? 'pointer' : 'default' }}
            onClick={() => overdueCount > 0 && setStatusFilter('overdue')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={18} color="#ef4444" />
            </div>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1, color: overdueCount > 0 ? '#ef4444' : undefined }}>{overdueCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overdue</p>
            </div>
          </div>
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: viewedCount > 0 ? 'pointer' : 'default' }}
            onClick={() => viewedCount > 0 && setStatusFilter('viewed')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Eye size={18} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{viewedCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Viewed, unpaid</p>
            </div>
          </div>
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: draftCount > 0 ? 'pointer' : 'default' }}
            onClick={() => draftCount > 0 && setStatusFilter('draft')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(148,163,184,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} color="#94a3b8" />
            </div>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{draftCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Drafts</p>
            </div>
          </div>
          {/* Revenue chart tile */}
          {revenueByMonth.some(m => m.value > 0) && (
            <div className="card" style={{ gridColumn: 'span 2', minWidth: 0 }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Collected — last 6 months</p>
              <MiniBarChart data={revenueByMonth} />
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Client filter */}
        {clientsWithInvoices.length > 0 && (
          <div style={{ position: 'relative' }}>
            <Filter size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              className="input"
              style={{ paddingLeft: '2.25rem', paddingRight: '2rem', appearance: 'none', minWidth: 160, fontSize: '0.875rem' }}
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
            >
              <option value="all">All clients</option>
              {clientsWithInvoices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No invoices found.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal(true)}><Plus size={16} /> New invoice</button>
        </div>
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
                const wasCopied = copiedId === inv.id
                const isMarkingPaid = markingPaidId === inv.id
                const canSend = ['draft', 'sent', 'overdue', 'viewed'].includes(inv.status) && inv.total > 0
                const canMarkPaid = ['sent', 'overdue', 'viewed'].includes(inv.status)
                const isOverdue = inv.status === 'overdue'
                const overduedays = isOverdue ? daysOverdue(inv.due_date) : 0
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{inv.invoice_number}</td>
                    <td>
                      <Link href={`/clients/${client?.id}`} style={{ fontWeight: 500, color: 'inherit', textDecoration: 'none' }}>
                        {client?.name ?? '—'}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{formatDate(inv.issue_date)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : undefined, fontSize: '0.875rem' }}>{formatDate(inv.due_date)}</span>
                        {isOverdue && overduedays > 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.03em' }}>+{overduedays}d overdue</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatMoney(inv.total)}</td>
                    <td><span className={statusBadgeClass(inv.status)}>{inv.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">View</Link>
                        {canMarkPaid && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Mark as paid"
                            onClick={() => quickMarkPaid(inv.id)}
                            disabled={isMarkingPaid}
                            style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}
                          >
                            {isMarkingPaid ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <CheckCircle size={13} />}
                          </button>
                        )}
                        {inv.stripe_payment_link && inv.status !== 'paid' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Copy payment link"
                            onClick={() => copyLink(inv)}
                            style={wasCopied ? { color: '#22c55e' } : {}}
                          >
                            {wasCopied ? <CheckCircle size={13} /> : <Link2 size={13} />}
                          </button>
                        )}
                        {canSend && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={isSending}
                            title={isOverdue ? 'Send reminder' : inv.stripe_payment_link ? 'Resend to client' : 'Generate link & email client'}
                            onClick={() => quickSend(inv)}
                            style={wasSent ? { color: '#22c55e' } : isOverdue ? { color: '#ef4444' } : {}}
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
          onSave={(id) => { setModal(false); router.push(`/invoices/${id}`) }}
        />
      )}

      {bulkModal && (
        <BulkMonthlyModal
          onClose={() => setBulkModal(false)}
          onDone={() => { setBulkModal(false); load() }}
        />
      )}
    </>
  )
}
