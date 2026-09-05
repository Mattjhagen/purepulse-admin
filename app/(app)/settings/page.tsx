'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Save } from 'lucide-react'

const TIMEZONES = ['America/Chicago', 'America/New_York', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'UTC']

export default function SettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState({
    overtime_threshold_hours: 8,
    overtime_multiplier: 1.5,
    default_hourly_rate: 85,
    timezone: 'America/Chicago',
    auto_clock_out: true,
    auto_clock_out_hours: 12,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('contractor_settings').select('*').eq('user_id', user.id).single()
        if (data) {
          setSettingsId(data.id)
          setSettings({
            overtime_threshold_hours: data.overtime_threshold_hours,
            overtime_multiplier: data.overtime_multiplier,
            default_hourly_rate: data.default_hourly_rate,
            timezone: data.timezone,
            auto_clock_out: data.auto_clock_out,
            auto_clock_out_hours: data.auto_clock_out_hours,
          })
        }
      }
    } catch (e) {
      console.warn('[Settings] load error:', e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (settingsId) {
      await supabase.from('contractor_settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('id', settingsId)
    } else {
      const { data } = await supabase.from('contractor_settings').insert({ ...settings, user_id: user.id }).select().single()
      if (data) setSettingsId(data.id)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const set = (k: string, v: unknown) => setSettings(s => ({ ...s, [k]: v }))
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarEmail, setCalendarEmail] = useState('')
  const [calendarNeedsReconnect, setCalendarNeedsReconnect] = useState(false)
  const [calMsg, setCalMsg] = useState('')
  const [savingCal, setSavingCal] = useState(false)

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('calendar')
    if (result === 'connected') setCalMsg('✅ Google Calendar connected successfully.')
    else if (result) setCalMsg('❌ Google Calendar could not be connected. Please try again.')

    fetch('/api/settings/google-calendar')
      .then(res => res.json())
      .then(data => {
        setCalendarConnected(Boolean(data.connected))
        setCalendarEmail(data.email || '')
        setCalendarNeedsReconnect(Boolean(data.needsReconnect))
      })
      .catch(() => {})
  }, [])

  const disconnectGoogleCalendar = async () => {
    setSavingCal(true)
    setCalMsg('')
    try {
      const res = await fetch('/api/settings/google-calendar', { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setCalendarConnected(false)
        setCalendarEmail('')
        setCalMsg('✅ Google Calendar disconnected.')
      } else {
        setCalMsg(`❌ ${data.error || 'Could not disconnect Google Calendar.'}`)
      }
    } catch {
      setCalMsg('❌ Could not disconnect Google Calendar.')
    } finally {
      setSavingCal(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your time clock preferences and defaults.</p>
      </div>

      <form onSubmit={save} style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card-elevated">
          <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>Time Clock</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Default Hourly Rate ($)</label>
              <input className="input" type="number" min={0} step={0.01} value={settings.default_hourly_rate} onChange={e => set('default_hourly_rate', Number(e.target.value))} />
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Used as fallback when a client has no rate set.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Overtime Threshold (hours/day)</label>
                <input className="input" type="number" min={0} step={0.5} value={settings.overtime_threshold_hours} onChange={e => set('overtime_threshold_hours', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Overtime Multiplier</label>
                <input className="input" type="number" min={1} step={0.05} value={settings.overtime_multiplier} onChange={e => set('overtime_multiplier', Number(e.target.value))} />
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>1.5 = time and a half</p>
              </div>
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select className="input" value={settings.timezone} onChange={e => set('timezone', e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>Auto Clock-Out</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="auto-clock-out"
                checked={settings.auto_clock_out}
                onChange={e => set('auto_clock_out', e.target.checked)}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <label htmlFor="auto-clock-out" style={{ textTransform: 'none', marginBottom: 0, cursor: 'pointer', fontSize: '0.9375rem', color: 'var(--text)' }}>
                Automatically clock out after a set number of hours
              </label>
            </div>
            {settings.auto_clock_out && (
              <div className="form-group" style={{ maxWidth: '200px' }}>
                <label>Auto clock-out after (hours)</label>
                <input className="input" type="number" min={1} step={0.5} value={settings.auto_clock_out_hours} onChange={e => set('auto_clock_out_hours', Number(e.target.value))} />
              </div>
            )}
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : saved ? '✓ Saved!' : <><Save size={14} /> Save settings</>}
          </button>
        </div>
      </form>

      {/* ── Google Calendar Integration Card ── */}
      <div style={{ maxWidth: 720, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(123,47,255,0.15)', border: '1px solid rgba(123,47,255,0.3)', padding: '6px', borderRadius: '8px', color: '#A066FF' }}>
            📅
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#fff' }}>Google Calendar Interview Scheduling</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              Let applicants book open interview times without overlapping events already on your Google Calendar.
            </p>
          </div>
        </div>

        {calMsg && (
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: calMsg.startsWith('✅') ? '#10B981' : '#F87171', marginBottom: '1rem' }}>{calMsg}</p>
        )}

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>{calendarConnected ? `Connected: ${calendarEmail || 'Google Calendar'}` : 'Not connected'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Monday–Friday, 12:00 PM–7:00 PM Central · 30-minute appointments · existing events are blocked</p>
          </div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: calendarConnected ? '#10B981' : '#F59E0B', background: calendarConnected ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: 4, border: `1px solid ${calendarConnected ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>{calendarConnected ? 'CONNECTED' : calendarNeedsReconnect ? 'RECONNECT' : 'SETUP REQUIRED'}</span>
        </div>

        {calendarConnected ? (
          <button type="button" onClick={disconnectGoogleCalendar} disabled={savingCal} className="btn btn-ghost">
            {savingCal ? 'Disconnecting…' : 'Disconnect Google Calendar'}
          </button>
        ) : (
          <a href="/api/settings/google-calendar/connect" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Connect Google Calendar
          </a>
        )}
      </div>
    </>
  )
}
