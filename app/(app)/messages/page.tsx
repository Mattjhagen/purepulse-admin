'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Client } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { MessageCircle, Search, Send } from 'lucide-react'

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

export default function MessagesPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: msgs }, { data: cl }] = await Promise.all([
      supabase.from('client_messages').select('*').order('created_at', { ascending: true }),
      supabase.from('clients').select('*').eq('status', 'active').order('name'),
    ])
    setMessages(msgs ?? [])
    setClients(cl ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Real-time: append new messages without a full reload
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

  // Scroll to bottom when conversation changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedClientId, messages.length])

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

  const filteredThreads = threads.filter(t => search === '' || t.client.name.toLowerCase().includes(search.toLowerCase()))
  const clientsWithoutThread = clients.filter(c => !threads.some(t => t.client.id === c.id))
  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0)
  const selected = threads.find(t => t.client.id === selectedClientId)
  const selectedClient = selected?.client ?? clients.find(c => c.id === selectedClientId)

  async function openThread(clientId: string) {
    setSelectedClientId(clientId)
    const unreadIds = messages.filter(m => m.client_id === clientId && m.sender === 'client' && !m.read_at).map(m => m.id)
    if (unreadIds.length === 0) return
    await supabase.from('client_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m))
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId || !draft.trim()) return
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
    // Realtime will append the message; no full reload needed
  }

  return (
    <>
      <div className="page-header">
        <h1>
          Messages
          {totalUnread > 0 && (
            <span className="badge badge-red" style={{ marginLeft: '0.75rem', verticalAlign: 'middle' }}>{totalUnread} unread</span>
          )}
        </h1>
        <p>Chat with clients through their portal.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'flex', gap: '1.25rem', height: 'calc(100dvh - 220px)', minHeight: '420px' }}>
          {/* Thread list */}
          <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input input-sm" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {filteredThreads.map(t => {
                const last = t.messages[t.messages.length - 1]
                return (
                  <div
                    key={t.client.id}
                    onClick={() => openThread(t.client.id)}
                    className="card"
                    style={{
                      padding: '0.75rem', cursor: 'pointer',
                      background: selectedClientId === t.client.id ? 'var(--bg-card-hover)' : undefined,
                      borderColor: selectedClientId === t.client.id ? 'var(--border-strong)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <p style={{ fontWeight: t.unread > 0 ? 700 : 500, fontSize: '0.875rem' }}>{t.client.name}</p>
                      {t.unread > 0 && (
                        <span style={{ background: 'var(--accent-red)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0 6px', borderRadius: '100px', minWidth: '18px', textAlign: 'center', flexShrink: 0 }}>{t.unread}</span>
                      )}
                    </div>
                    {last && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last.sender === 'admin' ? 'You: ' : ''}{last.body}
                      </p>
                    )}
                  </div>
                )
              })}

              {clientsWithoutThread.length > 0 && (
                <>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.25rem 0.125rem' }}>Start a conversation</p>
                  {clientsWithoutThread
                    .filter(c => search === '' || c.name.toLowerCase().includes(search.toLowerCase()))
                    .map(c => (
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
                      </div>
                    ))}
                </>
              )}

              {filteredThreads.length === 0 && clientsWithoutThread.length === 0 && (
                <div className="empty-state"><p>No clients yet.</p></div>
              )}
            </div>
          </div>

          {/* Thread */}
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
                        <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, color: m.sender === 'admin' ? '#080808' : 'var(--text)' }}>{m.body}</p>
                        <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: m.sender === 'admin' ? 'rgba(8,8,8,0.55)' : 'var(--text-muted)' }}>{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                  <input className="input" style={{ flex: 1 }} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Reply as Matty…" required />
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? <span className="spinner" /> : <><Send size={14} /> Send</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
