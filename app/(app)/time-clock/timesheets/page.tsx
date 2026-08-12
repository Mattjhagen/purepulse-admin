'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, TimeEntry } from '@/lib/types'
import { formatMoney, formatHours, calcDurationHours, calcEarnings, getWeekBounds } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Download, Calendar, Plus, X, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

type ViewMode = 'weekly' | 'daily' | 'all'
type EntryRow = TimeEntry & { clients: { name: string; hourly_rate: number } }

function ManualEntryModal({ clients, entry, onClose, onSave }: {
  clients: Client[]
  entry?: EntryRow | null
  onClose: () => void
  onSave: () => void
}) {
  const supabase = createClient()
  const toLocal = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const nowLocal = () => toLocal(new Date().toISOString())

  const [form, setForm] = useState({
    client_id: entry?.client_id ?? '',
    description: entry?.description ?? '',
    clock_in: entry ? toLocal(entry.clock_in) : nowLocal(),
    clock_out: entry?.clock_out ? toLocal(entry.clock_out) : '',
    hourly_rate: entry?.hourly_rate ?? 85,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const clockIn = new Date(form.clock_in).toISOString()
    const clockOut = form.clock_out ? new Date(form.clock_out).toISOString() : null
    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      setError('Clock-out must be after clock-in'); setLoading(false); return
    }
    const payload = {
      client_id: form.client_id,
      description: form.description || null,
      clock_in: clockIn,
      clock_out: clockOut,
      hourly_rate: Number(form.hourly_rate),
      status: clockOut ? 'closed' : 'open',
      updated_at: new Date().toISOString(),
    }
    const { error: err } = entry?.id
      ? await supabase.from('time_entries').update(payload).eq('id', entry.id)
      : await supabase.from('time_entries').insert({ ...payload, user_id: user?.id })
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>{entry ? 'Edit Entry' : 'Manual Entry'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Client *</label>
            <select className="input" required value={form.client_id} onChange={e => {
              const c = clients.find(c => c.id === e.target.value)
              set('client_id', e.target.value)
              if (c) set('hourly_rate', c.hourly_rate)
            }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {formatMoney(c.hourly_rate)}/hr</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What were you working on?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Clock In *</label>
              <input className="input" type="datetime-local" required value={form.clock_in} onChange={e => set('clock_in', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Clock Out</label>
              <input className="input" type="datetime-local" value={form.clock_out} onChange={e => set('clock_out', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Hourly Rate *</label>
            <input className="input" type="number" min={0} step={0.01} required value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : entry ? 'Save changes' : 'Add entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TimesheetsPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [modal, setModal] = useState<{ open: boolean; entry?: EntryRow | null }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

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
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      query = query.gte('clock_in', today.toISOString()).lt('clock_in', tomorrow.toISOString())
    } else {
      query = query.limit(200)
    }

    const [{ data: entriesData }, { data: clientsData }] = await Promise.all([
      query,
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEntries((entriesData ?? []) as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClients((clientsData ?? []) as any[])
    setLoading(false)
  }, [supabase, mode, weekOffset, start, end])

  useEffect(() => { load() }, [load])

  async function deleteEntry(id: string) {
    if (!confirm('Delete this time entry?')) return
    setDeleting(id)
    await supabase.from('time_entries').update({ status: 'voided' }).eq('id', id)
    await load()
    setDeleting(null)
  }

  function exportCSV() {
    const rows = [['Date', 'Client', 'Description', 'Clock In', 'Clock Out', 'Hours', 'Rate', 'Earnings']]
    for (const e of entries.filter(e => e.clock_out)) {
      const hours = calcDurationHours(e.clock_in, e.clock_out)
      const { total } = calcEarnings(hours, e.hourly_rate)
      rows.push([
        new Date(e.clock_in).toLocaleDateString(),
        e.clients?.name ?? '',
        e.description ?? '',
        new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        hours.toFixed(2),
        String(e.hourly_rate),
        total.toFixed(2),
      ])
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'timesheet.csv'; a.click()
    URL.revokeObjectURL(url)
  }

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

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/time-clock" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Time Clock</Link>
            <div>
              <h1>Timesheets</h1>
              <p>View and export your time records by period.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, entry: null })}>
              <Plus size={14} /> Manual entry
            </button>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
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
        {summaries.length > 0 && (
          <div className="stat-tile">
            <div className="stat-value">{formatHours(totalHours / Math.max(summaries.length, 1))}</div>
            <div className="stat-label">Avg / Client</div>
          </div>
        )}
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
                    <td style={{ color: s.overtime > 0 ? 'var(--accent-amber, #f59e0b)' : 'var(--text-muted)' }}>{formatMoney(s.overtime)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(s.earnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All entries */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Time Entries</h2>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <p>No entries for this period.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal({ open: true, entry: null })}>
            <Plus size={14} /> Add manual entry
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Client</th><th>Description</th><th>In</th><th>Out</th><th>Hours</th><th>Rate</th><th>Earnings</th><th></th></tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const hours = calcDurationHours(e.clock_in, e.clock_out)
                const { total } = calcEarnings(hours, e.hourly_rate)
                return (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(e.clock_in).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td style={{ fontWeight: 500 }}>{e.clients?.name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-green">active</span>}</td>
                    <td>{formatHours(hours)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatMoney(e.hourly_rate)}/hr</td>
                    <td style={{ fontWeight: 600 }}>{e.clock_out ? formatMoney(total) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, entry: e })}><Pencil size={12} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => deleteEntry(e.id)} disabled={deleting === e.id}>
                          {deleting === e.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <ManualEntryModal
          clients={clients}
          entry={modal.entry}
          onClose={() => setModal({ open: false })}
          onSave={() => { setModal({ open: false }); load() }}
        />
      )}
    </>
  )
}
