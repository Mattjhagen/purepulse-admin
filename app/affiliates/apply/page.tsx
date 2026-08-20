'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
    id: 'q3',
    section: '1. Outreach & Prospecting Strategy',
    title: 'Pipeline & Follow-Up',
    prompt: 'How do you organize your daily prospecting list and follow-up cadence so potential referrals don\'t go cold or get lost?',
    maxSeconds: 75,
    prepTip: 'Explain your tracking methods (spreadsheets, CRM, daily schedule) and how many times you follow up.',
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
    id: 'q5',
    section: '2. Value Proposition & Handling Objections',
    title: 'Handling Price Resistance',
    prompt: 'When an owner states that web design is too expensive or not a current priority, how do you steer them toward ROI and customer acquisition?',
    maxSeconds: 90,
    prepTip: 'Mention PurePulse\'s low $150 deposit, zero maintenance headache, and how 1 new client pays for the site.',
  },
  {
    id: 'q6',
    section: '3. Workflow, Tools & Lead Qualification',
    title: 'Platform & Tracking Comfort',
    prompt: 'Our affiliates use an online dashboard to generate tracking links, access printable assets, and monitor payouts. How comfortable are you navigating web portals and digital tools?',
    maxSeconds: 60,
    prepTip: 'Highlight your familiarity with modern web tools, social media marketing, and QR code tracking.',
  },
  {
    id: 'q7',
    section: '3. Workflow, Tools & Lead Qualification',
    title: 'Lead Qualification',
    prompt: 'What key questions will you ask a business owner upfront before submitting them to make sure they are genuinely ready for a new website?',
    maxSeconds: 75,
    prepTip: 'Think about budget authority, timeline, current pain points, and willingness to modernize.',
  },
  {
    id: 'q8',
    section: '4. Drive & Execution',
    title: 'Self-Discipline & Weekly Structure',
    prompt: 'Affiliate partnerships are performance-driven and independent. How do you plan to structure your weekly schedule to hit outreach numbers consistently?',
    maxSeconds: 75,
    prepTip: 'Outline your daily prospecting hours, walk-in routes, follow-up blocks, and target referral volume.',
  },
  {
    id: 'roleplay',
    section: '5. Quick Roleplay: Local Business Pitch',
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

function ApplyContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>(1)

  // Step 1: Candidate Info & Pre-screen Fields
  const [name, setName] = useState(
    searchParams.get('name') ||
    searchParams.get('applicant') ||
    searchParams.get('candidate') ||
    ''
  )
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [notes, setNotes] = useState('')
  const [step1Error, setStep1Error] = useState('')

  // Sync if search params change
  useEffect(() => {
    const qName = searchParams.get('name') || searchParams.get('applicant') || searchParams.get('candidate')
    const qEmail = searchParams.get('email')
    const qPhone = searchParams.get('phone')
    if (qName && !name) setName(qName)
    if (qEmail && !email) setEmail(qEmail)
    if (qPhone && !phone) setPhone(qPhone)
  }, [searchParams])

  // Video / Audio Recording State
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermissions, setHasPermissions] = useState(false)

  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedBlobs, setRecordedBlobs] = useState<Record<string, Blob>>({})
  const [recordedUrls, setRecordedUrls] = useState<Record<string, string>>({})
  const [recordedDurations, setRecordedDurations] = useState<Record<string, number>>({})
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
      console.error('[setupMedia] Error accessing camera/mic:', err)
      setStep1Error('Unable to access camera and microphone. Please allow permissions in your browser or type your responses below.')
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
    setRecordedDurations((prev) => ({ ...prev, [currentQuestion.id]: recordingSeconds }))
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
    setRecordedDurations((prev) => {
      const u = { ...prev }
      delete u[currentQuestion.id]
      return u
    })
    setRecordingSeconds(0)
  }

  const isQuestionAnswered = (qId: string) => {
    const duration = recordedDurations[qId] ?? (recordedUrls[qId] ? 30 : 0)
    const hasValidVideo = !!(recordedUrls[qId] && duration >= 30)
    const textLen = (textAnswers[qId] || '').trim().length
    const hasValidText = textLen >= 300
    return hasValidVideo || hasValidText
  }

  const currentVideoDuration = recordedDurations[currentQuestion.id] ?? (recordedUrls[currentQuestion.id] ? 30 : 0)
  const currentHasValidVideo = !!(recordedUrls[currentQuestion.id] && currentVideoDuration >= 30)
  const currentTextLength = (textAnswers[currentQuestion.id] || '').trim().length
  const currentHasValidText = currentTextLength >= 300
  const isCurrentQuestionValid = currentHasValidVideo || currentHasValidText

  const answeredCount = PRESCREEN_QUESTIONS.filter((q) => isQuestionAnswered(q.id)).length
  const allQuestionsAnswered = answeredCount === PRESCREEN_QUESTIONS.length

  const handleNextQuestion = () => {
    if (!isCurrentQuestionValid) {
      setStep1Error(`Please record at least a 30-second video response or type at least 300 characters for Question ${currentQIndex + 1} before advancing.`)
      return
    }
    setStep1Error('')
    if (currentQIndex < PRESCREEN_QUESTIONS.length - 1) {
      setCurrentQIndex((i) => i + 1)
      setRecordingSeconds(0)
    }
  }

  const handleSelectQuestion = (idx: number) => {
    if (idx > currentQIndex && !isCurrentQuestionValid) {
      setStep1Error(`Please complete Question ${currentQIndex + 1} (30s+ video or 300+ characters) before moving forward.`)
      return
    }
    for (let i = 0; i < idx; i++) {
      if (!isQuestionAnswered(PRESCREEN_QUESTIONS[i].id)) {
        setCurrentQIndex(i)
        setStep1Error(`Please complete Question ${i + 1} (${PRESCREEN_QUESTIONS[i].title}) first.`)
        return
      }
    }
    setStep1Error('')
    setCurrentQIndex(idx)
    setRecordingSeconds(0)
  }

  function validateStep1() {
    if (!name.trim()) { setStep1Error('Please enter your full name.'); return false }
    if (!email.trim() || !email.includes('@')) { setStep1Error('Please enter a valid email address.'); return false }

    const unanswered = PRESCREEN_QUESTIONS
      .map((q, idx) => ({ q, idx, answered: isQuestionAnswered(q.id) }))
      .filter((x) => !x.answered)

    if (unanswered.length > 0) {
      setCurrentQIndex(unanswered[0].idx)
      setStep1Error(`Please complete Question ${unanswered[0].idx + 1} (${unanswered[0].q.title}) with at least a 30-second video or 300-character typed response before signing the contract (${unanswered.length} remaining).`)
      return false
    }

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0, color: '#111' }}>
                    Pre-Screen Questions (Question {currentQIndex + 1} of {PRESCREEN_QUESTIONS.length})
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#7B2FFF', fontWeight: 600 }}>
                    {currentQuestion.title}
                  </span>
                </div>

                {/* Question Status Pills */}
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  {PRESCREEN_QUESTIONS.map((q, idx) => {
                    const isDone = isQuestionAnswered(q.id)
                    const isCurrent = currentQIndex === idx
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleSelectQuestion(idx)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isCurrent ? '1.5px solid #7B2FFF' : isDone ? '1px solid #10B981' : '1px solid #d1d5db',
                          background: isCurrent ? 'rgba(123,47,255,0.12)' : isDone ? 'rgba(16,185,129,0.1)' : '#f9fafb',
                          color: isCurrent ? '#7B2FFF' : isDone ? '#10B981' : '#6b7280',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        Q{idx + 1} {isDone ? '✓' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Question Card */}
              <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#7B2FFF', fontWeight: 700, textTransform: 'uppercase' }}>
                    {currentQuestion.section}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', background: '#E5E7EB', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Requirement: 30s+ Video OR 300+ Typed Characters
                  </span>
                </div>
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
                    Record Video Response (30s minimum)
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
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.75)', padding: '0.35rem 0.75rem', borderRadius: '100px', border: recordingSeconds >= 30 ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(239,68,68,0.5)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: recordingSeconds >= 30 ? '#10B981' : '#EF4444', animation: 'pulse 1s infinite' }} />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                          REC {recordingSeconds}s / {currentQuestion.maxSeconds}s {recordingSeconds < 30 ? `(Min: 30s — ${30 - recordingSeconds}s remaining)` : '✓ Min reached'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Video Validation Status Badge */}
                {recordedUrls[currentQuestion.id] && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    {currentVideoDuration >= 30 ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Video response meets 30s requirement ({currentVideoDuration}s recorded)
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <AlertCircle size={13} /> Video is only {currentVideoDuration}s. Minimum 30 seconds required (or type 300+ characters below).
                      </div>
                    )}
                  </div>
                )}

                {/* Recorder Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {hasPermissions && !recordedUrls[currentQuestion.id] && !isRecording && (
                      <button
                        onClick={startRecordingFlow}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#EF4444', color: '#fff', fontSize: '0.8125rem', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '100px', border: 'none', cursor: 'pointer' }}
                      >
                        <Video size={14} /> Start Video Recording (30s+ min)
                      </button>
                    )}

                    {isRecording && (
                      <button
                        onClick={stopRecording}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fff', color: '#000', fontSize: '0.8125rem', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '100px', border: 'none', cursor: 'pointer' }}
                      >
                        Stop Recording ({recordingSeconds}s)
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
                        onClick={handleNextQuestion}
                        disabled={!isCurrentQuestionValid || isRecording}
                        style={{
                          background: isCurrentQuestionValid ? '#7B2FFF' : '#2D2D42',
                          color: isCurrentQuestionValid ? '#fff' : '#6B7280',
                          padding: '0.4rem 0.875rem', borderRadius: '6px', border: 'none',
                          fontSize: '0.75rem', fontWeight: 700,
                          cursor: isCurrentQuestionValid ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isCurrentQuestionValid ? 'Next Question →' : 'Complete 30s Video or 300 Chars to Advance →'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Fallback */}
                <div style={{ marginTop: '0.875rem', borderTop: '1px solid #1F1F2E', paddingTop: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#D1D5DB', fontWeight: 600 }}>
                      Or type your answer for {currentQuestion.title} (300 characters min):
                    </label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentTextLength >= 300 ? '#10B981' : '#F59E0B' }}>
                      {currentTextLength >= 300 ? (
                        `✓ ${currentTextLength} / 300 chars (Complete)`
                      ) : (
                        `${currentTextLength} / 300 chars (${300 - currentTextLength} more needed)`
                      )}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={textAnswers[currentQuestion.id] || ''}
                    onChange={(e) => setTextAnswers({ ...textAnswers, [currentQuestion.id]: e.target.value })}
                    placeholder="Type your in-depth response here (minimum 300 characters)..."
                    style={{ width: '100%', background: '#14141F', border: currentTextLength >= 300 ? '1px solid #10B981' : '1px solid #2D2D42', borderRadius: '6px', padding: '0.625rem 0.75rem', color: '#fff', fontSize: '0.8125rem', outline: 'none' }}
                  />
                </div>
              </div>

            </div>

            {/* Status & Completion Callout */}
            {!allQuestionsAnswered ? (
              <div style={{ background: 'rgba(123,47,255,0.05)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                  <AlertCircle size={16} color="#7B2FFF" />
                  <span>Answer all 4 questions (video or typed) to unlock the partner contract.</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B2FFF', background: 'rgba(123,47,255,0.12)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                  {answeredCount} / {PRESCREEN_QUESTIONS.length} Completed
                </span>
              </div>
            ) : (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#065F46', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>All 4 pre-screen questions completed! Contract signing is now unlocked.</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                  ✓ 4 / 4 Complete
                </span>
              </div>
            )}

            {step1Error && <p style={s.errorMsg}>{step1Error}</p>}

            <button
              type="button"
              onClick={goToStep2}
              disabled={!allQuestionsAnswered}
              style={{
                ...s.btn,
                background: allQuestionsAnswered ? '#7B2FFF' : '#E5E7EB',
                color: allQuestionsAnswered ? '#ffffff' : '#9CA3AF',
                cursor: allQuestionsAnswered ? 'pointer' : 'not-allowed',
                boxShadow: allQuestionsAnswered ? '0 4px 14px rgba(123,47,255,0.35)' : 'none',
                border: allQuestionsAnswered ? 'none' : '1.5px solid #D1D5DB',
                transition: 'all 0.2s ease',
              }}
            >
              {allQuestionsAnswered ? (
                'Continue to Partner Agreement & Contract →'
              ) : (
                `🔒 Complete All 4 Pre-Screen Questions to Unlock Contract (${answeredCount}/4 Done)`
              )}
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

            {/* Microsoft Teams Partner Community Invite */}
            <div style={{ background: '#111118', border: '1.5px solid #2D2D42', borderRadius: 12, padding: '20px 22px', marginBottom: 24, textAlign: 'center', color: '#fff' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(91,95,199,0.15)', border: '1px solid rgba(91,95,199,0.3)', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, color: '#7B83EB', marginBottom: '0.625rem' }}>
                💬 Partner Community
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.0625rem', fontWeight: 800, color: '#F4F4FF' }}>
                Join the PurePulse Affiliate Teams Community
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.5, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
                Connect directly with our team on Microsoft Teams, get instant sales enablement materials, ask outreach questions, and get notified on new deal closures.
              </p>
              <a
                href="https://teams.live.com/l/community/FAAT7_iyVqeIobIvQ?v=g1"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #5B5FC7, #464EB8)',
                  color: '#fff',
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(91,95,199,0.4)',
                }}
              >
                Join Teams Community Channel →
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
        © {new Date().getFullYear()} PurePulse · <Link href="/affiliates" style={{ color: '#9ca3af' }}>Affiliate Program</Link> · <Link href="/affiliates/login" style={{ color: '#9ca3af' }}>Partner Sign In</Link> · <a href="https://purepulse.one" style={{ color: '#9ca3af' }}>purepulse.one</a>
      </footer>
    </div>
  )
}


export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#6b7280' }}>
        Loading partner application...
      </div>
    }>
      <ApplyContent />
    </Suspense>
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
