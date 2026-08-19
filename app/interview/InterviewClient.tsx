'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
} from 'lucide-react'

const INTRO_VIDEO_URL = 'https://ouwyuxqlvjvxdobjnezu.supabase.co/storage/v1/object/public/media/videoplayback.mp4'

interface Question {
  id: string
  section: string
  title: string
  prompt: string
  maxSeconds: number
  prepTip: string
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    section: '1. Outreach & Prospecting Strategy',
    title: 'Target Selection',
    prompt: 'PurePulse focuses on SMBs needing modern, fast sites. If handed your affiliate link today, what 3 local business types would you target first and why?',
    maxSeconds: 90,
    prepTip: 'Think of specific industries in your area (e.g. contractors, auto shops, boutique gyms) and why their websites need improvement.',
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
    prepTip: 'Focus on Google SEO, ownership vs rented audience, conversion rates, and professional credibility.',
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
    prompt: 'Scenario: Imagine the interviewer is a local auto repair shop or restaurant owner you just walked in to meet. Give a 60–90 second introduction to spark interest, explain PurePulse, and capture their contact info.',
    maxSeconds: 100,
    prepTip: 'Keep it conversational, consultative, and ask a closing question to get their email or phone number for a preview link.',
  },
]

export default function InterviewClient({ token }: { token?: string }) {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'welcome' | 'device_check' | 'questions' | 'review' | 'submitted'>('welcome')
  
  // Unique Session ID for this interview attempt
  const [sessionId] = useState(() => {
    if (token && token !== 'prescreen' && token !== 'affiliate-prescreen') return token
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `SES-${rand}`
  })

  // Candidate Form — reads from applicant, candidate, or name query params
  const [name, setName] = useState(
    searchParams.get('applicant') ||
    searchParams.get('candidate') ||
    searchParams.get('name') ||
    ''
  )
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [formError, setFormError] = useState('')

  // Device & Stream State
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermissions, setHasPermissions] = useState(false)
  const [deviceError, setDeviceError] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)

  // Question Recording State
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedBlobs, setRecordedBlobs] = useState<Record<string, Blob>>({})
  const [recordedUrls, setRecordedUrls] = useState<Record<string, string>>({})
  const [textFallbackAnswers, setTextFallbackAnswers] = useState<Record<string, string>>({})
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const currentQuestion = QUESTIONS[currentQIndex]

  // Setup media stream
  const setupMedia = useCallback(async () => {
    try {
      setDeviceError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      })
      setStream(mediaStream)
      setHasPermissions(true)

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream
      }

      // Audio meter
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
      setDeviceError('Unable to access camera and microphone. Please allow permissions in your browser or use the text answer option.')
      setHasPermissions(false)
    }
  }, [])

  // Attach stream to video ref whenever stream or step changes
  useEffect(() => {
    if (stream && liveVideoRef.current && (step === 'device_check' || step === 'questions')) {
      liveVideoRef.current.srcObject = stream
    }
  }, [stream, step, currentQIndex])

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [stream])

  // Start recording with 3-second countdown
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
    
    // Choose mime type supported by browser
    let mimeType = 'video/webm;codecs=vp9,opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4'
        }
      }
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
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
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    setIsRecording(false)
  }

  const reRecord = () => {
    if (recordedUrls[currentQuestion.id]) {
      URL.revokeObjectURL(recordedUrls[currentQuestion.id])
    }
    setRecordedBlobs((prev) => {
      const updated = { ...prev }
      delete updated[currentQuestion.id]
      return updated
    })
    setRecordedUrls((prev) => {
      const updated = { ...prev }
      delete updated[currentQuestion.id]
      return updated
    })
    setRecordingSeconds(0)
  }

  const nextQuestion = () => {
    if (currentQIndex < QUESTIONS.length - 1) {
      setCurrentQIndex((i) => i + 1)
      setRecordingSeconds(0)
    } else {
      setStep('review')
    }
  }

  const prevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((i) => i - 1)
      setRecordingSeconds(0)
    }
  }

  // Handle Complete Submission
  const submitInterview = async () => {
    setIsUploading(true)
    setUploadProgress(10)

    try {
      const finalVideoUrls: Record<string, string> = {}

      // Upload each recorded blob to /api/interviews/upload
      const questionKeys = Object.keys(recordedBlobs)
      let completedUploads = 0

      for (const qId of questionKeys) {
        const blob = recordedBlobs[qId]
        if (blob) {
          const formData = new FormData()
          formData.append('video', blob, `${qId}.webm`)
          formData.append('questionId', qId)
          formData.append('email', email.trim())

          try {
            const res = await fetch('/api/interviews/upload', {
              method: 'POST',
              body: formData,
            })
            const data = await res.json()
            if (data.ok && data.url) {
              finalVideoUrls[qId] = data.url
            }
          } catch (uploadErr) {
            console.warn(`[submitInterview] Video upload for ${qId} fallback:`, uploadErr)
          }
        }
        completedUploads++
        setUploadProgress(10 + Math.round((completedUploads / Math.max(1, questionKeys.length)) * 70))
      }

      // Submit metadata to /api/interviews/submit
      const submitRes = await fetch('/api/interviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: name.trim(),
          candidate_email: email.trim(),
          candidate_phone: phone.trim(),
          job_title: 'Affiliate Sales Partner',
          video_urls: finalVideoUrls,
          text_answers: textFallbackAnswers,
          roleplay_video_url: finalVideoUrls.roleplay || null,
        }),
      })

      const submitData = await submitRes.json()
      if (submitRes.ok && submitData.ok) {
        setUploadProgress(100)
        setSubmissionSuccess(true)
        setStep('submitted')
      } else {
        throw new Error(submitData.error || 'Submission failed')
      }
    } catch (err) {
      console.error('[submitInterview] Error:', err)
      alert('There was an issue submitting your interview. Please check your connection and try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // -------------------------------------------------------------
  // RENDER: STEP 0 — WELCOME & INTRO VIDEO
  // -------------------------------------------------------------
  if (step === 'welcome') {
    return (
      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(123,47,255,0.15)', border: '1px solid rgba(123,47,255,0.3)', padding: '0.35rem 1rem', borderRadius: '100px', fontSize: '0.8125rem', fontWeight: 600, color: '#A066FF', marginBottom: '1rem' }}>
            <Sparkles size={14} /> Official Affiliate Partner Interview
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>
            Welcome to the PurePulse Virtual Interview
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Watch the quick role overview below, then complete your guided virtual interview questions at your own pace.
          </p>
        </div>

        {/* Embedded Video Player */}
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: '0 12px 36px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #1F1F2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F4F4FF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={14} fill="#A066FF" color="#A066FF" /> Step 1: Watch Partner Opportunity Briefing
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              Required Before Starting
            </span>
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
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Your Information</h2>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            Please confirm your contact details so we can match your interview with your Indeed application and send your partner portal link.
          </p>

          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '0.375rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                style={{ width: '100%', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '0.375rem' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex@example.com"
                style={{ width: '100%', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '0.375rem' }}>
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 000-0000"
                style={{ width: '100%', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (!name.trim() || !email.trim()) {
                  setFormError('Please enter your full name and email address to continue.')
                  return
                }
                setFormError('')
                setStep('device_check')
                setupMedia()
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #7B2FFF, #9747FF)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                padding: '0.875rem 2rem', borderRadius: '100px',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(123,47,255,0.4)',
              }}
            >
              Continue to Camera &amp; Mic Check <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: STEP 1 — DEVICE & PERMISSIONS CHECK
  // -------------------------------------------------------------
  if (step === 'device_check') {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            Camera &amp; Microphone Check
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.9375rem', margin: 0 }}>
            Make sure your webcam is centered, your lighting is clear, and your microphone is picking up your voice.
          </p>
        </div>

        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', overflow: 'hidden', padding: '1.5rem', marginBottom: '2rem' }}>
          {/* Live Preview Box */}
          <div style={{ position: 'relative', width: '100%', height: '360px', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />

            {!hasPermissions && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.85)' }}>
                <Video size={48} color="#7B2FFF" style={{ marginBottom: '1rem' }} />
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>Camera Permission Needed</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem', maxWidth: '400px', marginBottom: '1.25rem' }}>
                  Please click &ldquo;Allow&rdquo; when prompted by your browser to enable your camera and microphone.
                </p>
                <button
                  onClick={setupMedia}
                  style={{ background: '#7B2FFF', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Request Permissions Again
                </button>
              </div>
            )}
          </div>

          {/* Audio Indicator */}
          {hasPermissions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#14141F', padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <Mic size={20} color={audioLevel > 5 ? '#10B981' : '#9CA3AF'} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.375rem' }}>
                  <span>Microphone Input Level</span>
                  <span>{audioLevel > 5 ? 'Active & Ready' : 'Speak to test'}</span>
                </div>
                <div style={{ height: '8px', background: '#2D2D42', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${audioLevel}%`,
                      background: audioLevel > 60 ? '#EF4444' : audioLevel > 5 ? '#10B981' : '#7B2FFF',
                      transition: 'width 0.08s ease-out',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {deviceError && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {deviceError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep('welcome')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <ArrowLeft size={16} /> Back to Overview
            </button>

            <button
              onClick={() => {
                setStep('questions')
                setCurrentQIndex(0)
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: hasPermissions ? 'linear-gradient(135deg, #7B2FFF, #9747FF)' : '#2D2D42',
                color: '#fff', fontWeight: 700, fontSize: '0.9375rem',
                padding: '0.75rem 1.75rem', borderRadius: '100px',
                border: 'none', cursor: 'pointer',
              }}
            >
              Start Question 1 of {QUESTIONS.length} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: STEP 2 — GUIDED QUESTION RECORDING
  // -------------------------------------------------------------
  if (step === 'questions') {
    const hasRecordedCurrent = !!recordedUrls[currentQuestion.id]

    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
            <span>Question {currentQIndex + 1} of {QUESTIONS.length}: <strong style={{ color: '#F4F4FF' }}>{currentQuestion.title}</strong></span>
            <span>{Math.round(((currentQIndex + (hasRecordedCurrent ? 1 : 0)) / QUESTIONS.length) * 100)}% Completed</span>
          </div>
          <div style={{ height: '6px', background: '#1F1F2E', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${((currentQIndex + (hasRecordedCurrent ? 1 : 0)) / QUESTIONS.length) * 100}%`,
                background: 'linear-gradient(90deg, #7B2FFF, #00F5FF)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Question Header Card */}
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {currentQuestion.section}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#9CA3AF', background: '#14141F', padding: '0.25rem 0.6rem', borderRadius: '100px' }}>
              <Clock size={12} /> Max: {currentQuestion.maxSeconds}s
            </span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.4, margin: '0 0 0.75rem', color: '#F4F4FF' }}>
            {currentQuestion.prompt}
          </h2>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Sparkles size={14} color="#00F5FF" /> <strong>Tip:</strong> {currentQuestion.prepTip}
          </p>
        </div>

        {/* Video Recording & Review Stage */}
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', overflow: 'hidden', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '100%', height: '420px', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
            {/* Live Camera View when not reviewing */}
            {!hasRecordedCurrent ? (
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

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '6rem', fontWeight: 900, color: '#A066FF', animation: 'pulse 1s infinite' }}>
                  {countdown}
                </span>
              </div>
            )}

            {/* Live Recording Badge & Timer */}
            {isRecording && (
              <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.7)', padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid rgba(239,68,68,0.4)' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
                  REC {recordingSeconds}s / {currentQuestion.maxSeconds}s
                </span>
              </div>
            )}

            {/* Recording Remaining Time Bar */}
            {isRecording && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.2)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(recordingSeconds / currentQuestion.maxSeconds) * 100}%`,
                    background: '#EF4444',
                    transition: 'width 1s linear',
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {!hasRecordedCurrent && !isRecording && (
                <button
                  onClick={startRecordingFlow}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#EF4444', color: '#fff', fontWeight: 700,
                    padding: '0.75rem 1.75rem', borderRadius: '100px',
                    border: 'none', cursor: 'pointer', fontSize: '0.9375rem',
                    boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
                  }}
                >
                  <Video size={18} /> Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#fff', color: '#000', fontWeight: 700,
                    padding: '0.75rem 1.75rem', borderRadius: '100px',
                    border: 'none', cursor: 'pointer', fontSize: '0.9375rem',
                  }}
                >
                  <div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }} /> Stop Recording
                </button>
              )}

              {hasRecordedCurrent && !isRecording && (
                <button
                  onClick={reRecord}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#1F1F2E', color: '#D1D5DB', fontWeight: 600,
                    padding: '0.625rem 1.25rem', borderRadius: '8px',
                    border: '1px solid #2D2D42', cursor: 'pointer', fontSize: '0.875rem',
                  }}
                >
                  <RotateCcw size={16} /> Re-record Answer
                </button>
              )}
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {currentQIndex > 0 && (
                <button
                  onClick={prevQuestion}
                  disabled={isRecording}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    background: 'transparent', color: '#9CA3AF', border: '1px solid #2D2D42',
                    padding: '0.625rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem',
                  }}
                >
                  <ArrowLeft size={16} /> Previous
                </button>
              )}

              <button
                onClick={nextQuestion}
                disabled={isRecording || (!hasRecordedCurrent && !textFallbackAnswers[currentQuestion.id])}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: (hasRecordedCurrent || textFallbackAnswers[currentQuestion.id]) ? 'linear-gradient(135deg, #7B2FFF, #9747FF)' : '#1F1F2E',
                  color: (hasRecordedCurrent || textFallbackAnswers[currentQuestion.id]) ? '#fff' : '#6B7280',
                  fontWeight: 700, padding: '0.75rem 1.75rem', borderRadius: '100px',
                  border: 'none', cursor: (hasRecordedCurrent || textFallbackAnswers[currentQuestion.id]) ? 'pointer' : 'not-allowed', fontSize: '0.9375rem',
                }}
              >
                {currentQIndex === QUESTIONS.length - 1 ? 'Review & Submit' : 'Confirm & Next'} <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Text Fallback Option */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #1F1F2E', paddingTop: '1rem' }}>
            <button
              onClick={() => setShowTextFallback(!showTextFallback)}
              style={{ background: 'transparent', border: 'none', color: '#6B7280', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {showTextFallback ? 'Hide text fallback option' : 'Camera having issues? Type your answer instead'}
            </button>

            {showTextFallback && (
              <div style={{ marginTop: '0.75rem' }}>
                <textarea
                  rows={3}
                  value={textFallbackAnswers[currentQuestion.id] || ''}
                  onChange={(e) => setTextFallbackAnswers({ ...textFallbackAnswers, [currentQuestion.id]: e.target.value })}
                  placeholder="Type your response to this interview question here..."
                  style={{ width: '100%', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: STEP 3 — REVIEW & SUBMIT
  // -------------------------------------------------------------
  if (step === 'review') {
    const recordedCount = Object.keys(recordedBlobs).length + Object.keys(textFallbackAnswers).length

    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.35rem 1rem', borderRadius: '100px', fontSize: '0.8125rem', fontWeight: 600, color: '#10B981', marginBottom: '1rem' }}>
            <CheckCircle2 size={14} /> All Questions Completed
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            Ready to Submit Your Interview
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.9375rem', margin: 0 }}>
            You have recorded responses for all {QUESTIONS.length} questions. Click submit to send your interview to the PurePulse hiring team.
          </p>
        </div>

        {/* Summary Card */}
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '1.75rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#F4F4FF' }}>Candidate Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: '#14141F', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'block' }}>Name</span>
              <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>{name}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'block' }}>Email</span>
              <strong style={{ fontSize: '0.9375rem', color: '#A066FF' }}>{email}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'block' }}>Role</span>
              <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>Affiliate Sales Partner</strong>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#F4F4FF' }}>Recorded Question Answers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {QUESTIONS.map((q, idx) => {
              const hasVideo = !!recordedUrls[q.id]
              const hasText = !!textFallbackAnswers[q.id]

              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#14141F', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F4F4FF' }}>
                        Q{idx + 1}. {q.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'block' }}>
                        {hasVideo ? '🎥 Video Response' : hasText ? '📝 Text Response' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentQIndex(idx)
                      setStep('questions')
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#A066FF', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Review / Re-record
                  </button>
                </div>
              )
            })}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div style={{ marginBottom: '1.5rem', background: '#14141F', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F4F4FF' }}>
                  <Loader2 size={14} className="animate-spin" /> Uploading video recordings...
                </span>
                <span style={{ color: '#A066FF', fontWeight: 700 }}>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: '#2D2D42', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #7B2FFF, #00F5FF)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep('questions')}
              disabled={isUploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <ArrowLeft size={16} /> Back to Questions
            </button>

            <button
              onClick={submitInterview}
              disabled={isUploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                padding: '0.875rem 2.25rem', borderRadius: '100px',
                border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
              }}
            >
              {isUploading ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Send size={18} /> Submit Interview Now</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: STEP 4 — SUBMISSION CONFIRMATION
  // -------------------------------------------------------------
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#10B981' }}>
        <CheckCircle2 size={32} />
      </div>

      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.03em' }}>
        Interview Received!
      </h1>

      <p style={{ color: '#9CA3AF', fontSize: '1.0625rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
        Thank you for submitting your virtual interview, <strong style={{ color: '#fff' }}>{name}</strong>. Our hiring team is reviewing your video responses and roleplay pitch.
      </p>

      <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '1.75rem', textAlign: 'left', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#F4F4FF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="#A066FF" /> What Happens Next
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#9CA3AF', fontSize: '0.875rem', lineHeight: 1.8 }}>
          <li>We will review your video responses within <strong>24–48 hours</strong>.</li>
          <li>A confirmation email has been dispatched to <strong style={{ color: '#fff' }}>{email}</strong>.</li>
          <li>Selected candidates receive an official partner invite with their referral code, marketing materials, and portal access.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <a
          href={`/affiliates/apply?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg, #7B2FFF, #9747FF)',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            padding: '0.875rem 2.25rem', borderRadius: '100px', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(123,47,255,0.4)',
          }}
        >
          Sign Partner Agreement &amp; Open Portal →
        </a>

        <a
          href="https://purepulse.one"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.06)', border: '1px solid #2D2D42',
            color: '#9CA3AF', fontWeight: 600, fontSize: '0.875rem',
            padding: '0.625rem 1.5rem', borderRadius: '100px', textDecoration: 'none',
          }}
        >
          <Building2 size={15} /> Return to PurePulse.one
        </a>
      </div>
    </div>
  )
}
