'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { ProjectDetail } from '@/lib/handoff-admin-data'
import { PREVIEW_IFRAME_SANDBOX, previewDisplayMode, type PreviewVersionKind } from '@/lib/handoff-previews'

const ACTIONS = [
  { id: 'pause', label: 'Pause pipeline', confirm: 'Type PAUSE to pause this project\'s pipeline.' },
  { id: 'resume', label: 'Resume pipeline', confirm: 'Type RESUME to resume this project\'s pipeline.' },
  { id: 'retry_request', label: 'Retry last request', confirm: 'Type RETRY to retry the last failed request.' },
  { id: 'escalate', label: 'Escalate', confirm: 'Type ESCALATE to escalate this project for human attention.' },
  { id: 'handoff_approve', label: 'Approve handoff (human gate)', confirm: 'Type APPROVE to record handoff approval.' },
] as const

type ActionId = (typeof ACTIONS)[number]['id']

function AgentSummary({ detail }: { detail: ProjectDetail }) {
  const agents = detail.agentStatus
  if (agents.length === 0) return null
  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Agent status</p>
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.625rem' }}>
        {agents.map(a => (
          <div key={a.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.8125rem', minWidth: '110px' }}>{a.agent}</span>
            <span style={{ fontSize: '0.8125rem', color: a.state === 'blocked' ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{a.state}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', flex: 1, minWidth: '200px' }}>{a.summary ?? ''}</span>
            {a.updated_at && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatDate(a.updated_at)}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProjectDetailClient({ detail }: { detail: ProjectDetail }) {
  const p = detail.project
  const [pendingAction, setPendingAction] = useState<ActionId | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [actionError, setActionError] = useState('')
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [auditEvents, setAuditEvents] = useState(detail.auditEvents)

  async function submitAction(action: ActionId) {
    setSubmitting(true)
    setActionError('')
    try {
      const res = await fetch('/api/handoff/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ action, projectId: p.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error ?? `Request failed (${res.status})`)
      } else {
        setQueuedNotice(`Command ${data.commandId} queued (${action}). It executes on the dashboard side; see audit trail.`)
        setAuditEvents(prev => [{
          id: data.commandId,
          project_id: p.id,
          actor: 'you',
          action: 'command_enqueued',
          target: `handoff_command:${data.commandId}`,
          metadata: { action, commandId: data.commandId },
          created_at: new Date().toISOString(),
        }, ...prev])
      }
    } catch {
      setActionError('Network error')
    } finally {
      setSubmitting(false)
      setPendingAction(null)
      setConfirmText('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <Link href="/handoff" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textDecoration: 'none' }}>← Server Handoff</Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', margin: '0.375rem 0 0' }}>{p.title || p.order_ref}</h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          {p.order_ref}{p.stage_label_layman ? ` · ${p.stage_label_layman}` : ''} · {p.progress_pct ?? 0}%{p.paused ? ' · paused' : ''}
        </p>
      </div>

      {/* Stage timeline */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Stage timeline</p>
        {detail.stageEvents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>No stage events yet.</p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: '0.625rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {detail.stageEvents.map(e => (
              <li key={e.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', minWidth: '140px' }}>{e.stage}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', flex: 1 }}>{e.note ?? ''}</span>
                {e.occurred_at && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatDate(e.occurred_at)}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Durable TODOs */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Durable TODOs ({detail.todos.filter(t => t.state === 'open').length} open / {detail.todos.length})
        </p>
        {detail.todos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>No TODOs replicated.</p>
        ) : (
          <ul style={{ margin: '0.625rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {detail.todos.map(t => (
              <li key={t.id} style={{ fontSize: '0.875rem', color: t.state === 'done' ? 'var(--text-muted)' : 'inherit', textDecoration: t.state === 'done' ? 'line-through' : 'none' }}>
                {t.content}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AgentSummary detail={detail} />

      {/* Links */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>References</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.625rem', fontSize: '0.8125rem' }}>
          {p.github_issue_url && <a href={p.github_issue_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00D4FF' }}>GitHub issue ↗</a>}
          {p.pr_url && (
            <a href={p.pr_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00D4FF' }}>
              Pull request ↗{p.pr_checks_state ? ` (checks: ${p.pr_checks_state})` : ''}
            </a>
          )}
          {p.security_verdict && (
            <span style={{ color: p.security_verdict === 'pass' ? '#22c55e' : p.security_verdict === 'fail' ? '#ef4444' : 'var(--text-muted)' }}>
              security verdict: {p.security_verdict}
              {p.security_reviewed_sha ? ` @ ${p.security_reviewed_sha.slice(0, 7)}` : ' (no reviewed SHA)'}
            </span>
          )}
          {p.human_gate_url && <a href={p.human_gate_url} target="_blank" rel="noopener noreferrer" style={{ color: '#a855f7' }}>Human gate ↗</a>}
          {!p.github_issue_url && !p.pr_url && !p.human_gate_url && !p.security_verdict && (
            <span style={{ color: 'var(--text-muted)' }}>No references replicated.</span>
          )}
        </div>
      </div>

      {/* Previews — sandboxed iframe or external tab only */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Previews</p>
        {detail.previews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>No previews replicated.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.625rem' }}>
            {detail.previews.map(pr => (
              <div key={pr.id}>
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: previewDisplayMode(pr.version_kind) === 'iframe' ? '0.375rem' : undefined, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, padding: '2px 9px', borderRadius: '100px',
                    background: pr.version_kind === 'released' ? 'rgba(34,197,94,0.12)' : pr.version_kind === 'staging' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                    color: pr.version_kind === 'released' ? '#22c55e' : pr.version_kind === 'staging' ? '#3b82f6' : '#f59e0b',
                  }}>{pr.version_kind}</span>
                  {!pr.visible_to_client && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>internal only</span>}
                  <a href={pr.url} target="_blank" rel="noopener noreferrer" style={{ color: '#00D4FF', fontSize: '0.8125rem' }}>Open in new tab ↗</a>
                </div>
                {previewDisplayMode(pr.version_kind as PreviewVersionKind) === 'iframe' && (
                  <iframe
                    src={pr.url}
                    title={`${pr.version_kind} preview`}
                    sandbox={PREVIEW_IFRAME_SANDBOX}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '420px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Authorized controls */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Controls</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.375rem 0 0.75rem' }}>
          Controls enqueue commands only; the dashboard picks them up and every acceptance is audited below.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {ACTIONS.map(a => (
            <button
              key={a.id}
              className="btn btn-ghost btn-sm"
              disabled={submitting}
              onClick={() => { setPendingAction(a.id); setConfirmText(''); setActionError(''); setQueuedNotice(null) }}
              style={{ fontSize: '0.8125rem' }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {queuedNotice && (
          <div role="status" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem', marginTop: '0.75rem', color: '#22c55e', fontSize: '0.8125rem' }}>
            {queuedNotice}
          </div>
        )}
        {actionError && (
          <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem', marginTop: '0.75rem', color: '#ef4444', fontSize: '0.8125rem' }}>
            {actionError}
          </div>
        )}

        {pendingAction && (
          <form
            onSubmit={e => { e.preventDefault(); submitAction(pendingAction) }}
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              {ACTIONS.find(a => a.id === pendingAction)?.confirm}
            </p>
            <input
              className="input"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={pendingAction.toUpperCase()}
              aria-label="Confirmation phrase"
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingAction(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || confirmText !== pendingAction.toUpperCase()}>
                {submitting ? <span className="spinner" /> : 'Queue command'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Audit trail */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Audit trail</p>
        {auditEvents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>No audit events.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.625rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {auditEvents.map(e => (
              <li key={e.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                {e.created_at && <span style={{ color: 'var(--text-muted)', minWidth: '150px' }}>{formatDate(e.created_at)}</span>}
                <span style={{ fontWeight: 600 }}>{e.actor ?? 'unknown'}</span>
                <span>{e.action}</span>
                <span style={{ color: 'var(--text-muted)' }}>{e.target}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
