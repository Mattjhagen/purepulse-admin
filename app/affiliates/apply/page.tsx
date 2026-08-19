'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad'
import { AFFILIATE_TERMS } from '@/lib/affiliate-utils'
import {
  Video,
  Mic,
  Play,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  Send,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react'

type Step = 1 | 2 | 3

const INTRO_VIDEO_URL = 'https://ouwyuxqlvjvxdobjnezu.supabase.co/storage/v1/object/public/media/videoplayback.mp4'

interface Question {
  id: string
  section: string
  title: string
  prompt: string
  maxSeconds: number
  prepTip: string
}

const PRESCREEN_QUESTIONS: Question[] = [
  {
    id: 'q1',
    section: '1. Outreach & Prospecting Strategy',
    title: 'Target Selection',
    prompt: 'PurePulse focuses on SMBs needing modern, fast sites. If handed your affiliate link today, what 3 local business types would you target first and why?',
    maxSeconds: 90,
    prepTip: 'Think of specific local industries (e.g. contractors, auto repair, gyms, medical) and their web needs.',
  },
  {
    id: 'q2',
    section: '1. Outreach & Prospecting Strategy',
    title: 'Cold Outreach Comfort',
    prompt: 'Much of affiliate outreach involves walking into storefronts, calling, or direct messaging owners. How comfortable are you initiating cold conversations?',
    maxSeconds: 75,
    prepTip: 'Share your mindset, past sales/customer-facing experience, and how you break the ice with busy owners.',
  },
  {
    id: 'q4',
    section: '2. Value Proposition & Handling Objections',
    title: 'Value Framing vs. Social Media',
    prompt: 'How would you explain the value of a custom website to a brick-and-mortar store owner who says: "I already have a Facebook page, so I don\'t need a website"?',
    maxSeconds: 90,
    prepTip: 'Focus on Google SEO, owning your digital asset vs rented social platforms, and local credibility.',
  },
  {
    id: 'roleplay',
    section: '3. Quick Roleplay: Local Business Pitch',
    title: '60–90s Pitch to Store Owner',
    prompt: 'Scenario: Imagine I am a local auto repair or restaurant owner. Give a 60–90 second introduction to spark interest, explain PurePulse ($150 deposit), and capture my contact info.',
    maxSeconds: 90,
    prepTip: 'Keep it conversational, mention the $150 low deposit, and ask for an email or phone number for a preview.',
  },
]

function getTypedSignatureDataURL(text: string, width = 480, height = 120): string {
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#111111'
  ctx.font = `${Math.min(52, Math.floor(width / (text.length * 0.55 + 1)))}px "Dancing Script", "Brush Script MT", cursive`
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 16, height / 2)
  return canvas.toDataURL('image/png')
}

export default function ApplyPage() {
  const [step, setStep] = useState<Step>(1)

  // Step 1: Candidate Info & Pre-screen Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [step1Error, setStep1Error] = useState('')

  // Video / Audio Recording State
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermissions, setHasPermissions] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedBlobs, setRecordedBlobs] = useState<Record<string, Blob>>({})
  const [recordedUrls, setRecordedUrls] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Step 2: Agreement & Signature Fields
  const [signedBy, setSignedBy] = useState('')
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw')
  const [padEmpty, setPadEmpty] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const padRef = useRef<SignaturePadHandle>(null)

  // Submission State
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [resultEmail, setResultEmail] = useState('')
  const [actionLink, setActionLink] = useState('')

  // Refs for media
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const currentQuestion = PRESCREEN_QUESTIONS[currentQIndex]

  // Setup media stream
  const setupMedia = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      })
      setStream(mediaStream)
      setHasPermissions(true)

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream
      }

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(mediaStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const average = sum / dataArray.length
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)))
        animationFrameRef.current = requestAnimationFrame(updateMeter)
      }
      updateMeter()
    } catch (err) {
      console.warn('[setupMedia] camera/mic warning:', err)
      setHasPermissions(false)
      setShowTextFallback(true)
    }
  }, [])

  useEffect(() => {
    if (stream && liveVideoRef.current && step === 1) {
      liveVideoRef.current.srcObject = stream
    }
  }, [stream, step, currentQIndex])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [stream])

  const startRecordingFlow = () => {
    if (!stream) {
      setShowTextFallback(true)
      return
    }

    setCountdown(3)
    let count = 3
    const cdInterval = setInterval(() => {
      count -= 1
      if (count > 0) {
        setCountdown(count)
      } else {
        clearInterval(cdInterval)
        setCountdown(null)
        beginMediaRecording()
      }
    }, 1000)
  }

  const beginMediaRecording = () => {
    if (!stream) return
    chunksRef.current = []

    let mimeType = 'video/webm;codecs=vp9,opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4'
      }
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedBlobs((prev) => ({ ...prev, [currentQuestion.id]: blob }))
        setRecordedUrls((prev) => ({ ...prev, [currentQuestion.id]: url }))
      }

      recorder.start(1000)
      setIsRecording(true)
      setRecordingSeconds(0)

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((sec) => {
          if (sec + 1 >= currentQuestion.maxSeconds) {
            stopRecording()
            return currentQuestion.maxSeconds
          }
          return sec + 1
        })
      }, 1000)
    } catch (err) {
      console.error('[beginMediaRecording] error:', err)
      setShowTextFallback(true)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    setIsRecording(false)
  }

  const reRecord = () => {
    if (recordedUrls[currentQuestion.id]) {
      URL.revokeObjectURL(recordedUrls[currentQuestion.id])
    }
    setRecordedBlobs((prev) => {
      const u = { ...prev }
      delete u[currentQuestion.id]
      return u
    })
    setRecordedUrls((prev) => {
      const u = { ...prev }
      delete u[currentQuestion.id]
      return u
    })
    setRecordingSeconds(0)
  }

  function validateStep1() {
    if (!name.trim()) { setStep1Error('Please enter your full name.'); return false }
    if (!email.trim() || !email.includes('@')) { setStep1Error('Please enter a valid email address.'); return false }
    setStep1Error('')
    return true
  }

  function goToStep2() {
    if (!validateStep1()) return
    setSignedBy(name)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canSign = signedBy.trim() && agreed && (sigMode === 'type' ? true : !padEmpty)

  async function submitApplication() {
    if (!canSign) return
    setSubmitting(true)
    setSubmitError('')

    let signatureData: string
    if (sigMode === 'draw') {
      signatureData = padRef.current?.toDataURL() ?? ''
      if (!signatureData) { setSubmitError('Please draw your signature.'); setSubmitting(false); return }
    } else {
      signatureData = getTypedSignatureDataURL(signedBy)
    }

    try {
      // 1. Submit affiliate application & contract signature
      const res = await fetch('/api/affiliates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          signed_by: signedBy.trim(),
          signature_data: signatureData,
        }),
      })
      const data = await res.json()
      if (data.error) { setSubmitError(data.error); setSubmitting(false); return }

      setReferralCode(data.referral_code)
      setResultEmail(data.email)
      if (data.action_link) {
        setActionLink(data.action_link)
      }

      // 2. Also submit video pre-screen responses to interviews table (non-blocking)
      try {
        const finalVideoUrls: Record<string, string> = {}
        for (const qId of Object.keys(recordedBlobs)) {
          const blob = recordedBlobs[qId]
          if (blob) {
            const formData = new FormData()
            formData.append('video', blob, `${qId}.webm`)
            formData.append('questionId', qId)
            formData.append('email', email.trim())
            const upRes = await fetch('/api/interviews/upload', { method: 'POST', body: formData })
            const upData = await upRes.json()
            if (upData.ok && upData.url) finalVideoUrls[qId] = upData.url
          }
        }

        await fetch('/api/interviews/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_name: name.trim(),
            candidate_email: email.trim(),
            candidate_phone: phone.trim(),
            job_title: 'Affiliate Sales Partner',
            video_urls: finalVideoUrls,
            text_answers: textAnswers,
            roleplay_video_url: finalVideoUrls.roleplay || null,
          }),
        })
      } catch (interviewErr) {
        console.warn('[submitApplication] interview backup upload warning:', interviewErr)
      }

      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const referralUrl = referralCode ? `https://purepulse.one/pricing?ref=${referralCode}` : ''

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/affiliates" style={s.logo}>
          Pure<span style={{ color: '#7B2FFF' }}>Pulse</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={s.headerTag}>Affiliate Partner Network</span>
          <Link href="/affiliates/login" style={{ fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </header>

      {/* Progress Stepper */}
      {step < 3 && (
        <div style={s.progress}>
          {[
            { n: '1', label: '1. Pre-Screen & Overview' },
            { n: '2', label: '2. Sign Agreement' },
            { n: '3', label: '3. Portal Activation' },
          ].map((item, i) => (
            <div key={item.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <div style={{ ...s.progressLine, background: step > Number(item.n) - 1 ? '#111' : '#e5e7eb' }} />}
              <div style={{
                ...s.progressDot,
                background: step >= Number(item.n) ? '#111' : '#e5e7eb',
                color: step >= Number(item.n) ? '#fff' : '#9ca3af',
              }}>
                {item.n}
              </div>
              <span style={{ ...s.progressLabel, color: step >= Number(item.n) ? '#111' : '#9ca3af' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <main style={s.main}>
        {/* ── STEP 1: Video Briefing + Pre-Screen Interview + Contact Info ── */}
        {step === 1 && (
          <div style={s.card}>
            {/* Header */}
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(123,47,255,0.12)', border: '1px solid rgba(123,47,255,0.25)', padding: '0.35rem 0.875rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, color: '#7B2FFF', marginBottom: '0.75rem' }}>
                <Sparkles size={13} /> Partner Onboarding &amp; Pre-Screen
              </div>
              <h1 style={s.h1}>Become a PurePulse Affiliate Partner</h1>
              <p style={s.sub}>
                Watch the opportunity overview below, answer 4 quick pre-screen questions, and proceed to your partner agreement.
              </p>
            </div>

            {/* Embedded Video Briefing */}
            <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '14px', overflow: 'hidden', marginBottom: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #1F1F2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Play size={13} fill="#7B2FFF" color="#7B2FFF" /> Step 1: Watch Opportunity Briefing
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>2 Min Overview</span>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
                <video
                  src={INTRO_VIDEO_URL}
                  controls
                  playsInline
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Candidate Information Form */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 1rem', color: '#111' }}>
                Your Contact Information
              </h3>

              <div style={s.form}>
                <div style={s.row}>
                  <div style={s.field}>
                    <label style={s.label}>Full name *</label>
                    <input
                      style={s.input}
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Email address *</label>
                    <input
                      style={s.input}
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Phone number</label>
                  <input
                    style={s.input}
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>How do you plan to promote PurePulse?</label>
                  <textarea
                    style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Local business networking, walk-in visits, LinkedIn/social media outreach, agency referrals, etc."
                  />
                </div>
              </div>
            </div>

            {/* Pre-Screen Questions Section */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.75rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0, color: '#111' }}>
                  Pre-Screen Questions (Question {currentQIndex + 1} of {PRESCREEN_QUESTIONS.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#7B2FFF', fontWeight: 600 }}>
                  {currentQuestion.title}
                </span>
              </div>

              {/* Question Card */}
              <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#7B2FFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  {currentQuestion.section}
                </span>
                <p style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.9375rem', fontWeight: 700, color: '#111', lineHeight: 1.4 }}>
                  {currentQuestion.prompt}
                </p>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
                  💡 <strong>Tip:</strong> {currentQuestion.prepTip}
                </p>
              </div>

              {/* Video or Text Answer Mode */}
              <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '1.25rem', color: '#fff', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB' }}>
                    Record Video Response (or type below)
                  </span>
                  {!hasPermissions && (
                    <button
                      onClick={setupMedia}
                      style={{ background: '#7B2FFF', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    >
                      Enable Camera &amp; Mic
                    </button>
                  )}
                </div>

                {hasPermissions ? (
                  <div style={{ position: 'relative', width: '100%', height: '260px', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                    {!recordedUrls[currentQuestion.id] ? (
                      <video
                        ref={liveVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                    ) : (
                      <video
                        ref={previewVideoRef}
                        src={recordedUrls[currentQuestion.id]}
                        controls
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    )}

                    {countdown !== null && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <span style={{ fontSize: '4rem', fontWeight: 900, color: '#A066FF' }}>{countdown}</span>
                      </div>
                    )}

                    {isRecording && (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.35rem 0.75rem', borderRadius: '100px', border: '1px solid rgba(239,68,68,0.5)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>REC {recordingSeconds}s / {currentQuestion.maxSeconds}s</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Recorder Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {hasPermissions && !recordedUrls[currentQuestion.id] && !isRecording && (
                      <button
                        onClick={startRecordingFlow}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#EF4444', color: '#fff', fontSize: '0.8125rem', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '100px', border: 'none', cursor: 'pointer' }}
                      >
                        <Video size={14} /> Start Video Recording
                      </button>
                    )}

                    {isRecording && (
                      <button
                        onClick={stopRecording}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fff', color: '#000', fontSize: '0.8125rem', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '100px', border: 'none', cursor: 'pointer' }}
                      >
                        Stop Recording
                      </button>
                    )}

                    {recordedUrls[currentQuestion.id] && !isRecording && (
                      <button
                        onClick={reRecord}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#1F1F2E', color: '#D1D5DB', fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #2D2D42', cursor: 'pointer' }}
                      >
                        <RotateCcw size={13} /> Re-record
                      </button>
                    )}
                  </div>

                  {/* Question Navigator */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {currentQIndex > 0 && (
                      <button
                        onClick={() => setCurrentQIndex(i => i - 1)}
                        style={{ background: 'transparent', border: '1px solid #2D2D42', color: '#9CA3AF', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        ← Prev Question
                      </button>
                    )}

                    {currentQIndex < PRESCREEN_QUESTIONS.length - 1 && (
                      <button
                        onClick={() => setCurrentQIndex(i => i + 1)}
                        style={{ background: '#7B2FFF', color: '#fff', padding: '0.4rem 0.875rem', borderRadius: '6px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Next Question →
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Fallback */}
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #1F1F2E', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                    Or type your answer for {currentQuestion.title}:
                  </label>
                  <textarea
                    rows={2}
                    value={textAnswers[currentQuestion.id] || ''}
                    onChange={(e) => setTextAnswers({ ...textAnswers, [currentQuestion.id]: e.target.value })}
                    placeholder="Type your response here..."
                    style={{ width: '100%', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {step1Error && <p style={s.errorMsg}>{step1Error}</p>}

            <button onClick={goToStep2} style={s.btn}>
              Continue to Partner Agreement &amp; Contract →
            </button>

            <p style={s.fine}>
              Free to join • No credit card required • Instant digital signature on next step.
            </p>
          </div>
        )}

        {/* ── STEP 2: Terms & Digital Signature ── */}
        {step === 2 && (
          <div style={s.card}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7B2FFF' }}>
                Legal Contract
              </span>
              <h1 style={s.h1}>Affiliate Program Agreement</h1>
              <p style={s.sub}>
                Review the terms below, sign electronically, and your portal will be activated immediately.
              </p>
            </div>

            {/* Terms scroll box */}
            <div style={s.termsBox}>
              <pre style={s.termsPre}>{AFFILIATE_TERMS}</pre>
            </div>

            {/* Signature area */}
            <div style={{ marginTop: 24 }}>
              <div style={s.field}>
                <label style={s.label}>Full legal name</label>
                <input
                  style={s.input}
                  value={signedBy}
                  onChange={e => setSignedBy(e.target.value)}
                  placeholder="Your full legal name"
                />
              </div>

              {/* Sig mode toggle */}
              <div style={{ display: 'flex', gap: 0, margin: '14px 0 10px', border: '1.5px solid #d1d5db', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
                {(['draw', 'type'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setSigMode(mode); setPadEmpty(true); padRef.current?.clear() }}
                    style={{
                      padding: '7px 18px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: sigMode === mode ? '#111' : '#fff',
                      color: sigMode === mode ? '#fff' : '#374151',
                    }}
                  >
                    {mode === 'draw' ? '✍ Draw Signature' : 'Aa Type Signature'}
                  </button>
                ))}
              </div>

              {sigMode === 'draw' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={s.label}>Draw your signature below</label>
                    <button
                      type="button"
                      onClick={() => { padRef.current?.clear(); setPadEmpty(false) }}
                      style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                  <SignaturePad ref={padRef} height={150} onBegin={() => setPadEmpty(false)} />
                  {padEmpty && (
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '6px 0 0', textAlign: 'center' }}>
                      Sign above using your finger or mouse
                    </p>
                  )}
                </div>
              )}

              {sigMode === 'type' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={s.label}>Signature preview</label>
                  <div style={{ background: '#fafafa', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '16px 20px', minHeight: 70, display: 'flex', alignItems: 'center' }}>
                    {signedBy.trim() ? (
                      <span style={{ fontFamily: '"Dancing Script","Brush Script MT",cursive', fontSize: 'clamp(1.5rem,5vw,2.25rem)', color: '#111', borderBottom: '1.5px solid #374151', paddingBottom: 2 }}>
                        {signedBy}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Type your legal name above to generate signature</span>
                    )}
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem', color: '#374151', lineHeight: 1.5, marginBottom: 20, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  style={{ marginTop: 3, accentColor: '#7B2FFF', width: 16, height: 16, flexShrink: 0 }}
                />
                <span>
                  I have read and agree to the PurePulse Affiliate Program Agreement, including recurring commission terms, performance bonuses, and conduct standards.
                </span>
              </label>

              {submitError && <p style={{ ...s.errorMsg, marginBottom: 16 }}>{submitError}</p>}

              <button
                onClick={submitApplication}
                disabled={!canSign || submitting}
                style={{ ...s.btn, background: '#7B2FFF', opacity: (!canSign || submitting) ? 0.45 : 1, cursor: (!canSign || submitting) ? 'not-allowed' : 'pointer', marginBottom: 12 }}
              >
                {submitting ? 'Creating your affiliate account…' : 'Sign Terms & Open Affiliate Portal →'}
              </button>

              <button
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{ ...s.btn, background: '#f3f4f6', color: '#111' }}
              >
                ← Back to Pre-Screen &amp; Info
              </button>

              <p style={{ ...s.fine, marginTop: 16 }}>
                Electronic signature legally binding under ESIGN Act &amp; UETA. Timestamp and IP logged.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success & Instant Portal Entry ── */}
        {step === 3 && (
          <div style={s.card}>
            <div style={s.successIcon}>✓</div>
            <h1 style={{ ...s.h1, textAlign: 'center', marginBottom: 6 }}>You&apos;re officially a partner! 🎉</h1>
            <p style={{ ...s.sub, textAlign: 'center', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
              Your affiliate account is active. We sent a backup login link to <strong>{resultEmail}</strong>. You can enter your portal right now below.
            </p>

            {/* Referral code & Link box */}
            <div style={s.codeBox}>
              <p style={s.codeLabel}>Your Unique Partner Code</p>
              <p style={s.code}>{referralCode}</p>
              
              <p style={{ ...s.codeLabel, marginTop: 16 }}>Your Referral Link</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <code style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 8, fontSize: '0.875rem', color: '#7B2FFF', wordBreak: 'break-all' }}>
                  {referralUrl}
                </code>
                <CopyButton text={referralUrl} label="Copy Link" />
              </div>
            </div>

            {/* Direct Portal CTA */}
            <div style={{ background: 'linear-gradient(135deg, rgba(123,47,255,0.08), rgba(0,212,255,0.06))', border: '1.5px solid #e0d4fc', borderRadius: 12, padding: '24px 20px', marginBottom: 24, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.125rem', fontWeight: 800, color: '#111' }}>
                Ready to explore your partner tools?
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#555', lineHeight: 1.5 }}>
                Inside your portal: download high-res printable flyers, generate social media graphics and campaigns, track commissions live, and link your bank account for payouts.
              </p>
              <a
                href={actionLink || '/affiliates/dashboard'}
                style={{
                  display: 'inline-block',
                  background: '#111',
                  color: '#fff',
                  padding: '14px 32px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                Enter Affiliate Portal Now →
              </a>
            </div>

            {/* QR code */}
            <div style={s.qrWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr?data=${encodeURIComponent(referralUrl)}&size=360`}
                alt="Referral QR code"
                width={160}
                height={160}
                style={{ display: 'block', margin: '0 auto', borderRadius: 10, border: '1px solid #e5e7eb' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 8 }}>
                Scan with your phone to preview your partner landing page
              </p>
            </div>

            <div style={s.nextSteps}>
              <p style={s.nextStepsLabel}>What&apos;s available in your portal:</p>
              <ul style={s.nextStepsList}>
                <li><strong>Printable Assets:</strong> Full-page flyers, business cards, tear-off tab posters &amp; vector QR codes</li>
                <li><strong>Social Media Studio:</strong> 1:1, 9:16, 16:9 graphic generator &amp; pre-written high-converting copy</li>
                <li><strong>Commission Tracking:</strong> Live breakdown of active clients, MRR earnings, and payout dates</li>
                <li><strong>Bank &amp; Payouts:</strong> Direct deposit setup via Stripe Connect for automatic monthly payouts</li>
              </ul>
            </div>

            <a
              href={actionLink || '/affiliates/dashboard'}
              style={{ ...s.btn, background: '#7B2FFF', marginTop: 8 }}
            >
              Open Affiliate Portal →
            </a>
          </div>
        )}
      </main>

      <footer style={s.footer}>
        © {new Date().getFullYear()} PurePulse · <Link href="/affiliates" style={{ color: '#9ca3af' }}>Affiliate Program</Link> · <a href="https://purepulse.one" style={{ color: '#9ca3af' }}>purepulse.one</a>
      </footer>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: '8px 16px',
        background: copied ? '#22c55e' : '#111',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontWeight: 600,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.2s',
      }}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  headerTag: { fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 },
  progress: { display: 'flex', alignItems: 'center', gap: 0, padding: '16px 24px', background: '#fff', borderBottom: '1px solid #f3f4f6', justifyContent: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 },
  progressLine: { width: 48, height: 2, flexShrink: 0 },
  progressLabel: { fontSize: '0.8125rem', fontWeight: 600 },
  main: { maxWidth: 760, margin: '40px auto', padding: '0 24px 80px' },
  card: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '36px 32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  h1: { fontSize: 'clamp(1.4rem, 4vw, 1.875rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' },
  sub: { fontSize: '0.9375rem', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' },
  input: { padding: '11px 13px', fontSize: '0.9375rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', width: '100%' },
  errorMsg: { color: '#b91c1c', fontSize: '0.875rem', margin: 0 },
  btn: { display: 'block', width: '100%', padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' },
  fine: { fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.6 },
  termsBox: { background: '#fafafa', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', maxHeight: '38vh', overflowY: 'auto' },
  termsPre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.8, color: '#374151', margin: 0 },
  successIcon: { width: 56, height: 56, borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', margin: '0 auto 16px', lineHeight: '56px', textAlign: 'center' },
  codeBox: { background: '#f8f8f8', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 20, textAlign: 'center' },
  codeLabel: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: '0 0 6px' },
  code: { fontSize: '2.25rem', fontWeight: 800, letterSpacing: '0.1em', color: '#111', margin: 0, fontFamily: 'monospace' },
  qrWrap: { textAlign: 'center', marginBottom: 20 },
  nextSteps: { background: '#f9f9f9', borderRadius: 10, padding: '16px 20px', marginBottom: 20 },
  nextStepsLabel: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', margin: '0 0 8px' },
  nextStepsList: { margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: '0.875rem', lineHeight: 1.8 },
  footer: { textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: '0.8rem', borderTop: '1px solid #e5e7eb' },
}
