'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatMoney, formatDate, formatHours, calcDurationHours, calcEarnings, getWeekBounds } from '@/lib/utils'
import { PLAN_PRICES } from '@/lib/types'
import {
  Users, DollarSign, FileText, Clock, Ticket, MessageCircle,
  Sparkles, TrendingUp, ArrowRight, CheckCircle, Plus,
  FileCheck, Inbox, UserPlus, Gift, AlertTriangle, Calendar,
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
            {d.value > 0 ? (d.value >= 1000 ? `$${Math.round(d.value / 100) / 10}k` : d.value) : ''}
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

function KpiTile({ label, value, sub, icon: Icon, accent, href, trend }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent: string; href?: string
  trend?: { value: number; label: string }
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
      {trend && (
        <p style={{ fontSize: '0.75rem', marginTop: '0.375rem', color: trend.value >= 0 ? '#10b981' : '#ef4444', fontWeight: 500 }}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
      {sub && !trend && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>{sub}</p>}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

// ─── Activity feed ────────────────────────────────────────────────────────────

type ActivityItem = {
  id: string
  icon: React.ElementType
  accent: string
  title: string
  sub: string
  time: string
  ts: number
  href?: string
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No recent activity.</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {items.map((item, i) => {
        const Icon = item.icon
        const inner = (
          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            padding: '0.75rem 0',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `${item.accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
            }}>
              <Icon size={14} color={item.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{item.sub}</p>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: '3px' }}>{item.time}</span>
          </div>
        )
        return item.href ? (
          <Link key={item.id} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
        ) : (
          <div key={item.id}>{inner}</div>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  return formatDate(iso)
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type MonthBucket = { label: string; value: number }

type ExpiringContract = {
  id: string
  clientName: string
  endDate: string
  daysLeft: number
  plan: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // Identity
  const [userName, setUserName] = useState('')

  // KPIs
  const [mrr, setMrr] = useState(0)
  const [mrrTrend, setMrrTrend] = useState<number | null>(null)
  const [activeClients, setActiveClients] = useState(0)
  const [pendingRevenue, setPendingRevenue] = useState(0)
  const [publishedThisMonth, setPublishedThisMonth] = useState(0)
  const [openTickets, setOpenTickets] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [newLeads, setNewLeads] = useState(0)

  // Alerts
  const [overdueInvoices, setOverdueInvoices] = useState<{ id: string; clientId: string; clientName: string; total: number; daysOverdue: number }[]>([])
  const [urgentTicketCount, setUrgentTicketCount] = useState(0)

  // Time tracking
  const [weekHours, setWeekHours] = useState(0)
  const [weekEarnings, setWeekEarnings] = useState(0)
  const [activeSession, setActiveSession] = useState(false)

  // Referrals
  const [referralConversions, setReferralConversions] = useState(0)
  const [referralOwed, setReferralOwed] = useState(0)
  const [activeReferrers, setActiveReferrers] = useState(0)

  // Revenue trend (6 months)
  const [revenueByMonth, setRevenueByMonth] = useState<MonthBucket[]>([])

  // Invoice breakdown
  const [invoiceBreakdown, setInvoiceBreakdown] = useState<{ label: string; value: number; amount: number; color: string }[]>([])

  // Deliverables
  const [delivByStatus, setDelivByStatus] = useState<{ label: string; value: number; color: string }[]>([])
  const [delivByType, setDelivByType] = useState<{ label: string; value: number; color: string }[]>([])
  const [totalDelivs, setTotalDelivs] = useState(0)

  // Clients
  const [clientsByPlan, setClientsByPlan] = useState<{ label: string; value: number; color: string }[]>([])
  const [clientsByStatus, setClientsByStatus] = useState<{ active: number; inactive: number; prospect: number }>({ active: 0, inactive: 0, prospect: 0 })

  // Tickets
  const [ticketsByPriority, setTicketsByPriority] = useState<{ label: string; value: number; color: string }[]>([])

  // Campaigns
  const [campaignStats, setCampaignStats] = useState<{ active: number; completed: number; draft: number }>({ active: 0, completed: 0, draft: 0 })

  // Feed data
  const [recentTickets, setRecentTickets] = useState<{ id: string; subject: string; priority: string; clientName: string }[]>([])
  const [pendingInvoices, setPendingInvoices] = useState<{ id: string; invoiceNumber: string; clientName: string; total: number; status: string }[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([])

  const load = useCallback(async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString()
    const { start: weekStart, end: weekEnd } = getWeekBounds(now)
    const { data: { user } } = await supabase.auth.getUser()
    const rawName = user?.user_metadata?.full_name
      ?? user?.user_metadata?.name
      ?? user?.email?.split('@')[0]
      ?? ''
    setUserName(rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '')

    const [
      clientsRes,
      contractsRes,
      invoicesAllRes,
      invoicesPaidRes,
      invoicesLastMonthRes,
      delivRes,
      ticketsRes,
      messagesRes,
      campaignsRes,
      leadsRes,
      recentClientsRes,
      recentContractsRes,
      timeEntriesRes,
      activeSessionRes,
      referralsRes,
      expiringContractsRes,
    ] = await Promise.all([
      supabase.from('clients').select('id, plan, status'),
      supabase.from('contracts').select('monthly_rate, status'),
      supabase.from('invoices').select('id, status, total, invoice_number, due_date, client_id, updated_at, created_at, clients(name)'),
      supabase.from('invoices').select('paid_at, total').eq('status', 'paid').gte('paid_at', sixMonthsAgo),
      supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', lastMonthStart).lt('paid_at', monthStart),
      supabase.from('deliverables').select('status, type, published_at'),
      supabase.from('tickets').select('id, subject, priority, status, clients(name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('client_messages').select('id').eq('sender', 'client').is('read_at', null),
      supabase.from('campaigns').select('status'),
      supabase.from('leads').select('id, name, status, created_at').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name, status, created_at').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
      supabase.from('contracts').select('id, status, signed_at, clients(name)').not('signed_at', 'is', null).gte('signed_at', sevenDaysAgo).order('signed_at', { ascending: false }),
      user ? supabase.from('time_entries').select('clock_in, clock_out, hourly_rate').eq('user_id', user.id).neq('status', 'voided').gte('clock_in', weekStart.toISOString()).lte('clock_in', weekEnd.toISOString()) : Promise.resolve({ data: [] }),
      user ? supabase.from('time_entries').select('id').eq('user_id', user.id).is('clock_out', null).limit(1) : Promise.resolve({ data: [] }),
      supabase.from('referrals').select('active, conversions, total_earned, total_paid'),
      supabase.from('contracts').select('id, end_date, plan, clients(name)').in('status', ['signed', 'active']).not('end_date', 'is', null).gte('end_date', now.toISOString()).lte('end_date', thirtyDaysFromNow),
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

    const overdue = invoices.filter(i => i.status === 'overdue')
    setOverdueInvoices(
      overdue.slice(0, 10).map(i => {
        const due = new Date(i.due_date ?? i.created_at)
        const daysOverdue = Math.floor((now.getTime() - due.getTime()) / 86_400_000)
        return { id: i.id, clientId: i.client_id ?? '', clientName: i.clients?.name ?? '—', total: i.total, daysOverdue }
      }).sort((a, b) => b.daysOverdue - a.daysOverdue)
    )

    const invStatusColors: Record<string, string> = {
      paid: '#10b981', sent: '#f59e0b', overdue: '#ef4444', draft: '#6b7280',
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

    // ── Revenue trend ──
    const paidInvoices = invoicesPaidRes.data ?? []
    const thisMonthRevenue = paidInvoices
      .filter(i => i.paid_at && i.paid_at >= monthStart)
      .reduce((s, i) => s + (i.total ?? 0), 0)
    const lastMonthRevenue = (invoicesLastMonthRes.data ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
    if (lastMonthRevenue > 0) {
      setMrrTrend(Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100))
    }

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
    setTotalDelivs(delivs.length)
    setPublishedThisMonth(
      delivs.filter(d => d.published_at && d.published_at >= monthStart).length
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ticketsData = (ticketsRes.data ?? []) as any[]
    setOpenTickets(ticketsData.filter(t => ['open', 'in_progress'].includes(t.status)).length)
    setRecentTickets(
      ticketsData.filter(t => ['open', 'in_progress'].includes(t.status)).slice(0, 5).map(t => ({
        id: t.id, subject: t.subject, priority: t.priority, clientName: t.clients?.name ?? '—',
      }))
    )
    setUrgentTicketCount(ticketsData.filter(t => ['open', 'in_progress'].includes(t.status) && ['urgent', 'high'].includes(t.priority)).length)

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

    // ── Leads ──
    const leads = leadsRes.data ?? []
    setNewLeads(leads.length)

    // ── Time tracking ──
    const timeEntries = (timeEntriesRes.data ?? []) as { clock_in: string; clock_out: string | null; hourly_rate: number }[]
    const closedEntries = timeEntries.filter(e => e.clock_out)
    const wHours = closedEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
    const wEarnings = closedEntries.reduce((s, e) => {
      const h = calcDurationHours(e.clock_in, e.clock_out)
      return s + calcEarnings(h, e.hourly_rate).total
    }, 0)
    setWeekHours(wHours)
    setWeekEarnings(wEarnings)
    setActiveSession((activeSessionRes.data ?? []).length > 0)

    // ── Referrals ──
    const refs = (referralsRes.data ?? []) as { active: boolean; conversions: number; total_earned: number; total_paid: number }[]
    setActiveReferrers(refs.filter(r => r.active).length)
    setReferralConversions(refs.reduce((s, r) => s + r.conversions, 0))
    setReferralOwed(refs.reduce((s, r) => s + (r.total_earned - r.total_paid), 0))

    // ── Expiring contracts ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiring = (expiringContractsRes.data ?? []) as any[]
    setExpiringContracts(
      expiring.map(c => {
        const end = new Date(c.end_date)
        const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: c.id,
          clientName: c.clients?.name ?? '—',
          endDate: c.end_date,
          daysLeft: days,
          plan: c.plan,
        }
      }).sort((a, b) => a.daysLeft - b.daysLeft)
    )

    // ── Activity feed ──
    const activity: ActivityItem[] = []

    const recentPaid = invoices.filter(i => i.status === 'paid' && (i.updated_at ?? i.created_at) >= sevenDaysAgo).slice(0, 3)
    for (const inv of recentPaid) {
      const ts = new Date(inv.updated_at ?? inv.created_at).getTime()
      activity.push({
        id: `inv-${inv.id}`,
        icon: DollarSign, accent: '#10b981',
        title: `Invoice paid — ${formatMoney(inv.total)}`,
        sub: inv.clients?.name ?? 'Unknown client',
        time: relTime(inv.updated_at ?? inv.created_at),
        ts,
        href: `/invoices/${inv.id}`,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentSigned = (recentContractsRes.data ?? []) as any[]
    for (const c of recentSigned.slice(0, 2)) {
      activity.push({
        id: `contract-${c.id}`,
        icon: FileCheck, accent: '#22c55e',
        title: 'Contract signed',
        sub: c.clients?.name ?? 'Unknown client',
        time: relTime(c.signed_at),
        ts: new Date(c.signed_at).getTime(),
        href: `/contracts/${c.id}`,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentClients = (recentClientsRes.data ?? []) as any[]
    for (const c of recentClients.slice(0, 3)) {
      activity.push({
        id: `client-${c.id}`,
        icon: UserPlus, accent: '#3b82f6',
        title: `New client: ${c.name}`,
        sub: c.status,
        time: relTime(c.created_at),
        ts: new Date(c.created_at).getTime(),
        href: `/clients`,
      })
    }

    for (const l of leads.slice(0, 3)) {
      activity.push({
        id: `lead-${l.id}`,
        icon: Inbox, accent: '#f59e0b',
        title: `New lead: ${l.name}`,
        sub: l.status,
        time: relTime(l.created_at),
        ts: new Date(l.created_at).getTime(),
        href: `/leads`,
      })
    }

    activity.sort((a, b) => b.ts - a.ts)
    setActivityFeed(activity.slice(0, 8))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const maxDelivStatus = Math.max(...delivByStatus.map(d => d.value), 1)
  const maxDelivType = Math.max(...delivByType.map(d => d.value), 1)
  const maxTicket = Math.max(...ticketsByPriority.map(t => t.value), 1)
  const maxPlan = Math.max(...clientsByPlan.map(p => p.value), 1)
  const maxInvAmount = Math.max(...invoiceBreakdown.map(i => i.amount), 1)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <>
        <div className="page-header"><h1>Dashboard</h1><p>Loading…</p></div>
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      </>
    )
  }

  return (
    <>
      {/* ── Greeting ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>{greeting()}{userName ? `, ${userName}` : ''}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/invoices" className="btn btn-ghost btn-sm"><Plus size={13} /> Invoice</Link>
          <Link href="/contracts" className="btn btn-ghost btn-sm"><Plus size={13} /> Contract</Link>
          <Link href="/tickets" className="btn btn-ghost btn-sm"><Plus size={13} /> Ticket</Link>
          <Link href="/referrals" className="btn btn-ghost btn-sm"><Gift size={13} /> Affiliates</Link>
          <Link href="/clients" className="btn btn-primary btn-sm"><Plus size={13} /> Client</Link>
        </div>
      </div>

      {/* ── Expiring contracts alert ── */}
      {expiringContracts.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '12px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.375rem' }}>
              {expiringContracts.length} contract{expiringContracts.length !== 1 ? 's' : ''} expiring within 30 days
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {expiringContracts.map(c => (
                <Link key={c.id} href={`/contracts/${c.id}`} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                  <strong>{c.clientName}</strong> — {c.daysLeft === 0 ? 'expires today' : `${c.daysLeft}d left`}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/contracts" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
            <Calendar size={13} /> View all
          </Link>
        </div>
      )}

      {/* ── Overdue invoices alert — two tiers ── */}
      {overdueInvoices.length > 0 && (() => {
        const suspendTier = overdueInvoices.filter(i => i.daysOverdue >= 60)
        const warnTier = overdueInvoices.filter(i => i.daysOverdue >= 30 && i.daysOverdue < 60)
        const minorTier = overdueInvoices.filter(i => i.daysOverdue < 30)
        return (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {suspendTier.length > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.28)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.375rem' }}>
                    Suspension eligible — {suspendTier.length} invoice{suspendTier.length !== 1 ? 's' : ''} 60+ days overdue
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {suspendTier.map(inv => (
                      <span key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Link href={`/clients/${inv.clientId}`} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                          <strong>{inv.clientName}</strong> — {formatMoney(inv.total)} (+{inv.daysOverdue}d)
                        </Link>
                      </span>
                    ))}
                  </div>
                </div>
                <Link href="/clients" className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                  Manage clients
                </Link>
              </div>
            )}
            {warnTier.length > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#b45309', marginBottom: '0.375rem' }}>
                    Warning overdue — {warnTier.length} invoice{warnTier.length !== 1 ? 's' : ''} 30–59 days overdue
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {warnTier.map(inv => (
                      <Link key={inv.id} href={`/clients/${inv.clientId}`} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                        <strong>{inv.clientName}</strong> — {formatMoney(inv.total)} (+{inv.daysOverdue}d)
                      </Link>
                    ))}
                  </div>
                </div>
                <Link href="/clients" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                  Manage clients
                </Link>
              </div>
            )}
            {minorTier.length > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.875rem', flex: 1, color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>{minorTier.length} invoice{minorTier.length !== 1 ? 's' : ''}</span> overdue (under 30 days) — {formatMoney(minorTier.reduce((s, i) => s + i.total, 0))}
                </p>
                <Link href="/invoices" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>View invoices</Link>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Urgent tickets alert ── */}
      {urgentTicketCount > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Ticket size={15} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.875rem', flex: 1 }}>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>{urgentTicketCount} urgent/high priority ticket{urgentTicketCount !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>need attention</span>
          </p>
          <Link href="/tickets" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>View tickets</Link>
        </div>
      )}

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
        <KpiTile label="Monthly Recurring" value={formatMoney(mrr)} sub="from active contracts" icon={DollarSign} accent="#10b981"
          trend={mrrTrend !== null ? { value: mrrTrend, label: 'vs last month' } : undefined} />
        <KpiTile label="Active Clients" value={activeClients} sub={`${clientsByStatus.prospect} prospects`} icon={Users} accent="#3b82f6" href="/clients" />
        <KpiTile label="Pending Revenue" value={formatMoney(pendingRevenue)} sub="sent + overdue" icon={FileText} accent="#f59e0b" href="/invoices" />
        <KpiTile label="Week Hours" value={formatHours(weekHours)} sub={activeSession ? '● Session active' : weekEarnings > 0 ? formatMoney(weekEarnings) : 'this week'} icon={Clock} accent={activeSession ? '#22c55e' : '#6366f1'} href="/time-clock" />
        <KpiTile label="Open Tickets" value={openTickets} sub="open + in progress" icon={Ticket} accent="#ef4444" href="/tickets" />
        <KpiTile label="Unread Messages" value={unreadMessages} sub="from clients" icon={MessageCircle} accent="#f472b6" href="/messages" />
        <KpiTile label="New Leads" value={newLeads} sub="last 7 days" icon={Inbox} accent="#f59e0b" href="/leads" />
        <KpiTile label="Published" value={publishedThisMonth} sub="this month" icon={CheckCircle} accent="#7B2FFF" href="/calendar" />
      </div>

      {/* ── Revenue ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
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
                value={inv.amount} max={maxInvAmount} color={inv.color} format={formatMoney}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Content pipeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
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

      {/* ── Bottom row: Clients + Tickets + Referrals + Campaigns + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Clients by plan */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Clients by Plan</p>
            <Link href="/clients" className="btn btn-ghost btn-sm">View <ArrowRight size={12} /></Link>
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentTickets.slice(0, 3).map(t => (
              <Link key={t.id} href={`/tickets/${t.id}`} style={{ textDecoration: 'none' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.clientName}</p>
              </Link>
            ))}
            {recentTickets.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No open tickets.</p>}
          </div>
        </div>

        {/* Referrals */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Referrals</p>
            <Link href="/referrals" className="btn btn-ghost btn-sm">View <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: '#6366f1' }}>{activeReferrers}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Referrers</p>
            </div>
            <div style={{ padding: '0.625rem', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: '#22c55e' }}>{referralConversions}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Signups</p>
            </div>
            <div style={{ padding: '0.625rem', borderRadius: 8, background: referralOwed > 0 ? 'rgba(245,158,11,0.06)' : undefined, border: referralOwed > 0 ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border)' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: referralOwed > 0 ? '#f59e0b' : undefined }}>{formatMoney(referralOwed)}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Owed</p>
            </div>
          </div>
          {referralOwed > 0 && (
            <Link href="/referrals" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Pay commissions <ArrowRight size={12} />
            </Link>
          )}
          {activeReferrers === 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No active referrers yet. <Link href="/referrals" style={{ color: '#6366f1' }}>Add one →</Link></p>
          )}
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

        {/* Recent activity */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Recent Activity</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Last 7 days</p>
          <ActivityFeed items={activityFeed} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
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
