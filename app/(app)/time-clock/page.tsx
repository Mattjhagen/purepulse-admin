'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, TimeEntry } from '@/lib/types'
import { formatDateTime, formatHours, formatMoney, calcDurationHours, calcEarnings, getWeekBounds } from '@/lib/utils'
import { Play, Square, Clock, Plus, ArrowRight, X, Pencil, TrendingUp, DollarSign, Target, ShieldCheck, Users, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function LiveDuration({ clockIn }: { clockIn: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = new Date(clockIn).getTime()
    const tick = () => setElapsed((Date.now() - start) / 3_600_000)
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [clockIn])
  return <span className="clock-pulse">{formatHours(elapsed)}</span>
}

function LiveEarnings({ clockIn, hourlyRate }: { clockIn: string; hourlyRate: number }) {
  const [earned, setEarned] = useState(0)
  useEffect(() => {
    const start = new Date(clockIn).getTime()
    const tick = () => {
      const hours = (Date.now() - start) / 3_600_000
      setEarned(calcEarnings(hours, hourlyRate).total)
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [clockIn, hourlyRate])
  return <span className="clock-pulse" style={{ color: '#22c55e' }}>{formatMoney(earned)}</span>
}

type WeekEntry = { id: string; clock_in: string; clock_out: string | null; hourly_rate: number; status: string }

function WeekBarsCard({ entries, weekStart }: { entries: WeekEntry[]; weekStart: Date }) {
  const goalHours = 8
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999)
    const hours = entries
      .filter(e => {
        const t = new Date(e.clock_in)
        return t >= dayStart && t <= dayEnd && e.clock_out && e.status !== 'voided'
      })
      .reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      hours,
      isToday: d.toDateString() === new Date().toDateString(),
      isFuture: d.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0),
    }
  })
  const totalWeekHours = days.reduce((s, d) => s + d.hours, 0)
  const maxHours = Math.max(...days.map(d => d.hours), goalHours)

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Target size={12} /> Weekly Progress
        </p>
        <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{formatHours(totalWeekHours)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {goalHours * 5}h goal</span></p>
      </div>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end', height: 52 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                bottom: `${Math.min((goalHours / maxHours) * 100, 100)}%`,
                left: 0, right: 0,
                borderTop: '1px dashed rgba(255,255,255,0.1)',
              }} />
              <div style={{
                height: d.hours > 0 ? `${Math.max((d.hours / maxHours) * 100, 5)}%` : '0',
                background: d.isFuture
                  ? 'rgba(255,255,255,0.05)'
                  : d.isToday
                  ? (d.hours >= goalHours ? '#22c55e' : '#6366f1')
                  : d.hours >= goalHours
                  ? 'rgba(34,197,94,0.5)'
                  : 'rgba(255,255,255,0.22)',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.4s ease',
              }} />
            </div>
            <span style={{
              fontSize: '0.6rem',
              color: d.isToday ? '#6366f1' : 'var(--text-dim)',
              fontWeight: d.isToday ? 700 : 400,
            }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

type EntryRow = TimeEntry & { 
  clients: { name: string }
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
            <label>Description / Work Notes</label>
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

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const dt = new Date(d); dt.setHours(0, 0, 0, 0)
  if (dt.getTime() === today.getTime()) return 'Today'
  if (dt.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TimeClockPage() {
  const supabase = createClient()
  const params = useSearchParams()
  const preselectedClient = params.get('client')

  const [clients, setClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [openEntry, setOpenEntry] = useState<EntryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; entry?: EntryRow | null }>({ open: false })
  const [selectedClient, setSelectedClient] = useState(preselectedClient ?? '')
  const [description, setDescription] = useState('')
  const [clocking, setClocking] = useState(false)
  const [error, setError] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  // Superuser state
  const [isSuper, setIsSuper] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('me')

  const now = new Date()
  const { start: weekStart } = getWeekBounds(now)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch clients
      const { data: clientsData } = await supabase.from('clients').select('*').eq('status', 'active').order('name')
      setClients(clientsData ?? [])

      // 2. Fetch time entries from server API
      let url = '/api/time-clock'
      if (selectedMemberFilter && selectedMemberFilter !== 'me') {
        url += `?user_id=${encodeURIComponent(selectedMemberFilter)}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.entries) {
        setEntries(data.entries)
        setOpenEntry(data.openEntry || null)
        setIsSuper(Boolean(data.isSuperuser))
        setTeamMembers(data.teamMembers || [])
      }
    } catch (err) {
      console.error('TimeClock load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedMemberFilter])

  useEffect(() => { load() }, [load])

  async function clockIn() {
    if (!selectedClient) { setError('Select a client first'); return }
    setError(''); setClocking(true)
    const client = clients.find(c => c.id === selectedClient)

    try {
      const res = await fetch('/api/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient,
          hourly_rate: client?.hourly_rate || 85,
          description: description || null,
          target_user_id: selectedMemberFilter !== 'me' && selectedMemberFilter !== 'all' ? selectedMemberFilter : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to clock in')
      } else {
        setDescription('')
        await load()
      }
    } catch {
      setError('Clock-in failed')
    } finally {
      setClocking(false)
    }
  }

  async function clockOut() {
    if (!openEntry) return
    setClocking(true)
    try {
      await fetch('/api/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock-out',
          entry_id: openEntry.id,
        }),
      })
      await load()
    } catch {} finally {
      setClocking(false)
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) return
    try {
      await fetch(`/api/time-clock?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await load()
    } catch {}
  }

  const closedEntries = entries.filter(e => e.status === 'closed')

  // Stats from current dataset
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

  const todayClosed = closedEntries.filter(e => {
    const d = new Date(e.clock_in)
    return d >= todayStart && d <= todayEnd
  })
  const hoursToday = todayClosed.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
  const hoursWeek = closedEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
  const earningsWeek = closedEntries.reduce((s, e) => s + calcEarnings(calcDurationHours(e.clock_in, e.clock_out), e.hourly_rate).total, 0)

  const dailyGoal = 8
  const dailyProgress = Math.min((hoursToday / dailyGoal) * 100, 100)

  const filtered = clientFilter ? closedEntries.filter(e => e.client_id === clientFilter) : closedEntries

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0 }}>Time Clock</h1>
              {isSuper && (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#7B2FFF', color: '#fff', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Superuser Master Control
                </span>
              )}
            </div>
            <p style={{ marginTop: '4px' }}>Track billable hours by client with real-time employee attribution.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal({ open: true })}>
              <Plus size={13} /> Manual Entry
            </button>
            <Link href="/time-clock/timesheets" className="btn btn-ghost btn-sm">Timesheets</Link>
            <Link href="/time-clock/reports" className="btn btn-ghost btn-sm">Reports</Link>
          </div>
        </div>
      </div>

      {/* Superuser Member Selector */}
      {isSuper && teamMembers.length > 0 && (
        <div style={{ background: 'rgba(123, 47, 255, 0.08)', border: '1px solid rgba(123, 47, 255, 0.25)', borderRadius: '10px', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ShieldCheck size={18} color="#A066FF" />
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#F4F4FF' }}>Superuser Timesheet Inspector:</span>
              <span style={{ fontSize: '0.75rem', color: '#A066FF', marginLeft: '6px' }}>Filter or manage any team member's active clock &amp; log</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="input"
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', minWidth: '220px', background: '#14141F', border: '1px solid #2D2D42' }}
              value={selectedMemberFilter}
              onChange={e => setSelectedMemberFilter(e.target.value)}
            >
              <option value="me">My Account Clock</option>
              <option value="all">All Team Members (Master View)</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.auth_user_id || tm.id}>
                  {tm.name} ({tm.role.toUpperCase()}) — {tm.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={18} color="#6366f1" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatHours(hoursToday)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Today</p>
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${dailyProgress}%`, background: dailyProgress >= 100 ? '#22c55e' : '#6366f1', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={18} color="#22c55e" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatHours(hoursWeek)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total Tracked</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={18} color="#f59e0b" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(earningsWeek)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Billable Value</p>
          </div>
        </div>

        <WeekBarsCard entries={closedEntries.map(e => ({ id: e.id, clock_in: e.clock_in, clock_out: e.clock_out ?? null, hourly_rate: Number(e.hourly_rate), status: e.status }))} weekStart={weekStart} />
      </div>

      {/* Clock In / Active Session */}
      {openEntry ? (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(13,13,13,0.95) 100%)',
          border: '1px solid rgba(34,197,94,0.3)',
          marginBottom: '2rem',
          padding: '1.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e', fontWeight: 700 }}>
                  Active Session {openEntry.user_name ? `• ${openEntry.user_name}` : ''}
                </p>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>
                  {openEntry.clients?.name ?? 'Client Session'}
                </h2>
                {openEntry.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{openEntry.description}</p>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.03em' }}>
                <LiveDuration clockIn={openEntry.clock_in} />
              </div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                <LiveEarnings clockIn={openEntry.clock_in} hourlyRate={Number(openEntry.hourly_rate)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({formatMoney(openEntry.hourly_rate)}/hr)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-danger" onClick={clockOut} disabled={clocking} style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
              <Square size={16} /> {clocking ? <span className="spinner" /> : 'Clock Out'}
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Clocked in at {formatDateTime(openEntry.clock_in)}
            </span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            {selectedMemberFilter !== 'me' && selectedMemberFilter !== 'all' ? 'Clock In Team Member' : 'Start Working'}
          </h2>
          {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>Client *</label>
              <select className="input" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select a client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {formatMoney(c.hourly_rate)}/hr</option>)}
              </select>
            </div>
            <div style={{ flex: '2 1 260px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>Description / Work Item</label>
              <input
                className="input"
                placeholder="What are you working on?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') clockIn() }}
                style={{ width: '100%' }}
              />
            </div>
            <button className="btn btn-primary" onClick={clockIn} disabled={clocking || !selectedClient} style={{ padding: '0.625rem 1.5rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              <Play size={16} /> {clocking ? <span className="spinner" /> : 'Clock In'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
          {isSuper && selectedMemberFilter === 'all' ? 'All Team Time Entries' : 'Recent Time Entries'}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="input" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Clock size={36} />
          <p>No closed time entries recorded yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Member</th>
                <th style={{ padding: '0.75rem 1rem' }}>Client</th>
                <th style={{ padding: '0.75rem 1rem' }}>Clock In / Out</th>
                <th style={{ padding: '0.75rem 1rem' }}>Hours</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rate</th>
                <th style={{ padding: '0.75rem 1rem' }}>Total</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const duration = calcDurationHours(entry.clock_in, entry.clock_out)
                const earnings = calcEarnings(duration, Number(entry.hourly_rate))
                return (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.84rem' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{entry.user_name || 'Team Member'}</span>
                      {entry.user_role && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, marginLeft: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {entry.user_role}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 600 }}>{entry.clients?.name ?? 'Client'}</span>
                      {entry.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{entry.description}</p>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      <div>{dayLabel(entry.clock_in)} • {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {entry.clock_out && <div>to {new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{formatHours(duration)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{formatMoney(entry.hourly_rate)}/hr</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#22c55e' }}>{formatMoney(earnings.total)}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
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
