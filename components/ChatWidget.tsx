'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ADMIN_SUGGESTIONS = [
  'unblock',
  'heal',
  'status',
  'restart r510',
]

const PUBLIC_SUGGESTIONS = [
  'What website plans do you offer?',
  'How fast is turnaround time?',
  'How can I contact support?',
]

export default function ChatWidget() {
  const pathname = usePathname() || ''
  const isAdminPage = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/handoff') || pathname.startsWith('/tickets')

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: isAdminPage
        ? "Hey Matty! 👋 I'm your Admin Assistant. Enter 'heal', 'unblock', 'restart r510', or 'status' to control the servers."
        : "Hello! 👋 Welcome to PurePulse! We build custom high-performance websites and web applications. How can I help you today? You can also email our team at support@purepulse.one!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Poll state ONLY on admin pages for manual review alerts
  useEffect(() => {
    if (!isAdminPage) {
      setNeedsReview(false)
      return
    }
    const checkState = async () => {
      try {
        const res = await fetch('/api/chat', { method: 'OPTIONS' })
        const stateRes = await fetch('http://100.123.142.27:8422/api/state', { cache: 'no-store' }).catch(() => null)
        if (stateRes && stateRes.ok) {
          const d = await stateRes.json()
          const reviewNodes = (d.nodes || []).filter((n: any) => n.opencode_state === 'review')
          setNeedsReview(reviewNodes.length > 0 || d.workflow?.state === 'awaiting-human')
        }
      } catch (e) {}
    }
    checkState()
    const interval = setInterval(checkState, 10000)
    return () => clearInterval(interval)
  }, [isAdminPage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input
    if (!textToSend.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: textToSend }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    if (!customText) setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          isAdmin: isAdminPage,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      let replyText = data.response || data.answer || "Hello! For any questions, please email support@purepulse.one and our team will get right back to you!"
      
      // Safety filter: strip thinking process text if model leaks it
      if (replyText.toLowerCase().includes("here's a thinking process") || replyText.toLowerCase().includes("analyze user input")) {
        replyText = isAdminPage
          ? "Admin Assistant active. Enter 'heal', 'unblock', or 'status' to run server actions."
          : "Hello! Welcome to PurePulse. How can we help you with your web project today? Feel free to email support@purepulse.one!"
      }

      setMessages(prev => [...prev, { role: 'assistant', content: replyText }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: isAdminPage
            ? 'Big Pickle chat unavailable. Enter "heal" or "status" to execute direct server actions.'
            : 'For direct assistance or custom project quotes, please email our team at support@purepulse.one!',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="chat-widget-wrapper"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        @media (max-width: 1024px) {
          .chat-widget-wrapper {
            bottom: 84px !important;
            right: 16px !important;
          }
        }
      `}</style>
      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          style={{
            width: '360px',
            maxHeight: '520px',
            height: '480px',
            background: 'rgba(13, 12, 24, 0.95)',
            backdropFilter: 'blur(16px)',
            border: isAdminPage && needsReview ? '2px solid #ef4444' : '1px solid rgba(123, 47, 255, 0.35)',
            borderRadius: '16px',
            boxShadow: isAdminPage && needsReview ? '0 0 30px rgba(239, 68, 68, 0.5)' : '0 16px 48px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: isAdminPage && needsReview ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, rgba(123, 47, 255, 0.3), rgba(0, 212, 255, 0.15))',
              borderBottom: '1px solid rgba(123, 47, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#fff',
                }}
              >
                P
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isAdminPage ? 'PurePulse Admin Assistant' : 'PurePulse Support'}
                </div>
                <div style={{ fontSize: '10px', color: isAdminPage && needsReview ? '#f87171' : '#00D4FF', fontWeight: 600 }}>
                  {isAdminPage && needsReview ? '🚨 Manual Review Needed' : '● Online'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b8a99',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                lineHeight: 1,
              }}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'linear-gradient(135deg, #7B2FFF, #6018db)' : 'rgba(255, 255, 255, 0.06)',
                  color: '#F4F4FF',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  border: m.role === 'assistant' ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#A066FF',
                  padding: '8px 14px',
                  borderRadius: '14px 14px 14px 2px',
                  fontSize: '13px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Thinking</span>
                <span style={{ animation: 'ppPulse 1s infinite' }}>...</span>
              </div>
            )}

            {/* Suggestions */}
            {messages.length === 1 && !isLoading && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#6d6c7d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isAdminPage ? 'Server Action Commands' : 'Suggested Questions'}
                </div>
                {(isAdminPage ? ADMIN_SUGGESTIONS : PUBLIC_SUGGESTIONS).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    style={{
                      textAlign: 'left',
                      background: 'rgba(123, 47, 255, 0.1)',
                      border: '1px solid rgba(123, 47, 255, 0.25)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#d4ccff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(123, 47, 255, 0.2)'
                      e.currentTarget.style.borderColor = '#7B2FFF'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(123, 47, 255, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(123, 47, 255, 0.25)'
                    }}
                  >
                    {isAdminPage ? '⚡ ' : '💬 '}{q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid rgba(123, 47, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAdminPage ? "Type 'unblock', 'restart r510', 'status'..." : "Ask a question about our web plans..."}
              rows={1}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(123, 47, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#F4F4FF',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                maxHeight: '80px',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              style={{
                background: 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || isLoading ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
                transition: 'opacity 0.2s, transform 0.1s',
              }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Red Alert Badge (Admin Only) */}
      {isAdminPage && needsReview && !isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            right: '-10px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.9)',
            animation: 'adminBlinkRed 0.8s infinite ease-in-out',
            pointerEvents: 'none',
          }}
        >
          🚨 MANUAL REVIEW NEEDED
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={isAdminPage && needsReview ? 'admin-blink-alert' : ''}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isAdminPage && needsReview ? '#ef4444' : 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isAdminPage && needsReview ? '0 0 30px rgba(239, 68, 68, 0.9)' : '0 8px 24px rgba(123, 47, 255, 0.45)',
          color: '#fff',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        aria-label="Toggle Chat"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        )}
      </button>
    </div>
  )
}
