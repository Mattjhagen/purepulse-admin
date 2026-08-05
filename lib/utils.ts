import { Plan, PLAN_LABELS } from './types'

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function formatMoney(dollars: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(date))
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function calcDurationHours(start: string, end: string | null | undefined, breaks: { break_start: string; break_end?: string | null }[] = []): number {
  if (!end) return 0
  const totalMs = new Date(end).getTime() - new Date(start).getTime()
  const breakMs = breaks.reduce((acc, b) => {
    if (!b.break_end) return acc
    return acc + (new Date(b.break_end).getTime() - new Date(b.break_start).getTime())
  }, 0)
  return Math.max(0, (totalMs - breakMs) / 3_600_000)
}

export function calcEarnings(hours: number, rate: number, overtimeThreshold = 8, overtimeMultiplier = 1.5): { regular: number; overtime: number; total: number } {
  if (hours <= overtimeThreshold) {
    return { regular: hours * rate, overtime: 0, total: hours * rate }
  }
  const regular = overtimeThreshold * rate
  const overtime = (hours - overtimeThreshold) * rate * overtimeMultiplier
  return { regular, overtime, total: regular + overtime }
}

export function getWeekBounds(date = new Date()): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d.setDate(diff))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `PP-${year}${month}-${rand}`
}

export function planBadgeClass(plan: Plan): string {
  const map: Record<Plan, string> = {
    starter: 'badge-white plan-starter',
    growth: 'badge-blue plan-growth',
    premium: 'badge-amber plan-premium',
    business: 'badge-green plan-business',
  }
  return `badge ${map[plan]}`
}

export function planLabel(plan: Plan): string {
  return PLAN_LABELS[plan]
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-green', open: 'badge-blue', paid: 'badge-green',
    closed: 'badge-white', resolved: 'badge-green', signed: 'badge-green',
    sent: 'badge-blue', draft: 'badge-white', in_progress: 'badge-amber',
    blocked: 'badge-red', overdue: 'badge-red', void: 'badge-white',
    voided: 'badge-white', submitted: 'badge-green', inactive: 'badge-white',
    prospect: 'badge-amber', urgent: 'badge-red', high: 'badge-red',
    medium: 'badge-amber', low: 'badge-white', expired: 'badge-white',
    terminated: 'badge-red', filed: 'badge-green',
  }
  return `badge ${map[status] ?? 'badge-white'}`
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
