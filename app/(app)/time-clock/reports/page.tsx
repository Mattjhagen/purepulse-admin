'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatMoney, formatHours, calcDurationHours, calcEarnings } from '@/lib/utils'
import { Download, ChevronLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'

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
  const months = Array.from({ length: 12 }, (_, i) => {
    const label = new Date(year, i, 1).toLocaleString('en-US', { month: 'long' })
    const monthEntries = entries.filter(e => new Date(e.clock_in).getMonth() === i && e.clock_out)
    const hours = monthEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
    const earnings = monthEntries.reduce((s, e) => {
      const h = calcDurationHours(e.clock_in, e.clock_out)
      return s + calcEarnings(h, e.hourly_rate).total
    }, 0)
    return { label, hours, earnings, count: monthEntries.length }
  })

  // By client annual
  type CS = { name: string; hours: number; earnings: number }
  const byClient: Record<string, CS> = {}
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
  const maxMonthEarnings = Math.max(...months.map(m => m.earnings), 1)
  const maxClientEarnings = Math.max(...clientList.map(c => c.earnings), 1)
  const currentMonth = new Date().getMonth()
  const bestMonth = months.reduce((best, m) => m.earnings > best.earnings ? m : best, months[0])

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
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-tile">
          <div className="stat-value">{formatHours(totalHours)}</div>
          <div className="stat-label">Annual Hours</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatMoney(totalEarnings)}</div>
          <div className="stat-label">Annual Earnings</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatHours(avgHoursPerMonth)}</div>
          <div className="stat-label">Avg / Active Month</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{clientList.length}</div>
          <div className="stat-label">Clients Served</div>
        </div>
      </div>

      {/* Best month callout */}
      {bestMonth.earnings > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.875rem', borderColor: 'rgba(99,102,241,0.3)' }}>
          <TrendingUp size={20} color="#6366f1" />
          <p style={{ fontSize: '0.9375rem' }}>
            Best month: <strong>{bestMonth.label}</strong> — {formatHours(bestMonth.hours)} · {formatMoney(bestMonth.earnings)}
          </p>
        </div>
      )}

      {/* Monthly breakdown */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Monthly Breakdown</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: '2rem' }}>
          <table>
            <thead><tr><th>Month</th><th>Sessions</th><th>Hours</th><th>Earnings</th><th style={{ width: '160px' }}></th></tr></thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={m.label} style={{ opacity: m.count === 0 ? 0.45 : 1, fontWeight: i === currentMonth && year === new Date().getFullYear() ? 600 : undefined }}>
                  <td style={{ fontWeight: 500 }}>{m.label}{i === currentMonth && year === new Date().getFullYear() ? <span className="badge badge-blue" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>current</span> : null}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.count || '—'}</td>
                  <td>{m.hours > 0 ? formatHours(m.hours) : '—'}</td>
                  <td style={{ fontWeight: m.earnings > 0 ? 700 : 400 }}>{m.earnings > 0 ? formatMoney(m.earnings) : '—'}</td>
                  <td>
                    {m.earnings > 0 && (
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(m.earnings / maxMonthEarnings) * 100}%`, background: '#6366f1', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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
            <thead><tr><th>Client</th><th>Hours</th><th>Earnings</th><th style={{ width: '160px' }}></th></tr></thead>
            <tbody>
              {clientList.map(c => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{formatHours(c.hours)}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(c.earnings)}</td>
                  <td>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.earnings / maxClientEarnings) * 100}%`, background: '#22c55e', borderRadius: 3, transition: 'width 0.3s' }} />
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
