'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import {
  Star, Mail, MailOpen, Trash2, Reply, ChevronDown, X, Send, Loader2,
  Plus, Pencil, Save, FileText, Inbox, RefreshCw, Sparkles, Check
} from 'lucide-react'

interface Email {
  id: string
  from_email: string
  from_name?: string
  to_email?: string
  subject: string
  text?: string
  html?: string
  read_at?: string
  starred: boolean
  created_at: string
}

interface Template {
  id: string
  name: string
  subject_prefix: string
  body: string
}

// ── Compose New Email Modal ──────────────────────────────────────────────────

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!to.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/emails/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send email')
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '95%', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(123,47,255,0.15)', border: '1px solid rgba(123,47,255,0.3)' }}>
              <Send size={16} color="#A066FF" />
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Compose New Email</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Recipient Email *</label>
            <input
              type="email"
              className="input"
              required
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="client@company.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Subject *</label>
            <input
              type="text"
              className="input"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Project Update & Scope Confirmation"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Message Body *</label>
            <textarea
              className="input"
              required
              rows={6}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your email here..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending || !to.trim() || !body.trim()}>
              {sending ? <span className="spinner" /> : <><Send size={13} style={{ marginRight: '4px' }} /> Send Email</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reply Composer ──────────────────────────────────────────────────────────

function ReplyComposer({ email, onClose, onSent }: { email: Email; onClose: () => void; onSent: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [subject, setSubject] = useState(`Re: ${email.subject}`)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/email-templates').then(r => r.json()).then(data => setTemplates(Array.isArray(data) ? data : []))
  }, [])

  function applyTemplate(tpl: Template) {
    const senderName = email.from_name?.split(' ')[0] || email.from_email.split('@')[0]
    setSubject(`${tpl.subject_prefix}${email.subject}`)
    setBody(tpl.body.replace(/\{\{name\}\}/g, senderName))
    setShowTemplates(false)
  }

  async function send() {
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/emails/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: email.id, to: email.from_email, subject, body }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to send'); return }
      onSent()
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t bg-muted/10 shrink-0" style={{ background: 'rgba(14, 14, 24, 0.95)', borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Reply size={13} className="text-primary" />
          <span className="text-sm font-medium">Reply to {email.from_name || email.from_email}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted transition-colors">
              Templates <ChevronDown size={11} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden" style={{ background: '#0E0E18', border: '1px solid var(--border)' }}>
                {templates.length === 0
                  ? <p className="text-xs text-muted-foreground px-3 py-2">No templates yet</p>
                  : templates.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-muted transition-colors border-b last:border-0">
                      {tpl.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-2.5 pb-1 border-b" style={{ borderColor: 'var(--border)' }}>
        <input value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full text-sm bg-transparent focus:outline-none text-muted-foreground focus:text-foreground transition-colors"
          placeholder="Subject" />
      </div>

      <div className="px-4 py-2.5">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
          className="w-full text-sm bg-transparent resize-none focus:outline-none leading-relaxed placeholder:text-muted-foreground/60"
          placeholder="Write your reply…" />
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        {error ? <p className="text-xs text-destructive" style={{ color: '#ef4444' }}>{error}</p> : <span />}
        <button onClick={send} disabled={sending || !body.trim()}
          className="btn btn-primary btn-sm">
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} style={{ marginRight: '4px' }} />}
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}

// ── Template Editor ──────────────────────────────────────────────────────────

function TemplateEditor({ template, onSave, onCancel }: {
  template: Partial<Template> | null; onSave: (t: Template) => void; onCancel: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [prefix, setPrefix] = useState(template?.subject_prefix ?? 'Re: ')
  const [body, setBody] = useState(template?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim() || !body.trim()) { setError('Name and body are required'); return }
    setSaving(true)
    setError('')
    const isEdit = !!template?.id
    const res = await fetch(isEdit ? `/api/email-templates/${template!.id}` : '/api/email-templates', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject_prefix: prefix, body }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); return }
    onSave(await res.json())
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4" style={{ background: '#0E0E18', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{template?.id ? 'Edit Template' : 'New Template'}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Template Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="input"
            placeholder="e.g. Thanks for reaching out" />
        </div>

        <div className="flex gap-3 items-start">
          <div className="w-36 shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject Prefix</label>
            <input value={prefix} onChange={e => setPrefix(e.target.value)}
              className="input"
              placeholder="Re: " />
          </div>
          <div className="flex-1 pt-6">
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{'{{name}}'}</code> for the sender's first name.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={7}
            className="input"
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
            placeholder={'Hi {{name}},\n\n\n\nBest,\nMatty'} />
        </div>
      </div>

      {error && <p className="text-xs text-destructive" style={{ color: '#ef4444' }}>{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} style={{ marginRight: '4px' }} />}
          {saving ? 'Saving…' : 'Save Template'}
        </button>
      </div>
    </div>
  )
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Template> | null | false>(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/email-templates')
    const data = await res.json()
    setTemplates(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteTemplate(id: string) {
    setDeleting(id)
    await fetch(`/api/email-templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  function handleSaved(saved: Template) {
    setTemplates(prev => {
      const exists = prev.find(t => t.id === saved.id)
      return exists ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved]
    })
    setEditing(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 size={18} className="animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setEditing({})}
          className="btn btn-primary btn-sm">
          <Plus size={13} style={{ marginRight: '4px' }} /> New Template
        </button>
      </div>

      {editing !== false && (editing as Template | null)?.id === undefined && (
        <TemplateEditor template={editing || null} onSave={handleSaved} onCancel={() => setEditing(false)} />
      )}

      {templates.length === 0 && editing === false && (
        <div className="rounded-xl border bg-card p-10 text-center" style={{ background: '#0E0E18', border: '1px solid var(--border)' }}>
          <FileText size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground text-sm">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create templates to quickly reply to common emails.</p>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(tpl => (
          <div key={tpl.id}>
            {editing && (editing as Template).id === tpl.id ? (
              <TemplateEditor template={tpl} onSave={handleSaved} onCancel={() => setEditing(false)} />
            ) : (
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4" style={{ background: '#0E0E18', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{tpl.name}</span>
                    <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tpl.subject_prefix}…</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap">
                    {tpl.body}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(tpl)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteTemplate(tpl.id)} disabled={deleting === tpl.id}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                    {deleting === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────────

function InboxTab({ emails: initialEmails }: { emails: Email[] }) {
  const [emails, setEmails] = useState(initialEmails)
  const [selected, setSelected] = useState<Email | null>(initialEmails[0] ?? null)
  const [replying, setReplying] = useState(false)
  const [sentBanner, setSentBanner] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const supabase = createClient()

  const reloadEmails = useCallback(async () => {
    setRefreshing(true)
    const { data } = await supabase
      .from('received_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setEmails(data)
      if (!selected && data.length > 0) setSelected(data[0])
    }
    setRefreshing(false)
  }, [supabase, selected])

  // Real-time: listen for new incoming emails
  useEffect(() => {
    const channel = supabase
      .channel('received_emails_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'received_emails' }, payload => {
        const newEmail = payload.new as Email
        setEmails(prev => [newEmail, ...prev])
        setSelected(prev => prev ?? newEmail)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'received_emails' }, payload => {
        setEmails(prev => prev.filter(e => e.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  async function markRead(id: string) {
    const ts = new Date().toISOString()
    await supabase.from('received_emails').update({ read_at: ts }).eq('id', id)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read_at: ts } : e))
  }

  async function toggleStar(id: string, starred: boolean) {
    await supabase.from('received_emails').update({ starred: !starred }).eq('id', id)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !starred } : e))
  }

  async function deleteEmail(id: string) {
    await supabase.from('received_emails').delete().eq('id', id)
    setEmails(prev => prev.filter(e => e.id !== id))
    if (selected?.id === id) { setSelected(null); setReplying(false) }
  }

  function openEmail(email: Email) {
    setSelected(email)
    setReplying(false)
    setSentBanner(false)
    if (!email.read_at) markRead(email.id)
  }

  function handleReplySent() {
    setReplying(false)
    setSentBanner(true)
    if (selected) setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, read_at: e.read_at || new Date().toISOString() } : e))
    setTimeout(() => setSentBanner(false), 4000)
  }

  async function handleSimulateTest() {
    setSimulating(true)
    try {
      const res = await fetch('/api/inbox/test-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: 'Schmidt Construction',
          fromEmail: 'mikiel@schmidt-construction.com',
          subject: 'Website deliverables and updates check-in',
          text: 'Hi Matty,\n\nFollowing up on our monthly deliverables and hosting setup. Everything looks great so far!\n\nBest,\nMikiel',
        }),
      })
      const json = await res.json()
      if (json.email) {
        setEmails(prev => [json.email, ...prev])
        setSelected(json.email)
      }
    } catch {
      // test simulation
    } finally {
      setSimulating(false)
    }
  }

  return (
    <>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={reloadEmails}
            disabled={refreshing}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.8125rem' }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} style={{ marginRight: '4px' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={handleSimulateTest}
            disabled={simulating}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.8125rem', color: '#00D4FF', borderColor: 'rgba(0, 212, 255, 0.3)' }}
          >
            {simulating ? <span className="spinner" /> : <><Sparkles size={13} style={{ marginRight: '4px' }} /> Simulate Test Email</>}
          </button>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="btn btn-primary btn-sm"
          style={{ fontSize: '0.8125rem' }}
        >
          <Plus size={13} style={{ marginRight: '4px' }} /> Compose Email
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center" style={{ background: '#0E0E18', border: '1px solid var(--border)' }}>
          <Mail size={36} className="mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground text-sm font-semibold">No emails in your inbox yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Emails sent to <code style={{ color: '#A066FF' }}>matty@purepulse.one</code> will appear here in real-time.</p>
          <button onClick={handleSimulateTest} className="btn btn-primary btn-sm">
            <Sparkles size={13} style={{ marginRight: '4px' }} /> Send a Test Email to Inbox
          </button>
        </div>
      ) : (
        <div className="flex gap-3 h-[calc(100vh-250px)]">
          {/* Email list */}
          <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto" style={{ borderRight: '1px solid var(--border)', paddingRight: '0.5rem' }}>
            {emails.map(email => {
              const isUnread = !email.read_at
              const isSelected = selected?.id === email.id
              return (
                <button key={email.id} onClick={() => openEmail(email)} className="w-full text-left">
                  <div
                    style={{
                      borderRadius: '10px',
                      padding: '10px 12px',
                      transition: 'all 0.15s ease',
                      background: isSelected ? 'rgba(123, 47, 255, 0.15)' : 'transparent',
                      border: isSelected ? '1px solid rgba(123, 47, 255, 0.4)' : '1px solid transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '0.875rem', fontWeight: isUnread ? 700 : 500, color: isUnread ? '#FFFFFF' : 'var(--text-muted)' }} className="truncate">
                          {email.from_name || email.from_email}
                        </p>
                        <p style={{ fontSize: '0.8125rem', marginTop: '2px', color: isUnread ? '#F4F4FF' : 'var(--text-dim)' }} className="truncate">
                          {email.subject}
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {formatDate(email.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); toggleStar(email.id, email.starred) }}
                          className="text-muted-foreground hover:text-amber-400 transition-colors"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <Star size={12} className={email.starred ? 'fill-amber-400 text-amber-400' : ''} />
                        </button>
                        {isUnread && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7B2FFF' }} />}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Email viewer */}
          <div className="flex-1 rounded-xl border overflow-hidden flex flex-col min-w-0" style={{ background: '#0E0E18', border: '1px solid var(--border)' }}>
            {selected ? (
              <>
                {/* Header */}
                <div className="px-5 py-4 border-b flex items-start justify-between gap-4 shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }} className="truncate">
                      {selected.subject}
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                      <strong style={{ color: '#F4F4FF' }}>{selected.from_name ? `${selected.from_name} ` : ''}</strong>
                      <span>&lt;{selected.from_email}&gt;</span>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {formatDate(selected.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setReplying(v => !v); setSentBanner(false) }}
                      className={`btn btn-sm ${replying ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Reply size={12} style={{ marginRight: '4px' }} /> Reply
                    </button>
                    <button
                      onClick={() => toggleStar(selected.id, selected.starred)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-1"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Star size={14} className={selected.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'} />
                    </button>
                    <button
                      onClick={() => deleteEmail(selected.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {sentBanner && (
                  <div style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.12)', borderBottom: '1px solid rgba(34, 197, 94, 0.25)', display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '0.8125rem' }}>
                    <Check size={13} />
                    <span>Reply sent successfully.</span>
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0" style={{ background: '#07070D' }}>
                  {selected.html ? (
                    <iframe
                      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{background:#07070D!important;color:#F4F4FF!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14.5px;line-height:1.6;padding:16px;margin:0;}a{color:#00D4FF;text-decoration:underline;}table{max-width:100%!important;}img{max-width:100%!important;border-radius:8px;}hr{border:0;border-top:1px solid rgba(244,244,255,0.1);margin:16px 0;}</style></head><body>${selected.html}</body></html>`}
                      className="w-full h-full border-none"
                      style={{ background: '#07070D', minHeight: '380px' }}
                      sandbox="allow-same-origin"
                      title="Email content"
                    />
                  ) : (
                    <pre style={{ fontSize: '0.875rem', fontFamily: 'inherit', color: '#F4F4FF', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {selected.text || '(no message content)'}
                    </pre>
                  )}
                </div>

                {replying && (
                  <ReplyComposer email={selected} onClose={() => setReplying(false)} onSent={handleReplySent} />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MailOpen size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-muted-foreground text-sm">Select an email to read it</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={() => {
            setComposeOpen(false)
            reloadEmails()
          }}
        />
      )}
    </>
  )
}

// ── Root Export ───────────────────────────────────────────────────────────────

export function InboxClient({ emails }: { emails: Email[] }) {
  const [tab, setTab] = useState<'inbox' | 'templates'>('inbox')
  const unread = emails.filter(e => !e.read_at).length

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5">
        <button
          onClick={() => setTab('inbox')}
          className={`btn btn-sm ${tab === 'inbox' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <Inbox size={14} />
          Inbox
          {unread > 0 && (
            <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '2px 6px', borderRadius: '100px', background: 'rgba(255,255,255,0.2)', color: '#FFF' }}>
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`btn btn-sm ${tab === 'templates' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <FileText size={14} />
          Templates
        </button>
      </div>

      {tab === 'inbox'
        ? <InboxTab emails={emails} />
        : <TemplatesTab />
      }
    </div>
  )
}
