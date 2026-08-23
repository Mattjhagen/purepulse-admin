'use client'

import React, { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_SUGGESTIONS = [
  'unblock',
  'restart r510',
  'status',
  'What plans do you offer?',
]

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hey Matty! 👋 I'm PurePulse Assistant. Enter 'unblock', 'restart r510', or 'status' to control the servers, or ask any question.",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Poll for manual review alert status
  useEffect(() => {
    async function checkReviewStatus() {
      try {
        const res = await fetch('/api/stages', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const stages = data.stages || []
          // If any stage is in security-review or human review state, alert!
          const reviewNeeded = stages.some((s: any) =>
            s.status === 'in_progress' && (s.name?.toLowerCase().includes('security') || s.name?.toLowerCase().includes('human') || s.name?.toLowerCase().includes('review'))
          )
          setNeedsReview(true) // Force active review alert state if R410 passed security
        }
      } catch (err) {
        // Fallback: check R410 review state
        setNeedsReview(true)
      }
    }
    checkReviewStatus()
    const id = setInterval(checkReviewStatus, 10000)
    return () => clearInterval(id)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      textareaRef.current?.focus()
    }
  }, [isOpen, messages])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    if (!textToSend) setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const botReply: Message = {
        role: 'assistant',
        content: data.response || "Thanks for your message! Email matty@purepulse.one if you need direct human support.",
      }
      setMessages(prev => [...prev, botReply])
    } catch (err) {
      console.error('[ChatWidget] error sending message:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again or email matty@purepulse.one.",
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
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes adminBlinkRed {
          0% { box-shadow: 0 0 20px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.6); background: #ef4444; }
          50% { box-shadow: 0 0 35px rgba(59,130,246,1), 0 0 60px rgba(59,130,246,0.8); background: #3b82f6; }
          100% { box-shadow: 0 0 20px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.6); background: #ef4444; }
        }
        .admin-blink-alert {
          animation: adminBlinkRed 0.8s infinite ease-in-out !important;
        }
      `}</style>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '0',
            width: '360px',
            height: '500px',
            maxHeight: 'calc(100vh - 110px)',
            background: 'rgba(13, 12, 24, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: needsReview ? '2px solid #ef4444' : '1px solid rgba(123, 47, 255, 0.3)',
            borderRadius: '16px',
            boxShadow: needsReview ? '0 12px 40px rgba(239, 68, 68, 0.5)' : '0 12px 40px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'ppSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(123, 47, 255, 0.2)',
              background: needsReview ? 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(13,12,24,0.9))' : 'rgba(123, 47, 255, 0.1)',
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
                  borderRadius: '50%',
                  background: needsReview ? '#ef4444' : 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              >
                {needsReview ? '🚨' : 'P'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#F4F4FF' }}>
                  Pure<span style={{ color: '#A066FF' }}>Pulse</span> Admin Assistant
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: needsReview ? '#f87171' : '#00D4FF' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: needsReview ? '#ef4444' : '#00D4FF' }} />
                  {needsReview ? '🚨 MANUAL REVIEW NEEDED' : 'Online · Server Actions Active'}
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
                <span>Executing action</span>
                <span style={{ animation: 'ppPulse 1s infinite' }}>...</span>
              </div>
            )}

            {/* Quick action suggestions */}
            {messages.length === 1 && !isLoading && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#6d6c7d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Server Action Commands
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
                    ⚡ {q}
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
              placeholder="Type 'unblock', 'restart r510', 'status'..."
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

      {/* Floating Red Alert Badge */}
      {needsReview && !isOpen && (
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
        className={needsReview ? 'admin-blink-alert' : ''}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: needsReview ? '#ef4444' : 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: needsReview ? '0 0 30px rgba(239, 68, 68, 0.9)' : '0 8px 24px rgba(123, 47, 255, 0.45)',
          color: '#fff',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        aria-label="Toggle PurePulse Admin Chat"
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
