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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
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
    setLoading(false)
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
    </>
  )
}
