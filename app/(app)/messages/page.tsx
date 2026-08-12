'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Client } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { MessageCircle, Search, Send, Inbox, Star, Mail } from 'lucide-react'

type Message = {
  id: string
  client_id: string
  sender: 'admin' | 'client'
  sender_name: string
  body: string
  read_at: string | null
  created_at: string
}

type Thread = {
  client: Client
  messages: Message[]
  unread: number
}

type ReceivedEmail = {
  id: string
  resend_id: string | null
  from_email: string
  from_name: string | null
  to_email: string
  subject: string
  html: string | null
  text: string | null
  read_at: string | null
  starred: boolean
  created_at: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d`
  return formatDate(iso)
}

// ─── Chat tab ───────────────────────────────────────────────────────────────

function ChatTab({ clients }: { clients: Client[] }) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('client_messages')
      .select('*')
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Real-time: append new messages
  useEffect(() => {
    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'client_messages' },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === (payload.new as Message).id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // Auto-scroll on new messages or thread switch
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedClientId, messages.length])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [draft])

  const threads = useMemo(() => {
    const byClient = new Map<string, Message[]>()
    for (const m of messages) {
      const list = byClient.get(m.client_id) ?? []
      list.push(m)
      byClient.set(m.client_id, list)
    }
    const list: Thread[] = clients
      .filter(c => byClient.has(c.id))
      .map(c => {
        const msgs = byClient.get(c.id) ?? []
        return { client: c, messages: msgs, unread: msgs.filter(m => m.sender === 'client' && !m.read_at).length }
      })
    list.sort((a, b) => {
      const at = a.messages[a.messages.length - 1]?.created_at ?? ''
      const bt = b.messages[b.messages.length - 1]?.created_at ?? ''
      return bt.localeCompare(at)
    })
    return list
  }, [clients, messages])

  const filteredThreads = threads.filter(t =>
    search === '' || t.client.name.toLowerCase().includes(search.toLowerCase())
  )
  const clientsWithoutThread = clients.filter(c =>
    !threads.some(t => t.client.id === c.id) &&
    (search === '' || c.name.toLowerCase().includes(search.toLowerCase()))
  )
  const selected = threads.find(t => t.client.id === selectedClientId)
  const selectedClient = selected?.client ?? clients.find(c => c.id === selectedClientId)

  async function openThread(clientId: string) {
    setSelectedClientId(clientId)
    const unreadIds = messages
      .filter(m => m.client_id === clientId && m.sender === 'client' && !m.read_at)
      .map(m => m.id)
    if (unreadIds.length === 0) return
    await supabase.from('client_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    setMessages(prev =>
      prev.map(m => unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m)
    )
  }

  async function sendMessage() {
    if (!selectedClientId || !draft.trim() || sending) return
    setSending(true)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClientId,
        sender: 'admin',
        sender_name: 'Matty',
        body: draft.trim(),
      }),
    })
    setDraft('')
    setSending(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', gap: '1.25rem', height: 'calc(100dvh - 260px)', minHeight: '420px' }}>
      {/* Thread list */}
      <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input input-sm"
            style={{ paddingLeft: '2.25rem', width: '100%' }}
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {filteredThreads.map(t => {
            const last = t.messages[t.messages.length - 1]
            const isSelected = selectedClientId === t.client.id
            return (
              <div
                key={t.client.id}
                onClick={() => openThread(t.client.id)}
                className="card"
                style={{
                  padding: '0.75rem', cursor: 'pointer',
                  background: isSelected ? 'var(--bg-card-hover)' : undefined,
                  borderColor: isSelected ? 'var(--border-strong)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <p style={{ fontWeight: t.unread > 0 ? 700 : 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.client.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                    {last && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{relTime(last.created_at)}</span>}
                    {t.unread > 0 && (
                      <span style={{ background: 'var(--accent-red)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0 6px', borderRadius: '100px', minWidth: '18px', textAlign: 'center' }}>{t.unread}</span>
                    )}
                  </div>
                </div>
                {last && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {last.sender === 'admin' ? 'You: ' : ''}{last.body}
                  </p>
                )}
              </div>
            )
          })}

          {clientsWithoutThread.length > 0 && (
            <>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.5rem 0.25rem 0.125rem' }}>New conversation</p>
              {clientsWithoutThread.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className="card"
                  style={{
                    padding: '0.75rem', cursor: 'pointer',
                    background: selectedClientId === c.id ? 'var(--bg-card-hover)' : undefined,
                    borderColor: selectedClientId === c.id ? 'var(--border-strong)' : undefined,
                  }}
                >
                  <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{c.email}</p>
                </div>
              ))}
            </>
          )}

          {filteredThreads.length === 0 && clientsWithoutThread.length === 0 && (
            <div className="empty-state"><p>No clients found.</p></div>
          )}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {!selectedClient ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <MessageCircle size={32} />
            <p>Select a client to view the conversation.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 700 }}>{selectedClient.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{selectedClient.email}</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(selected?.messages ?? []).length === 0 ? (
                <div className="empty-state" style={{ margin: 'auto' }}>
                  <MessageCircle size={28} />
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : selected!.messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', border: '1px solid var(--border)', padding: '0.625rem 0.875rem',
                    background: m.sender === 'admin' ? '#fff' : 'var(--bg-elevated)',
                    borderRadius: m.sender === 'admin' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  }}>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, color: m.sender === 'admin' ? '#080808' : 'var(--text)', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                    <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: m.sender === 'admin' ? 'rgba(8,8,8,0.45)' : 'var(--text-muted)' }}>{relTime(m.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)', alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                className="input"
                style={{ flex: 1, resize: 'none', minHeight: '40px', maxHeight: '120px', lineHeight: 1.5, overflow: 'auto' }}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply as Matty… (Enter to send, Shift+Enter for new line)"
                rows={1}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={sending || !draft.trim()}
                style={{ flexShrink: 0 }}
              >
                {sending ? <span className="spinner" /> : <><Send size={14} /> Send</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Inbox tab ───────────────────────────────────────────────────────────────

function InboxTab() {
  const supabase = createClient()
  const [emails, setEmails] = useState<ReceivedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('received_emails')
      .select('*')
      .order('created_at', { ascending: false })
    setEmails(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function openEmail(email: ReceivedEmail) {
    setSelectedId(email.id)
    if (email.read_at) return
    await supabase.from('received_emails').update({ read_at: new Date().toISOString() }).eq('id', email.id)
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read_at: new Date().toISOString() } : e))
  }

  async function toggleStar(e: React.MouseEvent, email: ReceivedEmail) {
    e.stopPropagation()
    const starred = !email.starred
    await supabase.from('received_emails').update({ starred }).eq('id', email.id)
    setEmails(prev => prev.map(em => em.id === email.id ? { ...em, starred } : em))
  }

  const filtered = emails.filter(e =>
    search === '' ||
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    (e.from_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    e.from_email.toLowerCase().includes(search.toLowerCase())
  )
  const selected = emails.find(e => e.id === selectedId)
  const unread = emails.filter(e => !e.read_at).length

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', gap: '1.25rem', height: 'calc(100dvh - 260px)', minHeight: '420px' }}>
      {/* Email list */}
      <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input input-sm"
              style={{ paddingLeft: '2.25rem', width: '100%' }}
              placeholder="Search inbox…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Mail size={28} />
              <p>{search ? 'No emails match.' : 'Inbox is empty.'}</p>
            </div>
          ) : filtered.map(email => {
            const isSelected = selectedId === email.id
            const isUnread = !email.read_at
            return (
              <div
                key={email.id}
                onClick={() => openEmail(email)}
                className="card"
                style={{
                  padding: '0.75rem', cursor: 'pointer',
                  background: isSelected ? 'var(--bg-card-hover)' : undefined,
                  borderColor: isSelected ? 'var(--border-strong)' : undefined,
                  borderLeft: isUnread ? '3px solid #7B2FFF' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <p style={{ fontWeight: isUnread ? 700 : 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {email.from_name || email.from_email}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{relTime(email.created_at)}</span>
                    <button
                      onClick={e => toggleStar(e, email)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      <Star size={13} fill={email.starred ? '#f59e0b' : 'none'} color={email.starred ? '#f59e0b' : 'var(--text-muted)'} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.8125rem', fontWeight: isUnread ? 600 : 400, color: isUnread ? 'var(--text)' : 'var(--text-muted)', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email.subject}
                </p>
                {email.text && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.text.slice(0, 80)}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {unread > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>{unread} unread</p>
        )}
      </div>

      {/* Email detail */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {!selected ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <Inbox size={32} />
            <p>Select an email to read it.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.375rem' }}>{selected.subject}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                From <strong style={{ color: 'var(--text)' }}>{selected.from_name || selected.from_email}</strong>
                {selected.from_name && <span> &lt;{selected.from_email}&gt;</span>}
                <span> · {formatDate(selected.created_at)}</span>
              </p>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {selected.html ? (
                <iframe
                  srcDoc={selected.html}
                  sandbox="allow-same-origin"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  title={selected.subject}
                />
              ) : (
                <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100%' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text)' }}>
                    {selected.text || '(No content)'}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [tab, setTab] = useState<'chat' | 'inbox'>('chat')
  const [chatUnread, setChatUnread] = useState(0)
  const [inboxUnread, setInboxUnread] = useState(0)

  useEffect(() => {
    async function init() {
      const [{ data: cl }, { count: chatCount }, { count: inboxCount }] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'active').order('name'),
        supabase.from('client_messages').select('*', { count: 'exact', head: true }).eq('sender', 'client').is('read_at', null),
        supabase.from('received_emails').select('*', { count: 'exact', head: true }).is('read_at', null),
      ])
      setClients(cl ?? [])
      setChatUnread(chatCount ?? 0)
      setInboxUnread(inboxCount ?? 0)
      setLoadingClients(false)
    }
    init()
  }, [supabase])

  const totalUnread = chatUnread + inboxUnread

  return (
    <>
      <div className="page-header">
        <h1>
          Messages
          {totalUnread > 0 && (
            <span className="badge badge-red" style={{ marginLeft: '0.75rem', verticalAlign: 'middle' }}>{totalUnread} unread</span>
          )}
        </h1>
        <p>Chat with clients and view your email inbox.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {([
          { id: 'chat', label: 'Client Chat', icon: <MessageCircle size={15} />, count: chatUnread },
          { id: 'inbox', label: 'Email Inbox', icon: <Inbox size={15} />, count: inboxUnread },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1rem',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: tab === t.id ? 600 : 400,
              fontSize: '0.875rem',
              marginBottom: '-1px',
            }}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span style={{ background: 'var(--accent-red)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0 5px', borderRadius: '100px', minWidth: '16px', textAlign: 'center' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loadingClients ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : tab === 'chat' ? (
        <ChatTab clients={clients} />
      ) : (
        <InboxTab />
      )}
    </>
  )
}
