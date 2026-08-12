'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMoney, formatHours, calcDurationHours, calcEarnings } from '@/lib/utils'
import { Download, ChevronLeft, TrendingUp, Clock, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'

type MonthData = { label: string; shortLabel: string; hours: number; earnings: number; count: number; sessions: number }
type ClientData = { name: string; hours: number; earnings: number }

function MonthlyBarChart({ months, year }: { months: MonthData[]; year: number }) {
  const maxEarnings = Math.max(...months.map(m => m.earnings), 1)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: 96, padding: '0 2px' }}>
      {months.map((m, i) => {
        const pct = m.earnings > 0 ? Math.max((m.earnings / maxEarnings) * 100, 4) : 0
        const isCurrent = i === currentMonth && year === currentYear
        const isPast = year < currentYear || (year === currentYear && i < currentMonth)
        const hasData = m.earnings > 0

        return (
          <div
            key={m.label}
            title={hasData ? `${m.label}: ${formatHours(m.hours)} · ${formatMoney(m.earnings)} (${m.sessions} sessions)` : m.label}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', height: '100%', cursor: hasData ? 'default' : undefined }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              <div style={{
                height: hasData ? `${pct}%` : '2px',
                background: isCurrent
                  ? '#6366f1'
                  : isPast && hasData
                  ? 'rgba(99,102,241,0.45)'
                  : hasData
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.06)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.5s ease',
                boxShadow: isCurrent ? '0 0 12px rgba(99,102,241,0.4)' : undefined,
              }} />
            </div>
            <span style={{
              fontSize: '0.6rem',
              color: isCurrent ? '#6366f1' : 'var(--text-dim)',
              fontWeight: isCurrent ? 700 : 400,
              textAlign: 'center',
            }}>{m.shortLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function TimeReportsPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<Array<{ id: string; clock_in: string; clock_out: string | null; hourly_rate: number; clients: { name: string } | null }>>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('time_entries')
      .select('id, clock_in, clock_out, hourly_rate, clients(name)')
      .eq('user_id', user.id)
      .neq('status', 'voided')
      .gte('clock_in', `${year}-01-01`)
      .lt('clock_in', `${year + 1}-01-01`)
      .order('clock_in')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEntries((data ?? []) as any[])
    setLoading(false)
  }, [supabase, year])

  useEffect(() => { load() }, [load])

  // Monthly breakdown
  const months: MonthData[] = Array.from({ length: 12 }, (_, i) => {
    const label = new Date(year, i, 1).toLocaleString('en-US', { month: 'long' })
    const shortLabel = new Date(year, i, 1).toLocaleString('en-US', { month: 'short' }).slice(0, 3)
    const monthEntries = entries.filter(e => new Date(e.clock_in).getMonth() === i && e.clock_out)
    const hours = monthEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
    const earnings = monthEntries.reduce((s, e) => s + calcEarnings(calcDurationHours(e.clock_in, e.clock_out), e.hourly_rate).total, 0)
    return { label, shortLabel, hours, earnings, count: monthEntries.length, sessions: monthEntries.length }
  })

  // By client annual
  const byClient: Record<string, ClientData> = {}
  for (const e of entries.filter(e => e.clock_out)) {
    const hours = calcDurationHours(e.clock_in, e.clock_out)
    const { total } = calcEarnings(hours, e.hourly_rate)
    const name = (e.clients as { name: string } | null)?.name ?? 'Unknown'
    if (!byClient[name]) byClient[name] = { name, hours: 0, earnings: 0 }
    byClient[name].hours += hours
    byClient[name].earnings += total
  }

  const clientList = Object.values(byClient).sort((a, b) => b.earnings - a.earnings)
  const totalHours = months.reduce((s, m) => s + m.hours, 0)
  const totalEarnings = months.reduce((s, m) => s + m.earnings, 0)
  const activeMonths = months.filter(m => m.hours > 0).length
  const avgHoursPerMonth = activeMonths > 0 ? totalHours / activeMonths : 0
  const maxClientEarnings = Math.max(...clientList.map(c => c.earnings), 1)
  const currentMonthIdx = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const bestMonth = months.reduce((best, m) => m.earnings > best.earnings ? m : best, months[0])

  // Total sessions and avg session length
  const closedEntries = entries.filter(e => e.clock_out)
  const totalSessions = closedEntries.length
  const avgSessionHours = totalSessions > 0
    ? closedEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0) / totalSessions
    : 0

  function exportCSV() {
    const rows = [['Month', 'Sessions', 'Hours', 'Earnings']]
    for (const m of months) {
      rows.push([m.label, String(m.count), m.hours.toFixed(2), m.earnings.toFixed(2)])
    }
    rows.push(['', '', '', ''])
    rows.push(['Client', '', 'Hours', 'Earnings'])
    for (const c of clientList) {
      rows.push([c.name, '', c.hours.toFixed(2), c.earnings.toFixed(2)])
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `time-report-${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const availableYears = Array.from(
    new Set([2024, 2025, 2026, 2027, new Date().getFullYear()])
  ).sort()

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/time-clock" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Time Clock</Link>
            <div>
              <h1>Time Reports</h1>
              <p>Annual and per-client summaries for {year}.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="input input-sm" style={{ width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={18} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatHours(totalHours)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Annual Hours</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={18} color="#22c55e" />
          </div>
          <div>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(totalEarnings)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Annual Earnings</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={18} color="#f59e0b" />
          </div>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatHours(avgHoursPerMonth)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Avg / Month</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={18} style={{ opacity: 0.5 }} />
          </div>
          <div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{clientList.length}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Clients</p>
          </div>
        </div>
      </div>

      {/* Insight callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {bestMonth.earnings > 0 && (
          <div className="card" style={{ borderColor: 'rgba(99,102,241,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <TrendingUp size={15} color="#6366f1" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Month</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>{bestMonth.label}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              {formatHours(bestMonth.hours)} · {formatMoney(bestMonth.earnings)} · {bestMonth.sessions} sessions
            </p>
          </div>
        )}
        {totalSessions > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <Clock size={15} color="#6366f1" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Session</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>{formatHours(avgSessionHours)}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              across {totalSessions} sessions{activeMonths > 0 ? ` · ${activeMonths} active months` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Monthly bar chart */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Monthly Earnings</h2>
          {bestMonth.earnings > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Peak: {formatMoney(bestMonth.earnings)}
            </span>
          )}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <MonthlyBarChart months={months} year={year} />
          </div>
        )}
      </div>

      {/* Monthly breakdown table */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Monthly Breakdown</h2>
      {loading ? null : (
        <div className="table-wrap" style={{ marginBottom: '2rem' }}>
          <table>
            <thead>
              <tr><th>Month</th><th>Sessions</th><th>Hours</th><th>Earnings</th></tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const isCurrent = i === currentMonthIdx && year === currentYear
                return (
                  <tr key={m.label} style={{ opacity: m.count === 0 ? 0.4 : 1 }}>
                    <td style={{ fontWeight: isCurrent ? 700 : 500 }}>
                      {m.label}
                      {isCurrent && <span className="badge badge-blue" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>current</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.count || '—'}</td>
                    <td>{m.hours > 0 ? formatHours(m.hours) : '—'}</td>
                    <td style={{ fontWeight: m.earnings > 0 ? 700 : 400 }}>{m.earnings > 0 ? formatMoney(m.earnings) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* By client */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>By Client</h2>
      {clientList.length === 0 ? (
        <div className="empty-state"><p>No data for {year}.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Client</th><th>Hours</th><th>Earnings</th><th style={{ width: '140px' }}></th></tr></thead>
            <tbody>
              {clientList.map(c => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{formatHours(c.hours)}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(c.earnings)}</td>
                  <td>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.earnings / maxClientEarnings) * 100}%`, background: '#22c55e', borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
