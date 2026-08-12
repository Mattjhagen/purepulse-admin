'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import {
  Sparkles, ArrowLeft, Send, RotateCcw, Check, Edit2,
  Zap, ChevronDown, X, AlertCircle, Eye,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type DelivStatus =
  | 'draft' | 'ai_generated' | 'in_review'
  | 'revision_requested' | 'approved'
  | 'scheduled' | 'published' | 'archived'

interface Deliverable {
  id: string
  title: string
  type: string
  platform: string
  status: DelivStatus
  ai_content: Record<string, unknown> | null
  final_content: Record<string, unknown> | null
  client_notes: string | null
  revision_count: number
  milestone_id: string | null
  created_at: string
}

interface Milestone {
  id: string
  title: string
  status: string
  sort_order: number
}

interface Campaign {
  id: string
  name: string
  plan: string
  status: string
  client_id: string
  clients: { name: string } | null
}

interface Brief {
  ai_summary: string | null
  business_name: string | null
  industry: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<DelivStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:              { label: 'Draft',          color: '#9ca3af', bg: '#1f2937', border: '#374151' },
  ai_generated:       { label: 'AI Generated',   color: '#818cf8', bg: '#1e1b4b', border: '#3730a3' },
  in_review:          { label: 'With Client',    color: '#f59e0b', bg: '#2a1f05', border: '#92400e' },
  revision_requested: { label: 'Revision Needed',color: '#f87171', bg: '#2a0a0a', border: '#991b1b' },
  approved:           { label: 'Approved',       color: '#34d399', bg: '#022c1e', border: '#065f46' },
  scheduled:          { label: 'Scheduled',      color: '#a78bfa', bg: '#1a0a2e', border: '#5b21b6' },
  published:          { label: 'Published',      color: '#6b7280', bg: '#111827', border: '#374151' },
  archived:           { label: 'Archived',       color: '#4b5563', bg: '#0d0d0d', border: '#1f2937' },
}

const TYPE_LABELS: Record<string, string> = {
  social_post: 'Social Post', blog_post: 'Blog Post', webpage: 'Webpage',
  ad_copy: 'Ad Copy', email: 'Email', graphic_brief: 'Graphic Brief',
  video_script: 'Video Script', seo_report: 'SEO Report',
  analytics_report: 'Analytics', strategy_doc: 'Strategy',
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', facebook: '🔵', linkedin: '💼', x: '𝕏',
  google: '🔍', website: '🌐', email: '✉️',
}

interface FieldDef { key: string; label: string; kind: 'text' | 'textarea' | 'list' }

const CONTENT_FIELDS: Record<string, FieldDef[]> = {
  social_post: [
    { key: 'caption',          label: 'Caption',              kind: 'textarea' },
    { key: 'hashtags',         label: 'Hashtags (one per line)', kind: 'list' },
    { key: 'cta',              label: 'Call to Action',       kind: 'text' },
    { key: 'visual_direction', label: 'Visual Direction',     kind: 'textarea' },
  ],
  blog_post: [
    { key: 'headline',    label: 'Headline',                  kind: 'text' },
    { key: 'subheadline', label: 'Subheadline',               kind: 'text' },
    { key: 'intro',       label: 'Intro Paragraph',           kind: 'textarea' },
    { key: 'outline',     label: 'Outline (one item per line)', kind: 'list' },
    { key: 'cta',         label: 'Call to Action',            kind: 'text' },
  ],
  webpage: [
    { key: 'headline',    label: 'Headline',    kind: 'text' },
    { key: 'subheadline', label: 'Subheadline', kind: 'text' },
    { key: 'body',        label: 'Body',        kind: 'textarea' },
    { key: 'cta',         label: 'Call to Action', kind: 'text' },
  ],
  ad_copy: [
    { key: 'headline',    label: 'Headline',    kind: 'text' },
    { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'cta',         label: 'Call to Action', kind: 'text' },
    { key: 'keywords',    label: 'Keywords (one per line)', kind: 'list' },
  ],
  email: [
    { key: 'subject',      label: 'Subject Line',  kind: 'text' },
    { key: 'preview_text', label: 'Preview Text',  kind: 'text' },
    { key: 'headline',     label: 'Headline',      kind: 'text' },
    { key: 'body',         label: 'Body',          kind: 'textarea' },
    { key: 'cta',          label: 'Call to Action', kind: 'text' },
  ],
  seo_report: [
    { key: 'focus_keywords',   label: 'Focus Keywords (one per line)', kind: 'list' },
    { key: 'page_title',       label: 'Page Title',         kind: 'text' },
    { key: 'meta_description', label: 'Meta Description',   kind: 'textarea' },
    { key: 'h1',               label: 'H1 Heading',         kind: 'text' },
    { key: 'recommendations',  label: 'Recommendations (one per line)', kind: 'list' },
  ],
  analytics_report: [
    { key: 'summary',        label: 'Summary',                           kind: 'textarea' },
    { key: 'highlights',     label: 'Highlights (one per line)',         kind: 'list' },
    { key: 'recommendations',label: 'Recommendations (one per line)',    kind: 'list' },
  ],
  strategy_doc: [
    { key: 'executive_summary', label: 'Executive Summary',               kind: 'textarea' },
    { key: 'goals',             label: 'Goals (one per line)',            kind: 'list' },
    { key: 'channels',          label: 'Channels (one per line)',         kind: 'list' },
    { key: 'content_pillars',   label: 'Content Pillars (one per line)', kind: 'list' },
    { key: 'kpis',              label: 'KPIs (one per line)',             kind: 'list' },
  ],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPreview(d: Deliverable): string {
  const c = (d.final_content ?? d.ai_content) as Record<string, unknown> | null
  if (!c) return 'No content generated yet'
  const raw = (() => {
    switch (d.type) {
      case 'social_post': return c.caption
      case 'blog_post':   return c.headline
      case 'webpage':     return c.headline
      case 'ad_copy':     return c.headline
      case 'email':       return c.subject
      case 'seo_report':  return c.page_title
      case 'analytics_report': return c.summary
      case 'strategy_doc':     return c.executive_summary
      default: return null
    }
  })()
  if (typeof raw === 'string') return raw.length > 130 ? raw.slice(0, 130) + '…' : raw
  return 'Content generated'
}

function contentToForm(c: Record<string, unknown>, fields: FieldDef[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    const v = c[f.key]
    out[f.key] = f.kind === 'list'
      ? (Array.isArray(v) ? (v as string[]).join('\n') : typeof v === 'string' ? v : '')
      : typeof v === 'string' ? v : ''
  }
  return out
}

function formToContent(form: Record<string, string>, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    out[f.key] = f.kind === 'list'
      ? form[f.key].split('\n').map(s => s.trim()).filter(Boolean)
      : form[f.key]
  }
  return out
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const campaignId = params.id as string

  const [campaign,     setCampaign]     = useState<Campaign | null>(null)
  const [brief,        setBrief]        = useState<Brief | null>(null)
  const [milestones,   setMilestones]   = useState<Milestone[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading,      setLoading]      = useState(true)
  const [generating,   setGenerating]   = useState(false)

  // filters
  const [mFilter, setMFilter] = useState<'all' | string>('all')
  const [sFilter, setSFilter] = useState<'all' | DelivStatus>('all')

  // edit panel
  const [editing,     setEditing]   = useState<Deliverable | null>(null)
  const [editTitle,   setEditTitle] = useState('')
  const [editForm,    setEditForm]  = useState<Record<string, string>>({})
  const [saving,      setSaving]    = useState(false)

  // per-card action loading
  const [actioning, setActioning] = useState<string | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const [campaignRes, briefRes, milestonesRes, deliverablesRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, plan, status, client_id, clients(name)')
        .eq('id', campaignId)
        .single(),
      supabase
        .from('campaign_briefs')
        .select('ai_summary, business_name, industry')
        .eq('campaign_id', campaignId)
        .maybeSingle(),
      supabase
        .from('milestones')
        .select('id, title, status, sort_order')
        .eq('campaign_id', campaignId)
        .order('sort_order'),
      supabase
        .from('deliverables')
        .select('id, title, type, platform, status, ai_content, final_content, client_notes, revision_count, milestone_id, created_at')
        .eq('campaign_id', campaignId)
        .not('status', 'in', '("archived")')
        .order('created_at'),
    ])

    if (campaignRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = campaignRes.data as any
      setCampaign({
        id: raw.id, name: raw.name, plan: raw.plan, status: raw.status, client_id: raw.client_id,
        clients: Array.isArray(raw.clients) ? raw.clients[0] ?? null : raw.clients,
      })
    }
    if (briefRes.data) setBrief(briefRes.data as Brief)
    if (milestonesRes.data) setMilestones(milestonesRes.data as Milestone[])
    if (deliverablesRes.data) setDeliverables(deliverablesRes.data as Deliverable[])

    setLoading(false)
  }, [campaignId])

  useEffect(() => { loadData() }, [loadData])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate`, { method: 'POST' })
      if (res.ok) await loadData()
    } finally {
      setGenerating(false)
    }
  }

  async function patchDeliverable(id: string, body: Record<string, unknown>) {
    setActioning(id)
    try {
      await fetch(`/api/deliverables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      await loadData()
    } finally {
      setActioning(null)
    }
  }

  function openEdit(d: Deliverable) {
    const source = (d.final_content ?? d.ai_content) as Record<string, unknown> | null
    const fields = CONTENT_FIELDS[d.type] ?? []
    setEditing(d)
    setEditTitle(d.title)
    setEditForm(source ? contentToForm(source, fields) : Object.fromEntries(fields.map(f => [f.key, ''])))
  }

  async function handleSave(andSend = false) {
    if (!editing) return
    setSaving(true)
    const fields = CONTENT_FIELDS[editing.type] ?? []
    const final_content = formToContent(editForm, fields)
    const body: Record<string, unknown> = { title: editTitle, final_content }
    if (andSend) body.status = 'in_review'
    await patchDeliverable(editing.id, body)
    setSaving(false)
    setEditing(null)
  }

  // ── Filtered view ─────────────────────────────────────────────────────────

  const filtered = deliverables.filter(d => {
    if (mFilter !== 'all' && d.milestone_id !== mFilter) return false
    if (sFilter !== 'all' && d.status !== sFilter) return false
    return true
  })

  const counts: Partial<Record<DelivStatus, number>> = {}
  for (const d of deliverables) counts[d.status] = (counts[d.status] ?? 0) + 1

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  if (!campaign) {
    return <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Campaign not found.</div>
  }

  const planColors: Record<string, string> = {
    starter: '#6b7280', growth: '#3b82f6', premium: '#8b5cf6', business: '#f59e0b',
  }
  const planColor = planColors[campaign.plan] ?? '#6b7280'

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/campaigns')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', marginTop: '0.25rem' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>
              {campaign.clients?.name ?? 'Client'}
            </h1>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              textTransform: 'capitalize', background: planColor + '22',
              color: planColor, border: `1px solid ${planColor}44`,
            }}>
              {campaign.plan}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>{campaign.name}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
        >
          {generating ? (
            <><Sparkles size={15} />Generating…</>
          ) : (
            <><Zap size={15} />Generate Content</>
          )}
        </button>
      </div>

      {/* ── Brief summary ───────────────────────────────────────────────── */}
      {!!brief?.ai_summary && (
        <div style={{
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0f1a 100%)',
          border: '1px solid #3730a344', borderRadius: 10, padding: '1rem 1.25rem',
          marginBottom: '1.5rem', fontSize: '0.875rem', color: '#c4b5fd', lineHeight: 1.7,
        }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.375rem' }}>
            AI Brand Brief
          </span>
          {brief.ai_summary}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {(['all', 'ai_generated', 'in_review', 'revision_requested', 'approved'] as const).map(s => {
            const active = sFilter === s
            const meta = s === 'all' ? null : STATUS_META[s]
            const cnt  = s === 'all' ? deliverables.length : (counts[s] ?? 0)
            return (
              <button
                key={s}
                onClick={() => setSFilter(s)}
                style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                  border: active ? `1px solid ${meta?.border ?? '#444'}` : '1px solid var(--border)',
                  background: active ? (meta?.bg ?? 'rgba(255,255,255,0.06)') : 'transparent',
                  color: active ? (meta?.color ?? 'var(--text)') : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                {s === 'all' ? `All (${cnt})` : `${STATUS_META[s].label} ${cnt > 0 ? `(${cnt})` : ''}`}
              </button>
            )
          })}
        </div>

        {/* Milestone dropdown */}
        {milestones.length > 0 && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <select
              value={mFilter}
              onChange={e => setMFilter(e.target.value)}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '5px 32px 5px 12px', fontSize: '0.8125rem', color: 'var(--text)',
                cursor: 'pointer', appearance: 'none',
              }}
            >
              <option value="all">All Milestones</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* ── Deliverables grid ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          {deliverables.length === 0 ? (
            <>
              <Sparkles size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3, display: 'block' }} />
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No content yet</p>
              <p style={{ fontSize: '0.875rem' }}>Click &ldquo;Generate Content&rdquo; to have AI create marketing deliverables for this client.</p>
            </>
          ) : (
            <p>No deliverables match the current filter.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.875rem' }}>
          {filtered.map(d => {
            const meta    = STATUS_META[d.status] ?? STATUS_META.draft
            const preview = getPreview(d)
            const milestone = milestones.find(m => m.id === d.milestone_id)
            const isActioning = actioning === d.id
            const isRevision = d.status === 'revision_requested'
            const canSend = d.status === 'ai_generated' || d.status === 'revision_requested' || d.status === 'draft'
            const canRecall = d.status === 'in_review'

            return (
              <div
                key={d.id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0',
                  border: isRevision ? '1px solid #991b1b' : '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '0.625rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {PLATFORM_ICONS[d.platform] ?? '📄'} {TYPE_LABELS[d.type] ?? d.type}
                      </span>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700, padding: '1px 8px', borderRadius: 20,
                        background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                      }}>
                        {meta.label}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, lineHeight: 1.3 }}>{d.title}</p>
                  </div>
                </div>

                {/* Content preview */}
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1, marginBottom: '0.75rem' }}>
                  {preview}
                </p>

                {/* Client notes (revision) */}
                {!!d.client_notes && isRevision && (
                  <div style={{
                    background: '#2a0a0a', border: '1px solid #991b1b44', borderRadius: 6,
                    padding: '0.625rem 0.75rem', marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                      <AlertCircle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#f87171', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client Feedback</p>
                        <p style={{ fontSize: '0.8125rem', color: '#fca5a5', lineHeight: 1.5, margin: 0 }}>{d.client_notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Milestone label */}
                {!!milestone && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    📍 {milestone.title}
                    {d.revision_count > 0 && ` · ${d.revision_count} revision${d.revision_count > 1 ? 's' : ''}`}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {d.status === 'approved' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#34d399', fontSize: '0.8125rem', fontWeight: 600 }}>
                      <Check size={14} /> Approved by client
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(d)}
                        disabled={isActioning}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                          padding: '0.5rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                          background: isRevision ? '#2a0a0a' : 'rgba(255,255,255,0.04)',
                          border: isRevision ? '1px solid #991b1b' : '1px solid var(--border)',
                          color: isRevision ? '#f87171' : 'var(--text)',
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>

                      {canSend && (
                        <button
                          onClick={() => patchDeliverable(d.id, { status: 'in_review' })}
                          disabled={isActioning}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                            padding: '0.5rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                            background: '#7B2FFF', border: '1px solid #7B2FFF', color: '#fff',
                            opacity: isActioning ? 0.6 : 1,
                          }}
                        >
                          <Send size={13} />
                          {isActioning ? '…' : isRevision ? 'Re-send' : 'Send to Client'}
                        </button>
                      )}

                      {canRecall && (
                        <>
                          <button
                            onClick={() => openEdit(d)}
                            disabled={isActioning}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                              padding: '0.5rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text)',
                            }}
                          >
                            <Edit2 size={13} />Edit
                          </button>
                          <button
                            onClick={() => patchDeliverable(d.id, { status: 'ai_generated' })}
                            disabled={isActioning}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                              padding: '0.5rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
                            }}
                          >
                            <RotateCcw size={13} />
                            {isActioning ? '…' : 'Recall'}
                          </button>
                        </>
                      )}

                      {d.status === 'published' && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Eye size={13} />Published
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Edit panel (right drawer) ────────────────────────────────────── */}
      {!!editing && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setEditing(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49,
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(600px, 100vw)',
            background: '#0d0d0d', borderLeft: '1px solid var(--border)',
            zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                  Editing · {TYPE_LABELS[editing.type] ?? editing.type}
                </p>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: '1rem', fontWeight: 600, color: 'var(--text)', padding: 0,
                  }}
                  placeholder="Deliverable title…"
                />
              </div>
              <button
                onClick={() => setEditing(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {(CONTENT_FIELDS[editing.type] ?? []).map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                    {f.label}
                  </label>
                  {f.kind === 'textarea' || f.kind === 'list' ? (
                    <textarea
                      value={editForm[f.key] ?? ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      rows={f.kind === 'list' ? 5 : 6}
                      style={{
                        width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                        color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <input
                      value={editForm[f.key] ?? ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{
                        width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                        color: 'var(--text)', boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
              ))}

              {(CONTENT_FIELDS[editing.type] ?? []).length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No editable fields defined for this content type.
                </p>
              )}
            </div>

            {/* Panel footer */}
            <div style={{
              display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)', flexShrink: 0,
            }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                  color: 'var(--text)', cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{
                  flex: 2, padding: '0.625rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                  background: '#7B2FFF', border: '1px solid #7B2FFF', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Send size={14} />
                {saving ? 'Saving…' : 'Save & Send to Client'}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 640px) {
          .deliverables-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
