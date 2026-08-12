'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, X, CalendarDays, Send, RotateCcw, Check } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalDeliverable {
  id: string
  title: string
  type: string
  platform: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  campaign_id: string
  campaign_name: string
  client_name: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  social_post:      { bg: '#1e1b4b', text: '#818cf8', border: '#3730a3' },
  blog_post:        { bg: '#0c1a2e', text: '#60a5fa', border: '#1e3a5f' },
  webpage:          { bg: '#0a1f1f', text: '#2dd4bf', border: '#0d4040' },
  ad_copy:          { bg: '#2a1a05', text: '#f59e0b', border: '#92400e' },
  email:            { bg: '#0a2018', text: '#34d399', border: '#065f46' },
  graphic_brief:    { bg: '#2a0a1a', text: '#f472b6', border: '#831843' },
  video_script:     { bg: '#2a0a0a', text: '#f87171', border: '#991b1b' },
  seo_report:       { bg: '#162008', text: '#86efac', border: '#166534' },
  analytics_report: { bg: '#1a1040', text: '#a78bfa', border: '#5b21b6' },
  strategy_doc:     { bg: '#1a1a1a', text: '#9ca3af', border: '#374151' },
}

const TYPE_LABELS: Record<string, string> = {
  social_post: 'Social', blog_post: 'Blog', webpage: 'Page',
  ad_copy: 'Ad', email: 'Email', graphic_brief: 'Graphic',
  video_script: 'Video', seo_report: 'SEO',
  analytics_report: 'Analytics', strategy_doc: 'Strategy',
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', facebook: '🔵', linkedin: '💼', x: '𝕏',
  google: '🔍', website: '🌐', email: '✉️',
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(year: number, month: number) {
  const firstDay   = new Date(year, month, 1)
  const startDow   = firstDay.getDay()
  const daysInMo   = new Date(year, month + 1, 0).getDate()
  const prevLast   = new Date(year, month, 0).getDate()
  const days: { date: Date; current: boolean }[] = []

  for (let i = startDow - 1; i >= 0; i--)
    days.push({ date: new Date(year, month - 1, prevLast - i), current: false })
  for (let d = 1; d <= daysInMo; d++)
    days.push({ date: new Date(year, month, d), current: true })
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++)
    days.push({ date: new Date(year, month + 1, d), current: false })

  return days
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [scheduled,   setScheduled]   = useState<CalDeliverable[]>([])
  const [unscheduled, setUnscheduled] = useState<CalDeliverable[]>([])
  const [loading,     setLoading]     = useState(true)

  // selected deliverable for the detail/schedule modal
  const [selected,     setSelected]     = useState<CalDeliverable | null>(null)
  const [pickDate,     setPickDate]     = useState('')   // YYYY-MM-DD
  const [saving,       setSaving]       = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const start = new Date(year, month, 1).toISOString()
    const end   = new Date(year, month + 1, 1).toISOString()

    const [schedRes, unschedRes] = await Promise.all([
      supabase
        .from('deliverables')
        .select('id, title, type, platform, status, scheduled_at, published_at, campaign_id, campaigns(name, clients(name))')
        .gte('scheduled_at', start)
        .lt('scheduled_at', end)
        .not('status', 'in', '("draft","archived")'),
      supabase
        .from('deliverables')
        .select('id, title, type, platform, status, scheduled_at, published_at, campaign_id, campaigns(name, clients(name))')
        .eq('status', 'approved')
        .is('scheduled_at', null)
        .order('created_at', { ascending: false })
        .limit(60),
    ])

    function flatten(raw: unknown): CalDeliverable[] {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((raw as any[]) ?? []).map((d: any) => ({
        id:           d.id,
        title:        d.title,
        type:         d.type,
        platform:     d.platform ?? '',
        status:       d.status,
        scheduled_at: d.scheduled_at ?? null,
        published_at: d.published_at ?? null,
        campaign_id:  d.campaign_id,
        campaign_name: Array.isArray(d.campaigns) ? d.campaigns[0]?.name ?? '' : d.campaigns?.name ?? '',
        client_name:   Array.isArray(d.campaigns)
          ? (Array.isArray(d.campaigns[0]?.clients) ? d.campaigns[0]?.clients[0]?.name : d.campaigns[0]?.clients?.name) ?? ''
          : (Array.isArray(d.campaigns?.clients) ? d.campaigns?.clients[0]?.name : d.campaigns?.clients?.name) ?? '',
      }))
    }

    setScheduled(flatten(schedRes.data))
    setUnscheduled(flatten(unschedRes.data))
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function patch(id: string, body: Record<string, unknown>) {
    setSaving(true)
    await fetch(`/api/deliverables/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setSelected(null)
    await loadData()
  }

  async function handleSchedule() {
    if (!selected || !pickDate) return
    await patch(selected.id, {
      scheduled_at: new Date(pickDate + 'T09:00:00').toISOString(),
      status: 'scheduled',
    })
  }

  async function handleUnschedule() {
    if (!selected) return
    await patch(selected.id, { scheduled_at: null, status: 'approved' })
  }

  async function handlePublish() {
    if (!selected) return
    await patch(selected.id, {
      status: 'published',
      published_at: new Date().toISOString(),
    })
  }

  function openDeliverable(d: CalDeliverable) {
    setSelected(d)
    setPickDate(d.scheduled_at ? d.scheduled_at.split('T')[0] : toDateKey(today))
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  // ── Calendar grid data ─────────────────────────────────────────────────────

  const calDays = getCalendarDays(year, month)
  const byDate: Record<string, CalDeliverable[]> = {}
  for (const d of scheduled) {
    if (!d.scheduled_at) continue
    const key = d.scheduled_at.split('T')[0]
    ;(byDate[key] ??= []).push(d)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <CalendarDays size={20} /> Content Calendar
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Schedule approved deliverables and track what&apos;s going out.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={navBtn}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 160, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}><ChevronRight size={16} /></button>
          <button
            onClick={goToday}
            style={{ ...navBtn, padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Main layout: unscheduled queue + calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}
        className="cal-layout"
      >
        {/* Unscheduled queue */}
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Unscheduled ({unscheduled.length})
          </p>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : unscheduled.length === 0 ? (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              All approved content is scheduled.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {unscheduled.map(d => {
                const tc = TYPE_COLORS[d.type] ?? TYPE_COLORS.strategy_doc
                return (
                  <button
                    key={d.id}
                    onClick={() => openDeliverable(d)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '0.625rem 0.75rem', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                      }}>
                        {TYPE_LABELS[d.type] ?? d.type}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {PLATFORM_ICONS[d.platform] ?? '📄'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{d.title}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{d.client_name}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Calendar grid */}
        <div>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.375rem 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calDays.map(({ date, current }, i) => {
              const key    = toDateKey(date)
              const items  = byDate[key] ?? []
              const isToday = isSameDate(date, today)
              const MAX    = 3

              return (
                <div
                  key={i}
                  style={{
                    minHeight: 90, borderRadius: 6, padding: '0.375rem',
                    background: isToday ? 'rgba(123,47,255,0.08)' : 'var(--card)',
                    border: isToday ? '1px solid #7B2FFF88' : '1px solid var(--border)',
                    opacity: current ? 1 : 0.4,
                  }}
                >
                  <p style={{
                    fontSize: '0.75rem', fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#a78bfa' : current ? 'var(--text)' : 'var(--text-muted)',
                    marginBottom: '0.25rem',
                  }}>
                    {date.getDate()}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.slice(0, MAX).map(d => {
                      const tc = TYPE_COLORS[d.type] ?? TYPE_COLORS.strategy_doc
                      return (
                        <button
                          key={d.id}
                          onClick={() => openDeliverable(d)}
                          title={`${d.client_name} — ${d.title}`}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            fontSize: '0.625rem', fontWeight: 600,
                            padding: '2px 5px', borderRadius: 4, cursor: 'pointer',
                            background: tc.bg, color: tc.text,
                            border: `1px solid ${tc.border}`,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            lineHeight: 1.4,
                          }}
                        >
                          {d.status === 'published' ? '✓ ' : ''}{d.client_name || TYPE_LABELS[d.type]}
                        </button>
                      )
                    })}
                    {items.length > MAX && (
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0, paddingLeft: 2 }}>
                        +{items.length - MAX} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {Object.entries(TYPE_LABELS).map(([type, label]) => {
              const tc = TYPE_COLORS[type] ?? TYPE_COLORS.strategy_doc
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: tc.bg, border: `1px solid ${tc.border}` }} />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Detail / Schedule Modal ──────────────────────────────────────────── */}
      {!!selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 'min(480px, 95vw)', background: '#0d0d0d',
            border: '1px solid var(--border)', borderRadius: 12,
            zIndex: 50, overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {(() => {
                  const tc = TYPE_COLORS[selected.type] ?? TYPE_COLORS.strategy_doc
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
                        {TYPE_LABELS[selected.type] ?? selected.type}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {PLATFORM_ICONS[selected.platform] ?? '📄'} {selected.platform}
                      </span>
                      {selected.status === 'published' && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: '#022c1e', color: '#34d399', border: '1px solid #065f46' }}>
                          Published
                        </span>
                      )}
                    </div>
                  )
                })()}
                <p style={{ fontWeight: 600, fontSize: '1rem', margin: 0, lineHeight: 1.3 }}>{selected.title}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{selected.client_name}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                {selected.scheduled_at ? 'Scheduled Date' : 'Pick a Date to Schedule'}
              </label>
              <input
                type="date"
                value={pickDate}
                onChange={e => setPickDate(e.target.value)}
                style={{
                  width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '0.625rem 0.75rem', fontSize: '0.9375rem',
                  color: 'var(--text)', boxSizing: 'border-box',
                  colorScheme: 'dark',
                }}
              />

              {!!selected.published_at && (
                <p style={{ fontSize: '0.8125rem', color: '#34d399', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Check size={14} />
                  Published {new Date(selected.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', gap: '0.625rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {selected.status !== 'published' && (
                <>
                  <button
                    onClick={handleSchedule}
                    disabled={saving || !pickDate}
                    style={{
                      flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                      padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                      background: '#7B2FFF', border: '1px solid #7B2FFF', color: '#fff', cursor: 'pointer',
                      opacity: saving || !pickDate ? 0.6 : 1,
                    }}
                  >
                    <Send size={14} />
                    {saving ? 'Saving…' : selected.scheduled_at ? 'Update Date' : 'Schedule'}
                  </button>

                  {!!selected.scheduled_at && (
                    <button
                      onClick={handlePublish}
                      disabled={saving}
                      style={{
                        flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                        padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                        background: '#022c1e', border: '1px solid #065f46', color: '#34d399', cursor: 'pointer',
                      }}
                    >
                      <Check size={14} />
                      Mark Published
                    </button>
                  )}

                  {!!selected.scheduled_at && (
                    <button
                      onClick={handleUnschedule}
                      disabled={saving}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                        padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                        background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={13} />
                      Unschedule
                    </button>
                  )}
                </>
              )}

              {selected.status === 'published' && (
                <button
                  onClick={handleUnschedule}
                  disabled={saving}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                    background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} />
                  Move back to Approved
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .cal-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0.375rem 0.5rem', cursor: 'pointer',
  color: 'var(--text)',
}
