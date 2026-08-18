'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, Plan, PLAN_PRICES } from '@/lib/types'
import { formatDate, formatMoney, planBadgeClass, planLabel, statusBadgeClass } from '@/lib/utils'
import {
  ChevronLeft, Edit3, Save, X, Mail, Phone, Building2, Clock,
  FileText, Receipt, Ticket, MessageCircle, CheckCircle, Link2,
  AlertCircle, DollarSign, Ban, AlertTriangle, ShieldOff, TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { SuspensionModal } from '@/components/SuspensionModal'

const PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']
const STATUSES = ['active', 'inactive', 'prospect']

// ─── Revenue sparkline ────────────────────────────────────────────────────────

interface PaidInvoice { total: number; paid_at: string }

function RevenueSparkline({ invoices }: { invoices: PaidInvoice[] }) {
  const now = new Date()
  // Build last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      total: 0,
    }
  })

  for (const inv of invoices) {
    if (!inv.paid_at) continue
    const d = new Date(inv.paid_at)
    const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
    if (slot) slot.total += inv.total ?? 0
  }

  const max = Math.max(...months.map(m => m.total), 1)
  const hasData = months.some(m => m.total > 0)
  const lifetime = invoices.reduce((s, i) => s + (i.total ?? 0), 0)

  if (!hasData) return null

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Revenue</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lifetime paid</p>
          <p style={{ fontWeight: 800, fontSize: '1.125rem', lineHeight: 1.2, color: '#22c55e' }}>{formatMoney(lifetime)}</p>
        </div>
      </div>
      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', height: 56 }}>
        {months.map((m, i) => {
          const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth()
          const pct = max > 0 ? (m.total / max) * 100 : 0
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${m.label}: ${formatMoney(m.total)}`}>
              <div style={{
                width: '100%',
                height: `${Math.max(pct, m.total > 0 ? 6 : 2)}%`,
                borderRadius: '3px 3px 0 0',
                background: isCurrentMonth
                  ? '#6366f1'
                  : m.total > 0
                    ? 'rgba(99,102,241,0.4)'
                    : 'rgba(255,255,255,0.06)',
                boxShadow: isCurrentMonth ? '0 0 8px rgba(99,102,241,0.4)' : undefined,
                transition: 'height 0.3s ease',
              }} />
            </div>
          )
        })}
      </div>
      {/* Month labels */}
      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem' }}>
        {months.map((m, i) => {
          const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth()
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: isCurrentMonth ? 'var(--text)' : 'var(--text-muted)', fontWeight: isCurrentMonth ? 700 : 400 }}>
              {m.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ client, onClose, onSave }: { client: Client; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: client.name,
    email: client.email,
    phone: client.phone ?? '',
    company: client.company ?? '',
    plan: client.plan,
    hourly_rate: client.hourly_rate,
    status: client.status,
    notes: client.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error: err } = await supabase.from('clients').update({
      ...form, hourly_rate: Number(form.hourly_rate), updated_at: new Date().toISOString()
    }).eq('id', client.id)
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Edit Client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Name *</label><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="form-group"><label>Company</label><input className="input" value={form.company} onChange={e => set('company', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Email *</label><input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group"><label>Phone</label><input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Plan *</label>
              <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLANS.map(p => <option key={p} value={p}>{planLabel(p)} — ${PLAN_PRICES[p]}/mo</option>)}
              </select>
            </div>
            <div className="form-group"><label>Hourly Rate</label><input className="input" type="number" min={0} step={0.01} value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} /></div>
            <div className="form-group">
              <label>Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Notes</label><textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" /></div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : <><Save size={14} /> Save changes</>}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoices, setInvoices] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allPaidInvoices, setAllPaidInvoices] = useState<PaidInvoice[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contracts, setContracts] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tickets, setTickets] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [portalLinked, setPortalLinked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<'warn' | 'suspend' | 'unsuspend' | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

    const [clientRes, invRes, paidRes, contractRes, ticketRes, timeRes, portalRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('invoices').select('total, paid_at').eq('client_id', id).eq('status', 'paid'),
      supabase.from('contracts').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('tickets').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('time_entries').select('*').eq('client_id', id).gte('clock_in', monthStart).order('clock_in', { ascending: false }).limit(10),
      supabase.from('portal_users').select('id').eq('client_id', id).maybeSingle(),
    ])

    setClient(clientRes.data)
    setInvoices(invRes.data ?? [])
    setAllPaidInvoices(paidRes.data ?? [])
    setContracts(contractRes.data ?? [])
    setTickets(ticketRes.data ?? [])
    setTimeEntries(timeRes.data ?? [])
    setPortalLinked(!!portalRes.data)
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  async function invitePortal() {
    setInviting(true); setInviteMsg(null)
    try {
      const res = await fetch(`/api/clients/${id}/portal-invite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setPortalLinked(true)
      setInviteMsg({ type: 'ok', text: 'Portal invite sent.' })
    } catch (err) {
      setInviteMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally { setInviting(false) }
  }

  async function sendWarning() {
    setActionLoading('warn'); setActionMsg(null)
    try {
      const res = await fetch(`/api/clients/${id}/warn`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setActionMsg({ type: 'ok', text: `Warning email sent (${data.invoiceCount} invoice${data.invoiceCount !== 1 ? 's' : ''}, total ${formatMoney(data.totalOwed)}).` })
      load()
    } catch (err) {
      setActionMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally { setActionLoading(null) }
  }

  async function suspendClient() {
    setActionLoading('suspend'); setActionMsg(null)
    try {
      const res = await fetch(`/api/clients/${id}/suspend`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setActionMsg({ type: 'ok', text: 'Client suspended. Suspension email sent.' })
      load()
    } catch (err) {
      setActionMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally { setActionLoading(null) }
  }

  async function unsuspendClient() {
    setActionLoading('unsuspend'); setActionMsg(null)
    try {
      const res = await fetch(`/api/clients/${id}/suspend`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setActionMsg({ type: 'ok', text: 'Client access restored.' })
      load()
    } catch (err) {
      setActionMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally { setActionLoading(null) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!client) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Client not found.</div>

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const outstanding = invoices.filter(i => ['sent', 'overdue', 'viewed'].includes(i.status)).reduce((s, i) => s + (i.total ?? 0), 0)
  const paidThisMonth = invoices.filter(i => i.status === 'paid' && i.paid_at >= monthStart).reduce((s, i) => s + (i.total ?? 0), 0)
  const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length
  const hoursThisMonth = timeEntries.reduce((s, e) => {
    if (!e.clock_out) return s
    return s + (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3_600_000
  }, 0)
  const activeContract = contracts.find(c => ['signed', 'active'].includes(c.status))
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const maxDaysOverdue = overdueInvoices.reduce((max, i) => {
    const d = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86_400_000)
    return Math.max(max, d)
  }, 0)
  const canWarn = overdueInvoices.length > 0 && !client.suspended
  const canSuspend = maxDaysOverdue >= 60 && !client.suspended
  const lifetimeValue = allPaidInvoices.reduce((s, i) => s + (i.total ?? 0), 0)

  const alertBg = (color: string) => `rgba(${color},0.07)`
  const alertBorder = (color: string) => `rgba(${color},0.25)`

  return (
    <>
      {/* Breadcrumb + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/clients" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Clients</Link>
        <span className={statusBadgeClass(client.status)}>{client.status}</span>
        <span className={planBadgeClass(client.plan)}>{planLabel(client.plan)}</span>
        {client.suspended && <span className="badge badge-red"><Ban size={11} style={{ marginRight: 3 }} />Suspended</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!portalLinked ? (
            <button className="btn btn-ghost btn-sm" onClick={invitePortal} disabled={inviting}>
              {inviting ? <span className="spinner" /> : <><Link2 size={13} /> Invite to portal</>}
            </button>
          ) : (
            <span className="badge badge-green" style={{ alignSelf: 'center' }}><CheckCircle size={12} /> Portal linked</span>
          )}
          {canWarn && (
            <button className="btn btn-ghost btn-sm" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }} onClick={sendWarning} disabled={actionLoading === 'warn'}>
              {actionLoading === 'warn' ? <span className="spinner" /> : <><AlertTriangle size={13} /> Send warning</>}
            </button>
          )}
          {!client.suspended ? (
            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => setSuspending(true)}>
              <Ban size={13} /> Suspend client
            </button>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => setSuspending(true)}>
                <Ban size={13} /> View / Resend Notice
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }} onClick={unsuspendClient} disabled={actionLoading === 'unsuspend'}>
                {actionLoading === 'unsuspend' ? <span className="spinner" /> : <><ShieldOff size={13} /> Restore access</>}
              </button>
            </>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Edit3 size={13} /> Edit</button>
          <Link href={`/time-clock?client=${client.id}`} className="btn btn-ghost btn-sm"><Clock size={13} /> Clock in</Link>
        </div>
      </div>

      {/* Banners */}
      {inviteMsg && (
        <div style={{ marginBottom: '1rem', padding: '10px 16px', borderRadius: 8, fontSize: '0.875rem', background: inviteMsg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: inviteMsg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)', border: `1px solid ${inviteMsg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {inviteMsg.text}
        </div>
      )}
      {actionMsg && (
        <div style={{ marginBottom: '1rem', padding: '10px 16px', borderRadius: 8, fontSize: '0.875rem', background: actionMsg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: actionMsg.type === 'ok' ? '#22c55e' : '#ef4444', border: `1px solid ${actionMsg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {actionMsg.text}
        </div>
      )}
      {client.suspended && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.875rem 1rem', background: alertBg('239,68,68'), border: `1px solid ${alertBorder('239,68,68')}`, borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
          <Ban size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.125rem' }}>Website Services &amp; Portal Suspended</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {client.suspension_reason ?? 'Overdue balance'}
              {client.suspended_at ? ` · since ${formatDate(client.suspended_at)}` : ''}
              {overdueTotal > 0 ? ` · ${formatMoney(overdueTotal)} owed` : ''}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', flexShrink: 0 }}
            onClick={() => setSuspending(true)}
          >
            Review Suspension Notice
          </button>
        </div>
      )}
      {!client.suspended && overdueInvoices.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.875rem 1rem', background: maxDaysOverdue >= 60 ? alertBg('239,68,68') : alertBg('245,158,11'), border: `1px solid ${maxDaysOverdue >= 60 ? alertBorder('239,68,68') : alertBorder('245,158,11')}`, borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} color={maxDaysOverdue >= 60 ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: maxDaysOverdue >= 60 ? '#ef4444' : '#b45309', marginBottom: '0.125rem' }}>
              {maxDaysOverdue >= 60 ? 'Eligible for suspension' : 'Payment overdue'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''} · {formatMoney(overdueTotal)} total · {maxDaysOverdue}d past due
              {client.warning_sent_at ? ` · Warning sent ${formatDate(client.warning_sent_at)}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Info card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.125rem' }}>{client.name}</h2>
            {client.company && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{client.company}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text)', textDecoration: 'none' }}>
                <Mail size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</span>
              </a>
              {client.phone && (
                <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text)', textDecoration: 'none' }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  {client.phone}
                </a>
              )}
              {client.company && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
                  <Building2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)' }}>{client.company}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
                <DollarSign size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)' }}>{formatMoney(PLAN_PRICES[client.plan])}/mo · {formatMoney(client.hourly_rate)}/hr</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
                <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)' }}>Since {formatDate(client.created_at)}</span>
              </div>
            </div>
            {client.notes && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {client.notes}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.625rem' }}>Quick actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <Link href="/messages" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                <MessageCircle size={13} /> Message {client.name.split(' ')[0]}
              </Link>
              <Link href={`/invoices?client=${client.id}`} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                <Receipt size={13} /> View invoices
              </Link>
              <Link href="/contracts" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                <FileText size={13} /> View contracts
              </Link>
              <Link href={`/time-clock?client=${client.id}`} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                <Clock size={13} /> Clock in
              </Link>
              {!client.suspended ? (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', marginTop: '0.25rem' }}
                  onClick={() => setSuspending(true)}
                >
                  <Ban size={13} /> Suspend website / portal
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: 'flex-start', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', marginTop: '0.25rem' }}
                    onClick={() => setSuspending(true)}
                  >
                    <Ban size={13} /> Review suspension notice
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: 'flex-start', color: '#22c55e', borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.06)' }}
                    onClick={unsuspendClient}
                    disabled={actionLoading === 'unsuspend'}
                  >
                    {actionLoading === 'unsuspend' ? <span className="spinner" /> : <><ShieldOff size={13} /> Restore access</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right content */}
        <div>
          {/* Revenue sparkline */}
          <RevenueSparkline invoices={allPaidInvoices} />

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={16} color="#f59e0b" />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(outstanding)}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Outstanding</p>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={16} color="#22c55e" />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(paidThisMonth)}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Paid this mo.</p>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ticket size={16} color="#6366f1" />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{openTickets}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Open tickets</p>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={16} style={{ opacity: 0.5 }} />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{hoursThisMonth.toFixed(1)}h</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Hours this mo.</p>
              </div>
            </div>
          </div>

          {/* Active contract banner */}
          {activeContract && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
              <CheckCircle size={15} color="#22c55e" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)' }}>Active contract:</span>
              <span style={{ fontWeight: 600 }}>{activeContract.title}</span>
              <span className={statusBadgeClass(activeContract.status)} style={{ marginLeft: '0.25rem' }}>{activeContract.status}</span>
              <Link href={`/contracts/${activeContract.id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>View</Link>
            </div>
          )}

          {/* Sections grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

            {/* Invoices */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={15} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Recent Invoices</h3>
                </div>
                <Link href={`/invoices?client=${client.id}`} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>View all</Link>
              </div>
              {invoices.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No invoices yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {invoices.map(inv => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                      <div>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{inv.invoice_number}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Due {formatDate(inv.due_date)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{formatMoney(inv.total)}</p>
                        <span className={statusBadgeClass(inv.status)} style={{ fontSize: '0.7rem' }}>{inv.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Contracts */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={15} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Contracts</h3>
                </div>
                <Link href="/contracts" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>View all</Link>
              </div>
              {contracts.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No contracts yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {contracts.map(c => (
                    <Link key={c.id} href={`/contracts/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.title}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Started {formatDate(c.start_date)}</p>
                      </div>
                      <span className={statusBadgeClass(c.status)} style={{ fontSize: '0.7rem' }}>{c.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tickets */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Ticket size={15} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Tickets</h3>
                </div>
                <Link href="/tickets" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>View all</Link>
              </div>
              {tickets.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No tickets yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {tickets.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDate(t.created_at)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                        <span className={statusBadgeClass(t.priority)} style={{ fontSize: '0.7rem' }}>{t.priority}</span>
                        <span className={statusBadgeClass(t.status)} style={{ fontSize: '0.7rem' }}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time this month */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Time This Month</h3>
                </div>
                <Link href="/time-clock" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Time clock</Link>
              </div>
              {timeEntries.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No time logged this month.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {timeEntries.slice(0, 6).map(e => {
                    const hrs = e.clock_out
                      ? ((new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3_600_000).toFixed(1)
                      : null
                    return (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{formatDate(e.clock_in)}</p>
                          {e.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{e.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {hrs ? <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{hrs}h</p> : <span className="badge badge-blue">Active</span>}
                          {hrs && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatMoney(Number(hrs) * client.hourly_rate)}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <Link href={`/time-clock?client=${client.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '0.875rem' }}>
                <Clock size={12} /> Clock in for this client
              </Link>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <EditModal
          client={client}
          onClose={() => setEditing(false)}
          onSave={() => { setEditing(false); load() }}
        />
      )}

      {suspending && (
        <SuspensionModal
          client={client}
          onClose={() => setSuspending(false)}
          onSuccess={(msg) => {
            setSuspending(false)
            setActionMsg({ type: 'ok', text: msg })
            load()
          }}
        />
      )}
    </>
  )
}
