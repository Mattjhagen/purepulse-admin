'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, TimeEntry } from '@/lib/types'
import { formatMoney, formatHours, calcDurationHours, calcEarnings, getWeekBounds } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Download, Calendar, Plus, X, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

type ViewMode = 'weekly' | 'daily' | 'all'
type EntryRow = TimeEntry & { 
  clients: { name: string; hourly_rate?: number }
  user_name?: string
  user_email?: string
  user_role?: string 
}

function ManualEntryModal({ clients, entry, targetUserId, onClose, onSave }: {
  clients: Client[]
  entry?: EntryRow | null
  targetUserId?: string
  onClose: () => void
  onSave: () => void
}) {
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
    const clockIn = new Date(form.clock_in).toISOString()
    const clockOut = form.clock_out ? new Date(form.clock_out).toISOString() : null
    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      setError('Clock-out must be after clock-in'); setLoading(false); return
    }
    const client = clients.find(c => c.id === form.client_id)
    const payload = {
      id: entry?.id,
      action: 'manual',
      client_id: form.client_id,
      description: form.description || null,
      clock_in: clockIn,
      clock_out: clockOut,
      hourly_rate: Number(form.hourly_rate) || client?.hourly_rate || 85,
      target_user_id: targetUserId,
    }

    try {
      const res = await fetch('/api/time-clock', {
        method: entry?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to save entry')
        setLoading(false)
        return
      }
      onSave()
    } catch {
      setError('Error saving entry')
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>{entry ? 'Edit Time Entry' : 'Manual Time Entry'}</h2>
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
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was worked on?" />
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
            <label>Hourly Rate ($) *</label>
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

function dateGroupKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateGroupLabel(key: string) {
  const d = new Date(key + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function TimesheetsPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [modal, setModal] = useState<{ open: boolean; entry?: EntryRow | null }>({ open: false })
  const [clientFilter, setClientFilter] = useState('')

  // Superuser state
  const [isSuper, setIsSuper] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('me')

  const { start, end } = (() => {
    const base = new Date()
    base.setDate(base.getDate() - weekOffset * 7)
    return getWeekBounds(base)
  })()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: clientsData } = await supabase.from('clients').select('*').order('name')
      setClients(clientsData ?? [])

      let url = '/api/time-clock'
      if (selectedMemberFilter && selectedMemberFilter !== 'me') {
        url += `?user_id=${encodeURIComponent(selectedMemberFilter)}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.entries) {
        setEntries(data.entries)
        setIsSuper(Boolean(data.isSuperuser))
        setTeamMembers(data.teamMembers || [])
      }
    } catch (err) {
      console.error('Timesheets load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedMemberFilter])

  useEffect(() => { load() }, [load])

  async function deleteEntry(id: string) {
    if (!confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) return
    try {
      await fetch(`/api/time-clock?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await load()
    } catch {}
  }

  // Filter entries
  const visibleEntries = entries.filter(e => {
    if (clientFilter && e.client_id !== clientFilter) return false
    if (mode === 'weekly') {
      const d = new Date(e.clock_in)
      return d >= start && d <= end
    }
    return true
  })

  // Calculations
  const totalHours = visibleEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
  const totalEarnings = visibleEntries.reduce((s, e) => s + calcEarnings(calcDurationHours(e.clock_in, e.clock_out), Number(e.hourly_rate)).total, 0)

  // Group by date
  const grouped = visibleEntries.reduce((acc, entry) => {
    const key = dateGroupKey(entry.clock_in)
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {} as Record<string, EntryRow[]>)

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function exportCSV() {
    const rows = [
      ['Member', 'Email', 'Client', 'Clock In', 'Clock Out', 'Hours', 'Rate', 'Total', 'Description'],
      ...visibleEntries.map(e => {
        const hours = calcDurationHours(e.clock_in, e.clock_out)
        const earned = calcEarnings(hours, Number(e.hourly_rate)).total
        return [
          e.user_name || 'Team Member',
          e.user_email || '',
          e.clients?.name ?? e.client_id,
          new Date(e.clock_in).toLocaleString(),
          e.clock_out ? new Date(e.clock_out).toLocaleString() : 'Active',
          hours.toFixed(2),
          e.hourly_rate,
          earned.toFixed(2),
          `"${(e.description || '').replace(/"/g, '""')}"`,
        ]
      }),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${selectedMemberFilter}-${mode}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0 }}>Timesheets</h1>
              {isSuper && (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#7B2FFF', color: '#fff', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Superuser Access
                </span>
              )}
            </div>
            <p style={{ marginTop: '4px' }}>Review, edit, and export logged billable hours and team timesheets.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ open: true })}>
              <Plus size={13} /> Add Entry
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download size={13} /> Export CSV
            </button>
            <Link href="/time-clock" className="btn btn-ghost btn-sm">Time Clock</Link>
          </div>
        </div>
      </div>

      {/* Superuser Member Selector */}
      {isSuper && teamMembers.length > 0 && (
        <div style={{ background: 'rgba(123, 47, 255, 0.08)', border: '1px solid rgba(123, 47, 255, 0.25)', borderRadius: '10px', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ShieldCheck size={18} color="#A066FF" />
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#F4F4FF' }}>Superuser Timesheet Master:</span>
              <span style={{ fontSize: '0.75rem', color: '#A066FF', marginLeft: '6px' }}>Select an employee to inspect, edit, or adjust their timesheet</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="input"
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', minWidth: '240px', background: '#14141F', border: '1px solid #2D2D42' }}
              value={selectedMemberFilter}
              onChange={e => setSelectedMemberFilter(e.target.value)}
            >
              <option value="me">My Timesheet</option>
              <option value="all">All Team Members (Master Timesheet)</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.auth_user_id || tm.id}>
                  {tm.name} ({tm.role.toUpperCase()}) — {tm.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setMode('weekly')}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.8125rem', border: 'none', cursor: 'pointer',
                background: mode === 'weekly' ? '#7B2FFF' : 'transparent', color: mode === 'weekly' ? '#fff' : 'var(--text-muted)', fontWeight: mode === 'weekly' ? 700 : 400
              }}
            >
              Weekly
            </button>
            <button
              onClick={() => setMode('all')}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.8125rem', border: 'none', cursor: 'pointer',
                background: mode === 'all' ? '#7B2FFF' : 'transparent', color: mode === 'all' ? '#fff' : 'var(--text-muted)', fontWeight: mode === 'all' ? 700 : 400
              }}
            >
              All Time
            </button>
          </div>

          {mode === 'weekly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: '180px', textAlign: 'center' }}>
                {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}><ChevronRight size={14} /></button>
              {weekOffset > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>This Week</button>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <select className="input" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period Total: </span>
            <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#F4F4FF' }}>{formatHours(totalHours)}</span>
            <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#22c55e', marginLeft: '8px' }}>({formatMoney(totalEarnings)})</span>
          </div>
        </div>
      </div>

      {/* Timesheet Groups */}
      {sortedDates.length === 0 ? (
        <div className="empty-state">
          <Calendar size={36} />
          <p>No timesheet entries found for this selection.</p>
        </div>
      ) : (
        sortedDates.map((dateKey) => {
          const dayEntries = grouped[dateKey]
          const dayHours = dayEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
          const dayEarnings = dayEntries.reduce((s, e) => s + calcEarnings(calcDurationHours(e.clock_in, e.clock_out), Number(e.hourly_rate)).total, 0)

          return (
            <div key={dateKey} className="card" style={{ marginBottom: '1.25rem', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{dateGroupLabel(dateKey)}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Day Total: <strong>{formatHours(dayHours)}</strong> • <strong style={{ color: '#22c55e' }}>{formatMoney(dayEarnings)}</strong>
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'left' }}>Member</th>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'left' }}>Client</th>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'left' }}>Times</th>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'left' }}>Hours</th>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'left' }}>Rate</th>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'left' }}>Total</th>
                    <th style={{ padding: '0.625rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map((entry) => {
                    const hours = calcDurationHours(entry.clock_in, entry.clock_out)
                    const earnings = calcEarnings(hours, Number(entry.hourly_rate))
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.84rem' }}>
                        <td style={{ padding: '0.625rem 1.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{entry.user_name || 'Team Member'}</span>
                        </td>
                        <td style={{ padding: '0.625rem 1.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{entry.clients?.name ?? 'Client'}</span>
                          {entry.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{entry.description}</p>}
                        </td>
                        <td style={{ padding: '0.625rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                        </td>
                        <td style={{ padding: '0.625rem 1.25rem', fontWeight: 700 }}>{formatHours(hours)}</td>
                        <td style={{ padding: '0.625rem 1.25rem', color: 'var(--text-muted)' }}>{formatMoney(entry.hourly_rate)}/hr</td>
                        <td style={{ padding: '0.625rem 1.25rem', fontWeight: 700, color: '#22c55e' }}>{formatMoney(earnings.total)}</td>
                        <td style={{ padding: '0.625rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setModal({ open: true, entry })}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              title="Edit Entry"
                            >
                              <Pencil size={14} />
                            </button>
                            {isSuper && (
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                title="Delete Entry"
                              >
                                <Trash2 size={14} />
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
          )
        })
      )}

      {modal.open && (
        <ManualEntryModal
          clients={clients}
          entry={modal.entry}
          targetUserId={selectedMemberFilter !== 'me' && selectedMemberFilter !== 'all' ? selectedMemberFilter : undefined}
          onClose={() => setModal({ open: false, entry: null })}
          onSave={() => { setModal({ open: false, entry: null }); load() }}
        />
      )}
    </>
  )
}
