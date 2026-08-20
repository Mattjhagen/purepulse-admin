'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_SUGGESTIONS = [
  'How does the $150 deposit work?',
  'What are the affiliate commission rates?',
  'What features are included in client portals?',
  'How do I schedule an interview or call?',
]

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! 👋 I'm the PurePulse AI Assistant. Ask me anything about our custom design, client portals, pricing, or affiliate program!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      textareaRef.current?.focus()
    }
  }, [isOpen, messages, isLoading])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      const reply = data.response || "Sorry, I couldn't reach the server. Please email matty@purepulse.one or try again!"

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection error. Please try again or reach out to matty@purepulse.one.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'system-ui, sans-serif' }}>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '520px',
            maxHeight: 'calc(100vh - 120px)',
            background: 'linear-gradient(180deg, #100f1c 0%, #0c0b14 100%)',
            border: '1px solid rgba(123, 47, 255, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(123, 47, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'ppFadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(123, 47, 255, 0.12)',
              borderBottom: '1px solid rgba(123, 47, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                P
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#F4F4FF' }}>
                  Pure<span style={{ color: '#A066FF' }}>Pulse</span> Assistant
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00D4FF' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00D4FF' }} />
                  Online · AI Powered
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

            {/* Quick suggestion chips (only if 1 message exists) */}
            {messages.length === 1 && !isLoading && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#6d6c7d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Suggested questions
                </div>
                {QUICK_SUGGESTIONS.map((q, idx) => (
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
                    {q}
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
              placeholder="Ask a question..."
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

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(123, 47, 255, 0.45)',
          color: '#fff',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.06)'
          e.currentTarget.style.boxShadow = '0 10px 28px rgba(123, 47, 255, 0.6)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(123, 47, 255, 0.45)'
        }}
        aria-label="Toggle PurePulse Chat"
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
