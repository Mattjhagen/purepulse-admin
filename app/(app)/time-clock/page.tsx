'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, TimeEntry } from '@/lib/types'
import { formatDateTime, formatHours, formatMoney, calcDurationHours, calcEarnings, statusBadgeClass, getWeekBounds } from '@/lib/utils'
import { Play, Square, Coffee, Clock, Plus, ArrowRight, X, Pencil } from 'lucide-react'
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

type EntryRow = TimeEntry & { clients: { name: string } }

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
    const client = clients.find(c => c.id === form.client_id)
    const payload = {
      client_id: form.client_id,
      description: form.description || null,
      clock_in: clockIn,
      clock_out: clockOut,
      hourly_rate: Number(form.hourly_rate) || client?.hourly_rate || 85,
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

export default function TimeClockPage() {
  const supabase = createClient()
  const params = useSearchParams()
  const preselectedClient = params.get('client')

  const [clients, setClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [openEntry, setOpenEntry] = useState<EntryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [modal, setModal] = useState<{ open: boolean; entry?: EntryRow | null }>({ open: false })

  const [selectedClient, setSelectedClient] = useState(preselectedClient ?? '')
  const [description, setDescription] = useState('')
  const [clocking, setClocking] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [clientsRes, entriesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
      supabase.from('time_entries')
        .select('*, clients(name)')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false })
        .limit(25),
    ])

    setClients(clientsRes.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = (entriesRes.data ?? []) as any[]
    setEntries(all)
    setOpenEntry(all.find((e: EntryRow) => e.status === 'open') ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function clockIn() {
    if (!selectedClient) { setError('Select a client first'); return }
    setError(''); setClocking(true)
    const client = clients.find(c => c.id === selectedClient)
    const { error: err } = await supabase.from('time_entries').insert({
      user_id: userId,
      client_id: selectedClient,
      hourly_rate: client?.hourly_rate ?? 85,
      description: description || null,
      status: 'open',
    })
    if (err) { setError(err.message); setClocking(false); return }
    setDescription('')
    await load()
    setClocking(false)
  }

  async function clockOut() {
    if (!openEntry) return
    setClocking(true)
    await supabase.from('time_entries').update({ clock_out: new Date().toISOString(), status: 'closed' }).eq('id', openEntry.id)
    await load()
    setClocking(false)
  }

  async function startBreak() {
    if (!openEntry) return
    await supabase.from('time_entry_breaks').insert({ time_entry_id: openEntry.id, break_start: new Date().toISOString() })
  }

  const closedEntries = entries.filter(e => e.status !== 'open')

  // Stats
  const now = new Date()
  const { start: weekStart, end: weekEnd } = getWeekBounds(now)
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  const todayEntries = closedEntries.filter(e => {
    const d = new Date(e.clock_in)
    return d >= todayStart && d <= todayEnd
  })
  const weekEntries = closedEntries.filter(e => {
    const d = new Date(e.clock_in)
    return d >= weekStart && d <= weekEnd
  })

  const hoursToday = todayEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
  const hoursWeek = weekEntries.reduce((s, e) => s + calcDurationHours(e.clock_in, e.clock_out), 0)
  const earningsWeek = weekEntries.reduce((s, e) => s + calcEarnings(calcDurationHours(e.clock_in, e.clock_out), e.hourly_rate).total, 0)

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Time Clock</h1>
            <p>Track hours by client with automatic overtime calculation.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/time-clock/timesheets" className="btn btn-ghost btn-sm">Timesheets</Link>
            <Link href="/time-clock/reports" className="btn btn-ghost btn-sm">Reports</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={18} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{formatHours(hoursToday)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Today</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={18} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{formatHours(hoursWeek)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>This Week</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#22c55e' }}>$</span>
          </div>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(earningsWeek)}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Week Earnings</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: openEntry ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Play size={18} color={openEntry ? '#22c55e' : undefined} style={!openEntry ? { opacity: 0.3 } : undefined} />
          </div>
          <div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{openEntry ? '1' : '0'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active Session</p>
          </div>
        </div>
      </div>

      {/* Active timer */}
      {openEntry ? (
        <div className="card-elevated" style={{ marginBottom: '2rem', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="badge badge-green">● Live</span>
            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{openEntry.clients?.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.05em' }}>
              <LiveDuration clockIn={openEntry.clock_in} />
            </span>
            <span style={{ color: 'var(--text-muted)' }}>elapsed</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Clocked in at {formatDateTime(openEntry.clock_in)} · {formatMoney(openEntry.hourly_rate)}/hr
          </p>
          {openEntry.description && <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{openEntry.description}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-danger" onClick={clockOut} disabled={clocking}>
              <Square size={14} /> Clock out
            </button>
            <button className="btn btn-ghost" onClick={startBreak}>
              <Coffee size={14} /> Break
            </button>
          </div>
        </div>
      ) : (
        <div className="card-elevated" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} /> Clock In
          </h2>
          {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Client *</label>
              <select className="input" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">Select a client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {formatMoney(c.hourly_rate)}/hr</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input className="input" placeholder="What are you working on?" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <button className="btn btn-primary" onClick={clockIn} disabled={clocking || !selectedClient}>
                {clocking ? <span className="spinner" /> : <><Play size={14} /> Clock in</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent entries */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Entries</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, entry: null })}>
            <Plus size={14} /> Manual entry
          </button>
          <Link href="/time-clock/timesheets" className="btn btn-ghost btn-sm">Full timesheets <ArrowRight size={13} /></Link>
        </div>
      </div>

      {closedEntries.length === 0 ? (
        <div className="empty-state"><p>No time entries yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Description</th>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
                <th>Hours</th>
                <th>Earnings</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {closedEntries.slice(0, 15).map(e => {
                const hours = calcDurationHours(e.clock_in, e.clock_out)
                const { total } = calcEarnings(hours, e.hourly_rate)
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.clients?.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{formatHours(hours)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(total)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, entry: e })}>
                        <Pencil size={12} />
                      </button>
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
