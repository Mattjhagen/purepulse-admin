'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatMoney } from '@/lib/utils'
import { PLAN_PRICES } from '@/lib/types'
import {
  Users, DollarSign, FileText, Clock, Ticket, MessageCircle,
  Sparkles, TrendingUp, ArrowRight, CheckCircle,
} from 'lucide-react'

// ─── Chart primitives ────────────────────────────────────────────────────────

function BarChart({ data, height = 120 }: {
  data: { label: string; value: number; color?: string }[]
  height?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barH = height - 22
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}>
            {d.value > 0 ? d.value : ''}
          </span>
          <div style={{
            width: '100%',
            height: `${Math.max((d.value / max) * barH, d.value > 0 ? 3 : 0)}px`,
            background: d.color ?? '#7B2FFF',
            borderRadius: '4px 4px 0 0',
            opacity: d.value === 0 ? 0.15 : 1,
          }} />
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function HorizBar({ label, value, max, color, format }: {
  label: string; value: number; max: number; color: string; format?: (v: number) => string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: '0.625rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '0.8125rem' }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {format ? format(value) : value}
        </span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '100px', height: '5px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '100px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, icon: Icon, accent, href }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent: string; href?: string
}) {
  const content = (
    <div className="card" style={{ padding: '1.125rem 1.25rem', textDecoration: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <div style={{ padding: '6px', borderRadius: '8px', background: `${accent}18` }}>
          <Icon size={15} color={accent} strokeWidth={2} />
        </div>
      </div>
      <p style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>{sub}</p>}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type MonthBucket = { label: string; value: number }

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // KPIs
  const [mrr, setMrr] = useState(0)
  const [activeClients, setActiveClients] = useState(0)
  const [pendingRevenue, setPendingRevenue] = useState(0)
  const [publishedThisMonth, setPublishedThisMonth] = useState(0)
  const [openTickets, setOpenTickets] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Revenue trend (6 months)
  const [revenueByMonth, setRevenueByMonth] = useState<MonthBucket[]>([])

  // Invoice breakdown
  const [invoiceBreakdown, setInvoiceBreakdown] = useState<{ label: string; value: number; amount: number; color: string }[]>([])

  // Deliverables
  const [delivByStatus, setDelivByStatus] = useState<{ label: string; value: number; color: string }[]>([])
  const [delivByType, setDelivByType] = useState<{ label: string; value: number; color: string }[]>([])

  // Clients
  const [clientsByPlan, setClientsByPlan] = useState<{ label: string; value: number; color: string }[]>([])
  const [clientsByStatus, setClientsByStatus] = useState<{ active: number; inactive: number; prospect: number }>({ active: 0, inactive: 0, prospect: 0 })

  // Tickets
  const [ticketsByPriority, setTicketsByPriority] = useState<{ label: string; value: number; color: string }[]>([])

  // Campaigns
  const [campaignStats, setCampaignStats] = useState<{ active: number; completed: number; draft: number }>({ active: 0, completed: 0, draft: 0 })

  // Recent data for feed
  const [recentTickets, setRecentTickets] = useState<{ id: string; subject: string; priority: string; clientName: string }[]>([])
  const [pendingInvoices, setPendingInvoices] = useState<{ id: string; invoiceNumber: string; clientName: string; total: number; status: string }[]>([])

  const load = useCallback(async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

    const [
      clientsRes,
      contractsRes,
      invoicesAllRes,
      invoicesPaidRes,
      delivRes,
      ticketsRes,
      messagesRes,
      campaignsRes,
    ] = await Promise.all([
      supabase.from('clients').select('id, plan, status'),
      supabase.from('contracts').select('monthly_rate, status'),
      supabase.from('invoices').select('id, status, total, invoice_number, clients(name)'),
      supabase.from('invoices').select('paid_at, total').eq('status', 'paid').gte('paid_at', sixMonthsAgo),
      supabase.from('deliverables').select('status, type, published_at'),
      supabase.from('tickets').select('id, subject, priority, status, clients(name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('client_messages').select('id').eq('sender', 'client').is('read_at', null),
      supabase.from('campaigns').select('status'),
    ])

    // ── Clients ──
    const clients = clientsRes.data ?? []
    const active = clients.filter(c => c.status === 'active')
    setActiveClients(active.length)
    setClientsByStatus({
      active: active.length,
      inactive: clients.filter(c => c.status === 'inactive').length,
      prospect: clients.filter(c => c.status === 'prospect').length,
    })

    // MRR: prefer contracts monthly_rate, fallback to plan prices
    const contracts = contractsRes.data ?? []
    const contractMrr = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.monthly_rate ?? 0), 0)
    const planMrr = active.reduce((sum, c) => sum + (PLAN_PRICES[c.plan as keyof typeof PLAN_PRICES] ?? 0), 0)
    setMrr(contractMrr > 0 ? contractMrr : planMrr)

    const planColors: Record<string, string> = {
      starter: '#6b7280', growth: '#3b82f6', premium: '#8b5cf6', business: '#f59e0b',
    }
    const planCounts: Record<string, number> = {}
    for (const c of active) {
      planCounts[c.plan ?? 'unknown'] = (planCounts[c.plan ?? 'unknown'] ?? 0) + 1
    }
    setClientsByPlan(
      Object.entries(planCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([plan, count]) => ({ label: plan, value: count, color: planColors[plan] ?? '#6b7280' }))
    )

    // ── Invoices ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = (invoicesAllRes.data ?? []) as any[]
    const pending = invoices.filter(i => ['sent', 'overdue'].includes(i.status))
    setPendingRevenue(pending.reduce((s, i) => s + (i.total ?? 0), 0))
    setPendingInvoices(pending.slice(0, 5).map(i => ({
      id: i.id,
      invoiceNumber: i.invoice_number,
      clientName: i.clients?.name ?? '—',
      total: i.total,
      status: i.status,
    })))

    const invStatusColors: Record<string, string> = {
      paid: '#10b981', sent: '#f59e0b', overdue: '#ef4444', draft: '#6b7280', void: '#374151',
    }
    const invGroups: Record<string, { count: number; amount: number }> = {}
    for (const inv of invoices) {
      const g = invGroups[inv.status] ?? { count: 0, amount: 0 }
      g.count++; g.amount += inv.total ?? 0
      invGroups[inv.status] = g
    }
    setInvoiceBreakdown(
      ['paid', 'sent', 'overdue', 'draft'].map(s => ({
        label: s, value: invGroups[s]?.count ?? 0,
        amount: invGroups[s]?.amount ?? 0, color: invStatusColors[s],
      }))
    )

    // ── Revenue by month ──
    const paidInvoices = invoicesPaidRes.data ?? []
    const months: MonthBucket[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short' })
      const value = paidInvoices
        .filter(inv => inv.paid_at && inv.paid_at.startsWith(key))
        .reduce((sum, inv) => sum + (inv.total ?? 0), 0)
      months.push({ label, value })
    }
    setRevenueByMonth(months)

    // ── Deliverables ──
    const delivs = delivRes.data ?? []
    const nowTs = new Date()
    setPublishedThisMonth(
      delivs.filter(d => d.published_at && new Date(d.published_at) >= new Date(nowTs.getFullYear(), nowTs.getMonth(), 1)).length
    )

    const statusOrder = ['ai_generated', 'in_review', 'revision_requested', 'approved', 'scheduled', 'published']
    const statusColors: Record<string, string> = {
      ai_generated: '#6b7280', in_review: '#f59e0b', revision_requested: '#ef4444',
      approved: '#10b981', scheduled: '#3b82f6', published: '#7B2FFF',
    }
    const statusLabels: Record<string, string> = {
      ai_generated: 'AI Draft', in_review: 'In Review', revision_requested: 'Revision',
      approved: 'Approved', scheduled: 'Scheduled', published: 'Published',
    }
    const statusCounts: Record<string, number> = {}
    for (const d of delivs) {
      statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1
    }
    setDelivByStatus(statusOrder.map(s => ({
      label: statusLabels[s] ?? s, value: statusCounts[s] ?? 0, color: statusColors[s],
    })))

    const typeColors: Record<string, string> = {
      social_post: '#818cf8', blog_post: '#60a5fa', email: '#34d399',
      ad_copy: '#f59e0b', webpage: '#fb923c', video_script: '#f472b6',
      graphic_brief: '#a78bfa', seo_report: '#4ade80', strategy_doc: '#22d3ee', analytics_report: '#94a3b8',
    }
    const typeCounts: Record<string, number> = {}
    for (const d of delivs) {
      typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1
    }
    setDelivByType(
      Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([type, count]) => ({
          label: type.replace(/_/g, ' '), value: count, color: typeColors[type] ?? '#6b7280',
        }))
    )

    // ── Tickets ──
    const ticketsData = ticketsRes.data ?? []
    const openCount = ticketsData.filter(t => ['open', 'in_progress'].includes(t.status)).length
    setOpenTickets(openCount)
    setRecentTickets(
      ticketsData.filter(t => ['open', 'in_progress'].includes(t.status)).slice(0, 5).map(t => ({
        id: t.id,
        subject: t.subject,
        priority: t.priority,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clientName: (t.clients as any)?.name ?? '—',
      }))
    )
    const priorityColors: Record<string, string> = {
      urgent: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280',
    }
    const priCounts: Record<string, number> = {}
    for (const t of ticketsData.filter(t => ['open', 'in_progress'].includes(t.status))) {
      priCounts[t.priority] = (priCounts[t.priority] ?? 0) + 1
    }
    setTicketsByPriority(
      ['urgent', 'high', 'medium', 'low'].map(p => ({
        label: p, value: priCounts[p] ?? 0, color: priorityColors[p],
      }))
    )

    // ── Messages ──
    setUnreadMessages((messagesRes.data ?? []).length)

    // ── Campaigns ──
    const camps = campaignsRes.data ?? []
    setCampaignStats({
      active: camps.filter(c => c.status === 'active').length,
      completed: camps.filter(c => c.status === 'completed').length,
      draft: camps.filter(c => c.status === 'draft').length,
    })

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const totalDelivs = delivByStatus.reduce((s, d) => s + d.value, 0)
  const maxDelivStatus = Math.max(...delivByStatus.map(d => d.value), 1)
  const maxDelivType = Math.max(...delivByType.map(d => d.value), 1)
  const maxTicket = Math.max(...ticketsByPriority.map(t => t.value), 1)
  const maxPlan = Math.max(...clientsByPlan.map(p => p.value), 1)
  const maxInvAmount = Math.max(...invoiceBreakdown.map(i => i.amount), 1)

  if (loading) {
    return (
      <>
        <div className="page-header"><h1>Dashboard</h1><p>Loading analytics…</p></div>
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Agency overview — all the numbers in one place.</p>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
        <KpiTile label="Monthly Recurring" value={formatMoney(mrr)} sub="from active contracts" icon={DollarSign} accent="#10b981" />
        <KpiTile label="Active Clients" value={activeClients} sub={`${clientsByStatus.prospect} prospects`} icon={Users} accent="#3b82f6" href="/clients" />
        <KpiTile label="Pending Revenue" value={formatMoney(pendingRevenue)} sub="sent + overdue" icon={FileText} accent="#f59e0b" href="/invoices" />
        <KpiTile label="Published This Month" value={publishedThisMonth} sub="deliverables live" icon={CheckCircle} accent="#7B2FFF" href="/calendar" />
        <KpiTile label="Open Tickets" value={openTickets} sub="open + in progress" icon={Ticket} accent="#ef4444" href="/tickets" />
        <KpiTile label="Unread Messages" value={unreadMessages} sub="from clients" icon={MessageCircle} accent="#f472b6" href="/messages" />
      </div>

      {/* ── Revenue ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Revenue trend */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue Collected</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>Last 6 months</p>
            </div>
            <TrendingUp size={16} color="var(--text-muted)" />
          </div>
          <BarChart data={revenueByMonth.map(m => ({ ...m, color: '#7B2FFF' }))} height={130} />
        </div>

        {/* Invoice status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice Breakdown</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>By status</p>
            </div>
            <Link href="/invoices" className="btn btn-ghost btn-sm">View all <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invoiceBreakdown.map(inv => (
              <HorizBar
                key={inv.label}
                label={`${inv.label.charAt(0).toUpperCase()}${inv.label.slice(1)} (${inv.value})`}
                value={inv.amount}
                max={maxInvAmount}
                color={inv.color}
                format={formatMoney}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Content pipeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Deliverables by status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content Pipeline</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>{totalDelivs} deliverables total</p>
            </div>
            <Sparkles size={16} color="var(--text-muted)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {delivByStatus.map(d => (
              <HorizBar key={d.label} label={d.label} value={d.value} max={maxDelivStatus} color={d.color} />
            ))}
          </div>
        </div>

        {/* Deliverables by type */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Content by Type</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>Top types</p>
            </div>
            <Link href="/campaigns" className="btn btn-ghost btn-sm">Campaigns <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {delivByType.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No deliverables yet.</p>
              : delivByType.map(d => (
                <HorizBar key={d.label} label={d.label} value={d.value} max={maxDelivType} color={d.color} />
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Clients + Tickets + Campaigns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Clients by plan */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Clients by Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {clientsByPlan.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active clients.</p>
              : clientsByPlan.map(p => (
                <HorizBar key={p.label} label={`${p.label.charAt(0).toUpperCase()}${p.label.slice(1)}`} value={p.value} max={maxPlan} color={p.color} />
              ))
            }
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 800 }}>{clientsByStatus.active}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 800 }}>{clientsByStatus.prospect}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Prospects</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 800 }}>{clientsByStatus.inactive}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Inactive</p>
            </div>
          </div>
        </div>

        {/* Tickets by priority */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Tickets</p>
            <Link href="/tickets" className="btn btn-ghost btn-sm">View <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {ticketsByPriority.map(t => (
              <HorizBar key={t.label} label={`${t.label.charAt(0).toUpperCase()}${t.label.slice(1)}`} value={t.value} max={maxTicket} color={t.color} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {recentTickets.slice(0, 3).map(t => (
              <Link key={t.id} href={`/tickets/${t.id}`} style={{ textDecoration: 'none' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.clientName}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Campaign health */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaigns</p>
            <Link href="/campaigns" className="btn btn-ghost btn-sm">View <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '0.75rem 0.5rem', background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{campaignStats.active}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active</p>
            </div>
            <div className="card" style={{ padding: '0.75rem 0.5rem', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{campaignStats.completed}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Done</p>
            </div>
            <div className="card" style={{ padding: '0.75rem 0.5rem' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{campaignStats.draft}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Draft</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <HorizBar label="Published" value={publishedThisMonth} max={Math.max(totalDelivs, 1)} color="#7B2FFF" />
            <HorizBar label="Scheduled" value={delivByStatus.find(d => d.label === 'Scheduled')?.value ?? 0} max={Math.max(totalDelivs, 1)} color="#3b82f6" />
            <HorizBar label="In Review" value={delivByStatus.find(d => d.label === 'In Review')?.value ?? 0} max={Math.max(totalDelivs, 1)} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* ── Pending invoices feed ── */}
      {pendingInvoices.length > 0 && (
        <div>
          <div className="section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} /> Pending Invoices
            </h2>
            <Link href="/invoices" className="btn btn-ghost btn-sm">All invoices <ArrowRight size={13} /></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
            {pendingInvoices.map(inv => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '0.875rem 1rem' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{inv.clientName}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{inv.invoiceNumber}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700 }}>{formatMoney(inv.total)}</p>
                  <span className={inv.status === 'overdue' ? 'badge badge-red' : 'badge badge-amber'} style={{ marginTop: '2px' }}>{inv.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
