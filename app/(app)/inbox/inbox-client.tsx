'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Star, Mail, MailOpen, Trash2 } from 'lucide-react'

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

export function InboxClient({ emails: initialEmails }: { emails: Email[] }) {
  const [emails, setEmails] = useState(initialEmails)
  const [selected, setSelected] = useState<Email | null>(null)
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
    if (selected?.id === id) setSelected(null)
  }

  function openEmail(email: Email) {
    setSelected(email)
    if (!email.read_at) markRead(email.id)
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
            <div className="p-5 border-b flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{selected.subject}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: <span className="text-foreground">{selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(selected.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`mailto:${selected.from_email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
                >
                  Reply
                </a>
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
            <div className="flex-1 overflow-y-auto p-5">
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
