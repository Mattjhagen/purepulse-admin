'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import {
  Star, Mail, MailOpen, Trash2, Reply, ChevronDown, X, Send, Loader2,
  Plus, Pencil, Save, FileText, Inbox,
} from 'lucide-react'

interface Email {
  id: string
  from_email: string
  from_name?: string
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
    <div className="border-t bg-muted/20">
      <div className="flex items-center justify-between px-5 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Reply size={14} className="text-primary" />
          <span className="text-sm font-medium">Reply to {email.from_name || email.from_email}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            >
              Templates <ChevronDown size={12} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
                {templates.length === 0
                  ? <p className="text-xs text-muted-foreground px-3 py-2">No templates</p>
                  : templates.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                      className="w-full text-left text-sm px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0">
                      {tpl.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-3 pb-1">
        <input value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full text-sm bg-transparent border-b border-border pb-2 focus:outline-none focus:border-primary transition-colors"
          placeholder="Subject" />
      </div>

      <div className="px-5 py-3">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
          className="w-full text-sm bg-transparent resize-none focus:outline-none leading-relaxed placeholder:text-muted-foreground"
          placeholder="Write your reply…" />
      </div>

      <div className="flex items-center justify-between px-5 pb-4">
        {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
        <button onClick={send} disabled={sending || !body.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}

// ── Template Editor ──────────────────────────────────────────────────────────

function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: Partial<Template> | null
  onSave: (t: Template) => void
  onCancel: () => void
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
    const url = isEdit ? `/api/email-templates/${template!.id}` : '/api/email-templates'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject_prefix: prefix, body }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); return }
    const saved = await res.json()
    onSave(saved)
  }

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{template?.id ? 'Edit Template' : 'New Template'}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            placeholder="e.g. Thanks for reaching out" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject Prefix</label>
          <input value={prefix} onChange={e => setPrefix(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            placeholder="Re: " />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 py-0.5 rounded">{'{{name}}'}</code> to insert the sender's first name.</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
          className="w-full text-sm px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-y font-mono leading-relaxed"
          placeholder="Hi {{name}},&#10;&#10;…" />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border text-sm hover:bg-muted transition-colors">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
      <Loader2 size={20} className="animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {editing !== false && (
        <TemplateEditor
          template={editing || null}
          onSave={handleSaved}
          onCancel={() => setEditing(false)}
        />
      )}

      {templates.length === 0 && editing === false && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <FileText size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground text-sm">No templates yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create templates to quickly reply to common emails.</p>
        </div>
      )}

      <div className="grid gap-3">
        {templates.map(tpl => (
          <div key={tpl.id} className="rounded-xl border bg-card p-4">
            {editing && (editing as Template).id === tpl.id ? null : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{tpl.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">{tpl.subject_prefix}…</span>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans line-clamp-3 leading-relaxed">
                    {tpl.body}
                  </pre>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(tpl)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(tpl.id)}
                    disabled={deleting === tpl.id}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {deleting === tpl.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            )}
            {editing && (editing as Template).id === tpl.id && (
              <TemplateEditor template={tpl} onSave={handleSaved} onCancel={() => setEditing(false)} />
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
  const [selected, setSelected] = useState<Email | null>(null)
  const [replying, setReplying] = useState(false)
  const [sentBanner, setSentBanner] = useState(false)
  const supabase = createClient()

  async function markRead(id: string) {
    await supabase.from('received_emails').update({ read_at: new Date().toISOString() }).eq('id', id)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read_at: new Date().toISOString() } : e))
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

  if (emails.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <Mail size={40} className="mx-auto mb-4 opacity-20" />
        <p className="text-muted-foreground">No emails yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Emails sent to matty@purepulse.one will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)]">
      {/* Email list */}
      <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
        {emails.map(email => (
          <div key={email.id} onClick={() => openEmail(email)}
            className={`rounded-xl border p-3 cursor-pointer transition-all ${selected?.id === email.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40 border-transparent bg-card'} ${!email.read_at ? 'border-l-2 border-l-primary' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${!email.read_at ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                  {email.from_name || email.from_email}
                </p>
                <p className={`text-xs truncate mt-0.5 ${!email.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {email.subject}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(email.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <button onClick={e => { e.stopPropagation(); toggleStar(email.id, email.starred) }}
                  className="text-muted-foreground hover:text-amber-400 transition-colors">
                  <Star size={12} className={email.starred ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                {!email.read_at && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email viewer */}
      <div className="flex-1 rounded-xl border bg-card overflow-hidden flex flex-col">
        {selected ? (
          <>
            <div className="p-5 border-b flex items-start justify-between gap-4 shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base leading-snug">{selected.subject}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: <span className="text-foreground">{selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(selected.created_at)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => { setReplying(v => !v); setSentBanner(false) }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${replying ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                  <Reply size={13} /> Reply
                </button>
                <button onClick={() => toggleStar(selected.id, selected.starred)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Star size={15} className={selected.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'} />
                </button>
                <button onClick={() => deleteEmail(selected.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {sentBanner && (
              <div className="px-5 py-2.5 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
                <Send size={13} className="text-green-500" />
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Reply sent successfully.</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {selected.html ? (
                <iframe
                  srcDoc={`<!doctype html><html><head><style>body{font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;padding:0;margin:0;}</style></head><body>${selected.html}</body></html>`}
                  className="w-full h-full border-none rounded-lg"
                  sandbox="allow-same-origin"
                  title="Email content"
                />
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                  {selected.text || '(no content)'}
                </pre>
              )}
            </div>

            {replying && (
              <ReplyComposer email={selected} onClose={() => setReplying(false)} onSent={handleReplySent} />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MailOpen size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm">Select an email to read it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Root Export ───────────────────────────────────────────────────────────────

export function InboxClient({ emails }: { emails: Email[] }) {
  const [tab, setTab] = useState<'inbox' | 'templates'>('inbox')
  const unread = emails.filter(e => !e.read_at).length

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 bg-muted/40 rounded-xl w-fit">
        <button
          onClick={() => setTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'inbox' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Inbox size={15} />
          Inbox
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'templates' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText size={15} />
          Templates
        </button>
      </div>

      {tab === 'inbox' ? <InboxTab emails={emails} /> : <TemplatesTab />}
    </div>
  )
}
