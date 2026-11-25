'use client'

import { useEffect, useState } from 'react'

type Post = { id: string; title: string; body: string; campaign_type: string; platforms: string[]; status: string; scheduled_at: string | null; timezone: string; demo_mode: boolean; attribution_url: string | null }
const platforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'email']

export default function CampaignScheduler() {
  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('marketing')
  const [selected, setSelected] = useState<string[]>(['linkedin'])
  const [scheduledAt, setScheduledAt] = useState('')
  const [message, setMessage] = useState('')
  const load = async () => { const r = await fetch('/api/campaign-posts'); if (r.ok) setPosts((await r.json()).posts ?? []) }
  useEffect(() => { void load() }, [])
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('')
    const r = await fetch('/api/campaign-posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, campaign_type: type, platforms: selected, scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, demo_mode: true }) })
    const data = await r.json(); if (!r.ok) { setMessage(data.error || 'Unable to save post.'); return }
    setTitle(''); setBody(''); setScheduledAt(''); setMessage('Saved in demonstration mode. No external account is connected.'); await load()
  }
  const cancel = async (id: string) => { await fetch(`/api/campaign-posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'canceled' }) }); await load() }
  return <section className="card" style={{ marginTop: '1.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>Social Campaign Scheduler</h2><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.35rem 0 1rem' }}>Persistent demo workflow · America/Chicago · external publishing is not connected</p></div><span style={{ color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800 }}>DEMONSTRATION MODE</span></div>
    <form onSubmit={save} style={{ display: 'grid', gap: 10 }}><input className="input" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Campaign post title" /><textarea className="input" required value={body} onChange={e => setBody(e.target.value)} placeholder="Write the post content…" rows={4} /><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><select className="input" value={type} onChange={e => setType(e.target.value)} style={{ maxWidth: 180 }}><option value="marketing">Marketing</option><option value="recruitment">Recruitment</option><option value="advertising">Advertising</option><option value="announcement">Announcement</option><option value="general">General</option></select>{platforms.map(p => <label key={p} style={{ fontSize: '0.75rem', display: 'inline-flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={selected.includes(p)} onChange={() => setSelected(v => v.includes(p) ? v.filter(x => x !== p) : [...v, p])} />{p}</label>)}</div><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Schedule <input className="input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></label><button className="btn btn-primary" type="submit">Save post</button></div>{message && <p style={{ margin: 0, color: '#c4b5fd', fontSize: '0.8rem' }}>{message}</p>}</form>
    <div style={{ marginTop: '1.25rem', display: 'grid', gap: 8 }}>{posts.map(post => <div key={post.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><div style={{ flex: 1, minWidth: 220 }}><strong>{post.title}</strong><div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{post.platforms.join(' · ')}{post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleString()}` : ''}</div></div><span style={{ color: post.status === 'scheduled' ? '#c4b5fd' : post.status === 'canceled' ? '#f87171' : '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>{post.status}</span>{post.status === 'scheduled' && <button className="btn btn-ghost btn-sm" onClick={() => cancel(post.id)}>Cancel</button>}</div>)}</div>
  </section>
}
