'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X, Image, ExternalLink, Send, Clock, Check, RotateCcw } from 'lucide-react'

type SocialPost = {
  id: string
  title: string
  content: string | null
  social_caption: string | null
  social_image_url: string | null
  platform: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  campaign_id: string
  campaign_name: string
  client_name: string
}

const PLATFORMS = [
  { key: 'all',       label: 'All',       icon: '📋' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'facebook',  label: 'Facebook',  icon: '🔵' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
  { key: 'x',         label: 'X',         icon: '𝕏'  },
  { key: 'google',    label: 'Google',    icon: '🔍' },
]

const PLATFORM_COLORS: Record<string, { color: string; bg: string }> = {
  instagram: { color: '#e1306c', bg: 'rgba(225,48,108,0.1)' },
  facebook:  { color: '#1877f2', bg: 'rgba(24,119,242,0.1)' },
  linkedin:  { color: '#0a66c2', bg: 'rgba(10,102,194,0.1)' },
  x:         { color: '#e7e9ea', bg: 'rgba(231,233,234,0.08)' },
  google:    { color: '#4285f4', bg: 'rgba(66,133,244,0.1)' },
  website:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
}

const COLUMNS = [
  { key: 'queue',     label: 'Queue',     statuses: ['approved'],                color: '#f59e0b' },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'],               color: '#3b82f6' },
  { key: 'published', label: 'Published', statuses: ['published'],               color: '#10b981' },
]

function formatScheduled(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function SocialPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState('all')
  const [editPost, setEditPost] = useState<SocialPost | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [saving, setSaving] = useState(false)

  // edit modal fields
  const [editCaption, setEditCaption] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editStatus, setEditStatus] = useState('')

  // compose modal fields
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; client_name: string }[]>([])
  const [compCampaign, setCompCampaign] = useState('')
  const [compTitle, setCompTitle] = useState('')
  const [compPlatform, setCompPlatform] = useState('instagram')
  const [compCaption, setCompCaption] = useState('')
  const [compImageUrl, setCompImageUrl] = useState('')
  const [compScheduledAt, setCompScheduledAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [postsRes, campaignsRes] = await Promise.all([
      supabase
        .from('deliverables')
        .select('id, title, content, social_caption, social_image_url, platform, status, scheduled_at, published_at, campaign_id, campaigns(name, clients(name))')
        .eq('type', 'social_post')
        .in('status', ['approved', 'scheduled', 'published'])
        .order('scheduled_at', { ascending: true, nullsFirst: false }),
      supabase
        .from('campaigns')
        .select('id, name, clients(name)')
        .order('name'),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (postsRes.data ?? []) as any[]
    setPosts(raw.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      social_caption: r.social_caption,
      social_image_url: r.social_image_url,
      platform: r.platform ?? 'instagram',
      status: r.status,
      scheduled_at: r.scheduled_at,
      published_at: r.published_at,
      campaign_id: r.campaign_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      campaign_name: (r.campaigns as any)?.name ?? '—',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client_name: (r.campaigns as any)?.clients?.name ?? '—',
    })))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campRaw = (campaignsRes.data ?? []) as any[]
    setCampaigns(campRaw.map(c => ({
      id: c.id,
      name: c.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client_name: (c.clients as any)?.name ?? '—',
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!editPost) return
    setEditCaption(editPost.social_caption ?? editPost.content ?? '')
    setEditImageUrl(editPost.social_image_url ?? '')
    setEditScheduledAt(editPost.scheduled_at ? editPost.scheduled_at.slice(0, 16) : '')
    setEditStatus(editPost.status)
  }, [editPost])

  const filtered = useMemo(() =>
    platform === 'all' ? posts : posts.filter(p => p.platform === platform),
    [posts, platform]
  )

  async function saveEdit() {
    if (!editPost) return
    setSaving(true)
    const updates: Record<string, unknown> = {
      social_caption: editCaption || null,
      social_image_url: editImageUrl || null,
      status: editStatus,
    }
    if (editStatus === 'scheduled' && editScheduledAt) {
      updates.scheduled_at = new Date(editScheduledAt).toISOString()
    }
    if (editStatus === 'published' && !editPost.published_at) {
      updates.published_at = new Date().toISOString()
    }
    if (editStatus === 'approved') {
      updates.scheduled_at = null
    }
    await supabase.from('deliverables').update(updates).eq('id', editPost.id)
    setPosts(prev => prev.map(p => p.id === editPost.id ? {
      ...p,
      social_caption: editCaption || null,
      social_image_url: editImageUrl || null,
      status: editStatus,
      scheduled_at: editStatus === 'approved' ? null : (editScheduledAt ? new Date(editScheduledAt).toISOString() : p.scheduled_at),
      published_at: editStatus === 'published' && !p.published_at ? new Date().toISOString() : p.published_at,
    } : p))
    setEditPost(null)
    setSaving(false)
  }

  async function quickPublish(post: SocialPost) {
    const now = new Date().toISOString()
    await supabase.from('deliverables').update({ status: 'published', published_at: now }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'published', published_at: now } : p))
  }

  async function quickSchedule(post: SocialPost) {
    await supabase.from('deliverables').update({ status: 'scheduled' }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'scheduled' } : p))
  }

  async function unschedule(post: SocialPost) {
    await supabase.from('deliverables').update({ status: 'approved', scheduled_at: null }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'approved', scheduled_at: null } : p))
  }

  async function compose(e: React.FormEvent) {
    e.preventDefault()
    if (!compCampaign) return
    setSaving(true)
    const { data } = await supabase.from('deliverables').insert({
      campaign_id: compCampaign,
      title: compTitle.trim() || `${PLATFORMS.find(p => p.key === compPlatform)?.label} post`,
      type: 'social_post',
      platform: compPlatform,
      social_caption: compCaption.trim() || null,
      social_image_url: compImageUrl.trim() || null,
      scheduled_at: compScheduledAt ? new Date(compScheduledAt).toISOString() : null,
      status: compScheduledAt ? 'scheduled' : 'approved',
    }).select('id, title, content, social_caption, social_image_url, platform, status, scheduled_at, published_at, campaign_id, campaigns(name, clients(name))').single()
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = data as any
      setPosts(prev => [{
        id: r.id, title: r.title, content: r.content,
        social_caption: r.social_caption, social_image_url: r.social_image_url,
        platform: r.platform, status: r.status,
        scheduled_at: r.scheduled_at, published_at: r.published_at,
        campaign_id: r.campaign_id,
        campaign_name: r.campaigns?.name ?? '—',
        client_name: r.campaigns?.clients?.name ?? '—',
      }, ...prev])
    }
    setCompCampaign(''); setCompTitle(''); setCompPlatform('instagram')
    setCompCaption(''); setCompImageUrl(''); setCompScheduledAt('')
    setShowCompose(false)
    setSaving(false)
  }

  const queueCount = filtered.filter(p => p.status === 'approved').length
  const scheduledCount = filtered.filter(p => p.status === 'scheduled').length

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>
            Social Publishing
            {scheduledCount > 0 && <span className="badge badge-blue" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>{scheduledCount} scheduled</span>}
            {queueCount > 0 && <span className="badge badge-yellow" style={{ marginLeft: '0.375rem', verticalAlign: 'middle' }}>{queueCount} queued</span>}
          </h1>
          <p>Schedule and publish social posts across platforms.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCompose(true)}><Plus size={14} /> Compose</button>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className="btn btn-sm"
            style={{
              background: platform === p.key ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: `1px solid ${platform === p.key ? 'var(--border-strong)' : 'var(--border)'}`,
              fontWeight: platform === p.key ? 700 : 400,
              color: platform === p.key ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>{p.icon}</span>{p.label}
            {p.key !== 'all' && (
              <span style={{ marginLeft: '0.375rem', fontSize: '0.7rem', opacity: 0.7 }}>
                {posts.filter(x => x.platform === p.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const colPosts = filtered.filter(p => col.statuses.includes(p.status))
            return (
              <div key={col.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{colPosts.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {colPosts.map(post => {
                    const pc = PLATFORM_COLORS[post.platform] ?? PLATFORM_COLORS.instagram
                    const caption = post.social_caption ?? post.content ?? ''
                    return (
                      <div
                        key={post.id}
                        className="card"
                        style={{ padding: '1rem', cursor: 'pointer' }}
                        onClick={() => setEditPost(post)}
                      >
                        {/* Image preview */}
                        {post.social_image_url && (
                          <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.75rem', background: 'var(--bg-elevated)' }}>
                            <img src={post.social_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                        )}

                        {/* Platform + client */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pc.color, background: pc.bg, padding: '2px 8px', borderRadius: '100px' }}>
                            {PLATFORMS.find(p => p.key === post.platform)?.icon} {PLATFORMS.find(p => p.key === post.platform)?.label ?? post.platform}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{post.client_name}</span>
                        </div>

                        {/* Caption */}
                        {caption ? (
                          <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {caption}
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '0.5rem' }}>No caption yet — click to add one.</p>
                        )}

                        {/* Campaign */}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{post.campaign_name}</p>

                        {/* Scheduled time */}
                        {post.scheduled_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            <Clock size={11} />{formatScheduled(post.scheduled_at)}
                          </div>
                        )}
                        {post.published_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#10b981' }}>
                            <Check size={11} />Published {formatScheduled(post.published_at)}
                          </div>
                        )}

                        {/* Quick actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }} onClick={e => e.stopPropagation()}>
                          {post.status === 'approved' && (
                            <button className="btn btn-sm" style={{ flex: 1, fontSize: '0.75rem', gap: '4px' }} onClick={() => quickSchedule(post)}>
                              <Clock size={11} /> Schedule
                            </button>
                          )}
                          {post.status === 'scheduled' && (
                            <>
                              <button className="btn btn-sm" style={{ flex: 1, fontSize: '0.75rem', gap: '4px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }} onClick={() => quickPublish(post)}>
                                <Send size={11} /> Publish
                              </button>
                              <button className="btn btn-sm" style={{ fontSize: '0.75rem', gap: '4px' }} onClick={() => unschedule(post)}>
                                <RotateCcw size={11} />
                              </button>
                            </>
                          )}
                          {post.status === 'published' && (
                            <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={11} /> Live</span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {colPosts.length === 0 && (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8125rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                      {col.key === 'queue' ? 'No posts waiting — approve deliverables in Campaigns.' : `No ${col.label.toLowerCase()} posts.`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {editPost && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setEditPost(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', maxHeight: '90dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{editPost.title}</h2>
              <button onClick={() => setEditPost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Platform + client info */}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <span>{PLATFORMS.find(p => p.key === editPost.platform)?.icon} {PLATFORMS.find(p => p.key === editPost.platform)?.label ?? editPost.platform}</span>
                <span>·</span>
                <span>{editPost.client_name}</span>
                <span>·</span>
                <span>{editPost.campaign_name}</span>
              </div>

              {/* Caption */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Caption</label>
                <textarea
                  className="input"
                  rows={5}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Write your social caption…"
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{editCaption.length} characters</p>
              </div>

              {/* Image URL */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>
                  <Image size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />Image URL
                </label>
                <input className="input" style={{ width: '100%' }} placeholder="https://…" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} />
                {editImageUrl && (
                  <a href={editImageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <ExternalLink size={10} /> Preview
                  </a>
                )}
              </div>

              {/* Stage + Schedule */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Stage</label>
                  <select className="input" style={{ width: '100%' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="approved">Queue (approved)</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Scheduled for</label>
                  <input className="input" style={{ width: '100%' }} type="datetime-local" value={editScheduledAt} onChange={e => setEditScheduledAt(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setEditPost(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowCompose(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', maxHeight: '90dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Compose Post</h2>
              <button onClick={() => setShowCompose(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={compose} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Campaign *</label>
                <select className="input" style={{ width: '100%' }} required value={compCampaign} onChange={e => setCompCampaign(e.target.value)}>
                  <option value="">Select a campaign…</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.client_name} · {c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Platform</label>
                  <select className="input" style={{ width: '100%' }} value={compPlatform} onChange={e => setCompPlatform(e.target.value)}>
                    {PLATFORMS.filter(p => p.key !== 'all').map(p => <option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Title</label>
                  <input className="input" style={{ width: '100%' }} placeholder="Optional" value={compTitle} onChange={e => setCompTitle(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Caption</label>
                <textarea className="input" rows={5} style={{ width: '100%', resize: 'vertical' }} placeholder="Write your caption…" value={compCaption} onChange={e => setCompCaption(e.target.value)} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{compCaption.length} characters</p>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>
                  <Image size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />Image URL
                </label>
                <input className="input" style={{ width: '100%' }} placeholder="https://…" value={compImageUrl} onChange={e => setCompImageUrl(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Schedule for</label>
                <input className="input" style={{ width: '100%' }} type="datetime-local" value={compScheduledAt} onChange={e => setCompScheduledAt(e.target.value)} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Leave blank to add to queue without a scheduled time.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowCompose(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Add to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
