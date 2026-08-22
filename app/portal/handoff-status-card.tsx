'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, ExternalLink, PauseCircle } from 'lucide-react'

type PortalStatus = {
  id: string
  title: string | null
  stage_label_layman: string | null
  progress_pct: number | null
  paused: boolean
  current_milestone: string | null
  next_milestone: string | null
  preview_status: string | null
  released_preview_url: string | null
  last_agent_update: string | null
  open_requests: { id: string; question: string }[]
}

const STALE_MS = 15 * 60 * 1000

function timeAgo(iso: string | null, nowMs: number): string {
  if (!iso) return 'a while'
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 'a while'
  const mins = Math.max(0, Math.floor((nowMs - ts) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''} ago`
}

// Client-facing project status. The server endpoint scopes to the signed-in
// client's own project(s) and never returns producer internals; this card only
// renders that sanitized projection.
export default function HandoffStatusCard() {
  const [projects, setProjects] = useState<PortalStatus[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [nowTs, setNowTs] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/handoff/status')
      if (res.status === 200) {
        const data = await res.json()
        setProjects(Array.isArray(data.projects) ? data.projects : [])
        setFailed(false)
      } else if (res.status === 404 || res.status === 403) {
        setProjects([])
        setFailed(false)
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    }
    setNowTs(Date.now())
  }, [])

  // Deferred so state updates happen outside the effect body (async).
  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  // RLS denies postgres_changes delivery for portal users by design, so keep
  // the card fresh with periodic server re-fetches.
  useEffect(() => {
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (failed) {
    return (
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', borderColor: 'rgba(245,158,11,0.35)' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#f59e0b' }}>Live status is temporarily unavailable. Your project work continues in the background.</p>
      </div>
    )
  }

  if (projects === null || nowTs === null) {
    return (
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', textAlign: 'center' }}>
        <span className="spinner" style={{ margin: '0 auto' }} />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No active build project yet — status will appear here once your project kicks off.
        </p>
      </div>
    )
  }

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {projects.map(p => {
        const lastUpdated = p.last_agent_update ? Date.parse(p.last_agent_update) : NaN
        const stale = Number.isNaN(lastUpdated) || nowTs - lastUpdated > STALE_MS
        return (
          <section key={p.id} className="card-elevated" aria-label="Project status">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>{p.title || 'Your project'}</h2>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '100px',
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                background: stale ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.1)',
                color: stale ? '#f59e0b' : '#22c55e',
              }}>
                <Clock size={11} />
                updated {timeAgo(p.last_agent_update, nowTs)}
                {stale && ' · stale'}
              </span>
            </div>

            <p style={{ margin: 0, fontWeight: 600 }}>{p.stage_label_layman || 'In progress'}</p>

            {p.paused && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <PauseCircle size={14} /> Paused — waiting to resume
              </p>
            )}

            <div style={{ height: '10px', borderRadius: '100px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: '0.75rem' }} role="progressbar" aria-valuenow={p.progress_pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div style={{
                width: `${p.progress_pct ?? 0}%`, height: '100%', borderRadius: '100px', background: '#7B2FFF',
                transition: reduceMotion ? 'none' : 'width 0.4s ease',
              }} />
            </div>
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{p.progress_pct ?? 0}% complete</p>

            {(p.current_milestone || p.next_milestone) && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {p.current_milestone && (
                  <span><strong>Now:</strong> {p.current_milestone}</span>
                )}
                {p.next_milestone && (
                  <span style={{ color: 'var(--text-muted)' }}><strong>Next:</strong> {p.next_milestone}</span>
                )}
              </div>
            )}

            {p.open_requests.length > 0 && (
              <div style={{ marginTop: '0.75rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem' }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#3b82f6' }}>We need your input ({p.open_requests.length})</p>
                <ul style={{ margin: '0.375rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8125rem' }}>
                  {p.open_requests.map(r => <li key={r.id}>{r.question}</li>)}
                </ul>
              </div>
            )}

            {p.preview_status === 'released' && p.released_preview_url && (
              <a
                href={p.released_preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ marginTop: '0.875rem', textDecoration: 'none' }}
              >
                View your site preview <ExternalLink size={13} />
              </a>
            )}
          </section>
        )
      })}
    </div>
  )
}
