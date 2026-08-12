'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Star, Mail, MailOpen, Trash2, Reply, ChevronDown, X, Send, Loader2 } from 'lucide-react'

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

function ReplyComposer({
  email,
  onClose,
  onSent,
}: {
  email: Email
  onClose: () => void
  onSent: () => void
}) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [subject, setSubject] = useState(`Re: ${email.subject}`)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('email_templates')
      .select('*')
      .order('name')
      .then(({ data }) => setTemplates(data ?? []))
  }, [supabase])

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
        body: JSON.stringify({
          email_id: email.id,
          to: email.from_email,
          subject,
          body,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to send')
        return
      }
      onSent()
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t bg-muted/20">
      {/* Composer header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Reply size={14} className="text-primary" />
          <span className="text-sm font-medium">Reply to {email.from_name || email.from_email}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Template picker */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            >
              Templates
              <ChevronDown size={12} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">No templates</p>
                ) : (
                  templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className="w-full text-left text-sm px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      {tpl.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Subject */}
      <div className="px-5 pt-3 pb-1">
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full text-sm bg-transparent border-b border-border pb-2 focus:outline-none focus:border-primary transition-colors"
          placeholder="Subject"
        />
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          className="w-full text-sm bg-transparent resize-none focus:outline-none leading-relaxed placeholder:text-muted-foreground"
          placeholder="Write your reply..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 pb-4">
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!error && <span />}
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}

export function InboxClient({ emails: initialEmails }: { emails: Email[] }) {
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
    if (selected?.id === id) {
      setSelected(null)
      setReplying(false)
    }
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
    // Mark as read in local state too
    if (selected) {
      setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, read_at: e.read_at || new Date().toISOString() } : e))
    }
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
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      {/* Email list */}
      <div className="w-80 shrink-0 flex flex-col gap-1 overflow-y-auto">
        {emails.map(email => (
          <div
            key={email.id}
            onClick={() => openEmail(email)}
            className={`rounded-lg border p-3 cursor-pointer transition-all ${selected?.id === email.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'} ${!email.read_at ? 'border-l-2 border-l-primary' : ''}`}
          >
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
                <button
                  onClick={e => { e.stopPropagation(); toggleStar(email.id, email.starred) }}
                  className="text-muted-foreground hover:text-amber-400 transition-colors"
                >
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
            {/* Header */}
            <div className="p-5 border-b flex items-start justify-between gap-4 shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{selected.subject}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: <span className="text-foreground">{selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(selected.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setReplying(v => !v); setSentBanner(false) }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${replying ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                >
                  <Reply size={13} />
                  Reply
                </button>
                <button
                  onClick={() => toggleStar(selected.id, selected.starred)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Star size={16} className={selected.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'} />
                </button>
                <button
                  onClick={() => deleteEmail(selected.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Sent banner */}
            {sentBanner && (
              <div className="px-5 py-2.5 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
                <Send size={13} className="text-green-500" />
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Reply sent successfully.</p>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {selected.html ? (
                <iframe
                  srcDoc={selected.html}
                  className="w-full h-full border-none"
                  sandbox="allow-same-origin"
                  title="Email content"
                />
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                  {selected.text || '(no content)'}
                </pre>
              )}
            </div>

            {/* Reply composer */}
            {replying && (
              <ReplyComposer
                email={selected}
                onClose={() => setReplying(false)}
                onSent={handleReplySent}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MailOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm">Select an email to read it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
