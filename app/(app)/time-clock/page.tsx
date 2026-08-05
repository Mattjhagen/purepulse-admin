'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, TimeEntry } from '@/lib/types'
import { formatDateTime, formatHours, formatMoney, calcDurationHours, calcEarnings, statusBadgeClass } from '@/lib/utils'
import { Play, Square, Coffee, Clock, Plus, ArrowRight } from 'lucide-react'
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

export default function TimeClockPage() {
  const supabase = createClient()
  const params = useSearchParams()
  const preselectedClient = params.get('client')

  const [clients, setClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<(TimeEntry & { clients: { name: string } })[]>([])
  const [openEntry, setOpenEntry] = useState<(TimeEntry & { clients: { name: string } }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  // Clock in form
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
        .limit(20),
    ])

    setClients(clientsRes.data ?? [])
    const all = entriesRes.data ?? []
    setEntries(all)
    const open = all.find(e => e.status === 'open') ?? null
    setOpenEntry(open)
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
        /* Clock in form */
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
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatMoney(c.hourly_rate)}/hr
                  </option>
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
      <div className="section-header">
        <h2>Recent Entries</h2>
        <Link href="/time-clock/timesheets" className="btn btn-ghost btn-sm">Full timesheets <ArrowRight size={13} /></Link>
      </div>

      {closedEntries.length === 0 ? (
        <div className="empty-state"><p>No time entries yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
                <th>Hours</th>
                <th>Earnings</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {closedEntries.map(e => {
                const hours = calcDurationHours(e.clock_in, e.clock_out)
                const { total } = calcEarnings(hours, e.hourly_rate)
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.clients?.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{formatHours(hours)}</td>
                    <td>{formatMoney(total)}</td>
                    <td><span className={statusBadgeClass(e.status)}>{e.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual entry */}
      <div style={{ marginTop: '1.5rem' }}>
        <Link href="/time-clock/timesheets" className="btn btn-ghost btn-sm">
          <Plus size={14} /> Add manual entry
        </Link>
      </div>
    </>
  )
}
