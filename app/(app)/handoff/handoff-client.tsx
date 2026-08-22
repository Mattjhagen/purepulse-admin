'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { HandoffProjectRow } from '@/lib/handoff-admin-data'

const STALE_MS = 15 * 60 * 1000

function isStale(lastAgentUpdate: string | null): boolean {
  if (!lastAgentUpdate) return true
  const ts = Date.parse(lastAgentUpdate)
  return Number.isNaN(ts) || Date.now() - ts > STALE_MS
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 'unknown'
  const diff = Math.max(0, Date.now() - ts)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const badgeBase: React.CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 700, padding: '2px 9px',
  borderRadius: '100px', whiteSpace: 'nowrap', letterSpacing: '0.02em',
}

function PreviewBadge({ status }: { status: string | null }) {
  const s = status ?? 'none'
  const styles: Record<string, React.CSSProperties> = {
    none: { ...badgeBase, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' },
    draft: { ...badgeBase, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    staging: { ...badgeBase, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    released: { ...badgeBase, background: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  }
  return <span style={styles[s]}>{s === 'none' ? 'no preview' : `preview: ${s}`}</span>
}

export default function HandoffClient({ initialProjects }: { initialProjects: HandoffProjectRow[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [offline, setOffline] = useState(false)
  const [, forceTick] = useState(0)

  // Realtime: mirror handoff_projects changes into the list (admin RLS allows
  // postgres_changes delivery for admin-convention sessions).
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('handoff_projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handoff_projects' }, payload => {
        setOffline(false)
        const next = payload.new as HandoffProjectRow | null
        const old = payload.old as { id?: string } | null
        setProjects(prev => {
          if (!next?.id) return prev.filter(p => p.id !== old?.id)
          const exists = prev.some(p => p.id === next.id)
          if (exists) return prev.map(p => p.id === next.id ? { ...p, ...next } : p)
          return [next, ...prev]
        })
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setOffline(true)
      })
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Refresh "updated X ago" labels periodically.
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const stages = useMemo(
    () => Array.from(new Set(projects.map(p => p.current_stage).filter((s): s is string => !!s))).sort(),
    [projects],
  )
  const clients = useMemo(
    () => Array.from(new Set(projects.map(p => p.client_id).filter((c): c is string => !!c))).sort(),
    [projects],
  )

  const filtered = projects.filter(p => {
    const hay = `${p.title ?? ''} ${p.order_ref}`.toLowerCase()
    if (search && !hay.includes(search.toLowerCase())) return false
    if (stageFilter !== 'all' && p.current_stage !== stageFilter) return false
    if (clientFilter !== 'all' && p.client_id !== clientFilter) return false
    if (statusFilter === 'paused' && !p.paused) return false
    if (statusFilter === 'awaiting-human' && !p.human_gate_url) return false
    if (statusFilter === 'stale' && !isStale(p.last_agent_update)) return false
    if (statusFilter === 'active' && (p.paused || p.human_gate_url)) return false
    return true
  })

  const reload = useCallback(() => { router.refresh() }, [router])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>Server Handoff</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Sanitized pipeline state replicated from the workflow dashboard.</p>
        </div>
        <button onClick={reload} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8125rem' }}>Refresh</button>
      </div>

      {offline && (
        <div role="status" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem', marginBottom: '1rem', color: '#f59e0b', fontSize: '0.8125rem' }}>
          Live connection unavailable — showing last known state.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <input
          className="input"
          placeholder="Search title or order ref…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '280px' }}
          aria-label="Search handoff projects"
        />
        <select className="input" value={stageFilter} onChange={e => setStageFilter(e.target.value)} aria-label="Filter by stage" style={{ maxWidth: '180px' }}>
          <option value="all">All stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status" style={{ maxWidth: '180px' }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="awaiting-human">Awaiting human</option>
          <option value="stale">Stale</option>
        </select>
        <select className="input" value={clientFilter} onChange={e => setClientFilter(e.target.value)} aria-label="Filter by client" style={{ maxWidth: '220px' }}>
          <option value="all">All clients</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>No handoff projects{projects.length > 0 ? ' match the filters' : ''}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            State appears here once the dashboard pushes to the ingest endpoint.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(p => {
            const stale = isStale(p.last_agent_update)
            return (
              <Link
                key={p.id}
                href={`/handoff/${p.id}`}
                className="card"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '1rem 1.25rem', border: '1px solid var(--border)', transition: 'border-color 0.12s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || p.order_ref}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.2rem 0 0' }}>
                      {p.order_ref}{p.current_stage ? ` · ${p.stage_label_layman || p.current_stage}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {p.paused && <span style={{ ...badgeBase, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>paused</span>}
                    {p.human_gate_url && !p.paused && <span style={{ ...badgeBase, background: 'rgba(168,85,247,0.14)', color: '#a855f7' }}>awaiting human</span>}
                    {stale && <span style={{ ...badgeBase, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>stale · {timeAgo(p.last_agent_update)}</span>}
                    {!stale && <span style={{ ...badgeBase, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>updated {timeAgo(p.last_agent_update)}</span>}
                    <PreviewBadge status={p.preview_status} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '100px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${p.progress_pct ?? 0}%`, height: '100%', borderRadius: '100px',
                      background: stale ? '#f59e0b' : '#7B2FFF',
                      transition: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'none' : 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: '42px', textAlign: 'right' }}>{p.progress_pct ?? 0}%</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>synced {formatDate(p.updated_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
