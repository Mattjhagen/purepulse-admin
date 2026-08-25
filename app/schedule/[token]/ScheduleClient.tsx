'use client'
import { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'

interface TimeSlot {
  startISO: string
  endISO: string
  displayTime: string
  available: boolean
}

export default function ScheduleClient({ token }: { token: string }) {
  const [candidate, setCandidate] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1) // skip Sun
    if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2) // skip Sat
    return tomorrow.toISOString().split('T')[0]
  })
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/schedule/${encodeURIComponent(token)}?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setCandidate(data.candidate)
          setSlots(data.slots || [])
        }
      })
      .catch(() => setError('Failed loading calendar availability.'))
      .finally(() => setLoading(false))
  }, [token, selectedDate])

  const handleBook = async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/schedule/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startISO: selectedSlot.startISO,
          endISO: selectedSlot.endISO,
          displayTime: selectedSlot.displayTime,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setConfirmed(true)
      } else {
        setError(data.error || 'Failed to confirm interview booking')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#12121A', border: '1px solid rgba(123,47,255,0.3)', borderRadius: '16px', padding: '2.5rem', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', margin: '0 auto 1.25rem' }}>
            <CheckCircle2 size={36} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>1-on-1 Interview Confirmed! 🎉</h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.9375rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            Thank you <strong style={{ color: '#fff' }}>{candidate?.name}</strong>! Your 30-minute 1-on-1 interview with Matty Hagen has been scheduled.
          </p>

          <div style={{ background: 'rgba(123,47,255,0.12)', border: '1px solid rgba(123,47,255,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', textTransform: 'uppercase' }}>Confirmed Date &amp; Time</p>
            <p style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{selectedDate}</p>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#00D4FF' }}>{selectedSlot?.displayTime}</p>
          </div>

          <p style={{ fontSize: '0.8125rem', color: '#6B7280', margin: 0 }}>
            An invitation has been dispatched to <strong style={{ color: '#9CA3AF' }}>{candidate?.email}</strong> and synced to our Apple Calendar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090E', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ maxWidth: '640px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(123,47,255,0.15)', border: '1px solid rgba(123,47,255,0.3)', padding: '0.35rem 0.875rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', marginBottom: '0.875rem' }}>
            <ShieldCheck size={14} /> PurePulse Hiring Partner 1-on-1
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>Schedule Your 1-on-1 Interview</h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.9375rem', margin: 0 }}>
            Select a 30-minute time slot between <strong>12:00 PM – 7:00 PM Central Time (Mon–Fri)</strong>.
          </p>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#F87171', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ background: '#12121A', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          {/* Candidate Info */}
          {candidate && (
            <div style={{ borderBottom: '1px solid #1F1F2E', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{candidate.name}</p>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9CA3AF' }}>{candidate.email}</p>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(0,212,255,0.12)', color: '#00D4FF', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,212,255,0.3)' }}>
                {candidate.job_title}
              </span>
            </div>
          )}

          {/* Date Picker */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.5rem' }}>
              <Calendar size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Select Interview Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#0D0D14', border: '1px solid #262636', borderRadius: '8px', color: '#fff', fontSize: '0.9375rem', fontWeight: 600 }}
            />
          </div>

          {/* Time Slots */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.75rem' }}>
              <Clock size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Available 30-Min Central Time Slots
            </label>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                <p style={{ fontSize: '0.875rem', margin: 0 }}>Checking Apple Calendar availability...</p>
              </div>
            ) : slots.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '1.5rem', background: '#0D0D14', borderRadius: '8px', margin: 0 }}>
                No open slots available on weekends. Please pick a Monday through Friday date.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.625rem', maxHeight: '280px', overflowY: 'auto', paddingRight: 4 }}>
                {slots.map((slot) => {
                  const isSel = selectedSlot?.startISO === slot.startISO
                  return (
                    <button
                      key={slot.startISO}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.625rem 0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: isSel ? 800 : 600,
                        color: !slot.available ? '#4B5563' : isSel ? '#fff' : '#D1D5DB',
                        background: !slot.available ? 'rgba(255,255,255,0.02)' : isSel ? '#7B2FFF' : '#0D0D14',
                        border: !slot.available ? '1px solid rgba(255,255,255,0.05)' : isSel ? '1px solid #A066FF' : '1px solid #262636',
                        cursor: !slot.available ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        textDecoration: !slot.available ? 'line-through' : 'none',
                      }}
                    >
                      {slot.displayTime}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={!selectedSlot || submitting}
            onClick={handleBook}
            style={{
              width: '100%',
              padding: '0.875rem',
              borderRadius: '10px',
              background: !selectedSlot ? '#1F1F2E' : 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
              color: !selectedSlot ? '#6B7280' : '#fff',
              fontSize: '0.9375rem',
              fontWeight: 800,
              border: 'none',
              cursor: !selectedSlot || submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: selectedSlot ? '0 4px 20px rgba(123,47,255,0.4)' : 'none',
            }}
          >
            {submitting ? 'Confirming Booking...' : 'Confirm 1-on-1 Interview Booking →'}
          </button>
        </div>
      </div>
    </div>
  )
}
