'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { TimeEntry } from '@/lib/types'
import { formatMoney, formatHours, calcDurationHours, calcEarnings, getWeekBounds } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react'

type ViewMode = 'weekly' | 'daily' | 'all'

export default function TimesheetsPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<(TimeEntry & { clients: { name: string; hourly_rate: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)

  const { start, end } = (() => {
    const base = new Date()
    base.setDate(base.getDate() - weekOffset * 7)
    return getWeekBounds(base)
  })()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('time_entries')
      .select('*, clients(name, hourly_rate)')
      .eq('user_id', user.id)
      .neq('status', 'voided')
      .order('clock_in', { ascending: false })

    if (mode === 'weekly') {
      query = query.gte('clock_in', start.toISOString()).lte('clock_in', end.toISOString())
    } else if (mode === 'daily') {
      const today = new Date(); today.setHours(0,0,0,0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      query = query.gte('clock_in', today.toISOString()).lt('clock_in', tomorrow.toISOString())
    } else {
      query = query.limit(100)
    }

    const { data } = await query
    setEntries(data ?? [])
    setLoading(false)
  }, [supabase, mode, weekOffset, start, end])

  useEffect(() => { load() }, [load])

  // Aggregate by client
  type ClientSummary = { name: string; hours: number; regular: number; overtime: number; earnings: number }
  const byClient: Record<string, ClientSummary> = {}
  let totalHours = 0, totalEarnings = 0

  for (const e of entries.filter(e => e.clock_out)) {
    const hours = calcDurationHours(e.clock_in, e.clock_out)
    const { regular, overtime, total } = calcEarnings(hours, e.hourly_rate)
    const cname = e.clients?.name ?? 'Unknown'
    if (!byClient[cname]) byClient[cname] = { name: cname, hours: 0, regular: 0, overtime: 0, earnings: 0 }
    byClient[cname].hours += hours
    byClient[cname].regular += regular
    byClient[cname].overtime += overtime
    byClient[cname].earnings += total
    totalHours += hours
    totalEarnings += total
  }

  const summaries = Object.values(byClient)

  function weekLabel() {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
  }

  function printTimesheet() { window.print() }

  return (
    <>
      <div className="page-header">
        <h1>Timesheets</h1>
        <p>View and export your time records by period.</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {(['daily', 'weekly', 'all'] as ViewMode[]).map(v => (
            <button key={v} className="btn btn-ghost btn-sm"
              style={{ borderRadius: v === 'daily' ? 'var(--radius-full) 0 0 var(--radius-full)' : v === 'all' ? '0 var(--radius-full) var(--radius-full) 0' : '0', background: mode === v ? 'rgba(255,255,255,0.1)' : undefined, borderRight: v !== 'all' ? 'none' : undefined }}
              onClick={() => setMode(v)}
            >
              {v === 'daily' ? 'Today' : v === 'weekly' ? 'Weekly' : 'All time'}
            </button>
          ))}
        </div>

        {mode === 'weekly' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o + 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}><Calendar size={13} style={{ display: 'inline', marginRight: '0.375rem' }} />{weekLabel()}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0}><ChevronRight size={14} /></button>
          </div>
        )}

        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={printTimesheet}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-tile">
          <div className="stat-value">{formatHours(totalHours)}</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatMoney(totalEarnings)}</div>
          <div className="stat-label">Total Earnings</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{entries.filter(e => e.clock_out).length}</div>
          <div className="stat-label">Sessions</div>
        </div>
      </div>

      {/* By client */}
      {summaries.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>By Client</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Hours</th><th>Regular</th><th>Overtime</th><th>Earnings</th></tr></thead>
              <tbody>
                {summaries.map(s => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{formatHours(s.hours)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatMoney(s.regular)}</td>
                    <td style={{ color: s.overtime > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>{formatMoney(s.overtime)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(s.earnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All entries */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Time Entries</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><p>No entries for this period.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Client</th><th>In</th><th>Out</th><th>Hours</th><th>Rate</th><th>Earnings</th></tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const hours = calcDurationHours(e.clock_in, e.clock_out)
                const { total } = calcEarnings(hours, e.hourly_rate)
                return (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td style={{ fontWeight: 500 }}>{e.clients?.name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-green">active</span>}</td>
                    <td>{formatHours(hours)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatMoney(e.hourly_rate)}/hr</td>
                    <td style={{ fontWeight: 600 }}>{e.clock_out ? formatMoney(total) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
