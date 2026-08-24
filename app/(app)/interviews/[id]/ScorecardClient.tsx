'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Video,
  Play,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Loader2,
  Check,
  X,
  ExternalLink,
  Eye,
  FileText,
  UploadCloud,
  Download,
  Trash2,
} from 'lucide-react'

interface InterviewData {
  id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string | null
  job_title: string
  status: string
  overall_score?: number
  scores?: Record<string, number | null>
  evaluation_matrix?: Record<string, 'green' | 'red' | null>
  admin_notes?: string | null
  recommendation?: string | null
  video_urls?: Record<string, string>
  text_answers?: Record<string, string>
  roleplay_video_url?: string | null
  created_at: string
  reviewed_at?: string | null
  application_pdf_url?: string | null
  application_pdf_name?: string | null
  application_pdf_uploaded_at?: string | null
}

interface QuestionDef {
  id: string
  section: string
  number: string
  title: string
  prompt: string
}

const SCORECARD_QUESTIONS: QuestionDef[] = [
  {
    id: 'q1',
    section: '1. OUTREACH & PROSPECTING STRATEGY',
    number: 'Q1',
    title: 'Target Selection',
    prompt: 'PurePulse focuses on SMBs needing modern, fast sites. If handed your affiliate link today, what 3 local business types would you target first and why?',
  },
  {
    id: 'q2',
    section: '1. OUTREACH & PROSPECTING STRATEGY',
    number: 'Q2',
    title: 'Cold Outreach Comfort',
    prompt: 'Much of affiliate outreach involves walking into storefronts, calling, or direct messaging owners. How comfortable are you initiating cold conversations?',
  },
  {
    id: 'q3',
    section: '1. OUTREACH & PROSPECTING STRATEGY',
    number: 'Q3',
    title: 'Pipeline & Follow-Up',
    prompt: 'How do you organize your daily prospecting list and follow-up cadence so potential referrals don\'t go cold or get lost?',
  },
  {
    id: 'q4',
    section: '2. VALUE PROPOSITION & HANDLING OBJECTIONS',
    number: 'Q4',
    title: 'Value Framing',
    prompt: 'How would you explain the value of a custom website to a brick-and-mortar store owner who says: "I already have a Facebook page, so I don\'t need a website"?',
  },
  {
    id: 'q5',
    section: '2. VALUE PROPOSITION & HANDLING OBJECTIONS',
    number: 'Q5',
    title: 'Price Resistance',
    prompt: 'When an owner states that web design is too expensive or not a current priority, how do you steer them toward ROI and customer acquisition?',
  },
  {
    id: 'q6',
    section: '3. WORKFLOW, TOOLS & LEAD QUALIFICATION',
    number: 'Q6',
    title: 'Platform & Tracking',
    prompt: 'Our affiliates use an online dashboard to generate tracking links and monitor payouts. How comfortable are you navigating web portals and digital tools?',
  },
  {
    id: 'q7',
    section: '3. WORKFLOW, TOOLS & LEAD QUALIFICATION',
    number: 'Q7',
    title: 'Lead Qualification',
    prompt: 'What key questions will you ask a business owner upfront before submitting them to make sure they are genuinely ready for a new website?',
  },
  {
    id: 'q8',
    section: '4. DRIVE & EXECUTION',
    number: 'Q8',
    title: 'Self-Discipline',
    prompt: 'Affiliate partnerships are performance-driven and independent. How do you plan to structure your weekly schedule to hit outreach numbers consistently?',
  },
  {
    id: 'roleplay',
    section: '5. QUICK ROLEPLAY: LOCAL BUSINESS OWNER PITCH',
    number: 'Pitch',
    title: '60–90s Pitch to Owner',
    prompt: 'Scenario: Interviewer acts as a local auto repair / restaurant owner. Candidate gives a 60–90s introduction to spark interest and capture contact info.',
  },
]

export default function ScorecardClient({ interview }: { interview: InterviewData }) {
  const [currentStatus, setCurrentStatus] = useState<string>(interview.status || 'submitted')
  const [activeQuestionId, setActiveQuestionId] = useState<string>('q1')
  const [scores, setScores] = useState<Record<string, number | null>>(interview.scores || {})
  const [matrix, setMatrix] = useState<Record<string, 'green' | 'red' | null>>(interview.evaluation_matrix || {})
  const [recommendation, setRecommendation] = useState<string>(interview.recommendation || '')
  const [notes, setNotes] = useState<string>(interview.admin_notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Action Modals State
  const [actionModal, setActionModal] = useState<'schedule' | 'hold' | 'decline' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState('')

  // Schedule In-Person Form
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    d.setHours(14, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [scheduleLocation, setScheduleLocation] = useState('PurePulse Design Studio / Google Meet')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleSendEmail, setScheduleSendEmail] = useState(true)

  // Hold / Decline Form
  const [modalNotes, setModalNotes] = useState('')
  const [modalSendEmail, setModalSendEmail] = useState(true)

  // Onboarding action state
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [onboardResult, setOnboardResult] = useState<{ referral_code?: string; portal_url?: string; message?: string } | null>(null)

  // Application PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(interview.application_pdf_url || null)
  const [pdfName, setPdfName] = useState<string | null>(interview.application_pdf_name || null)
  const [pdfUploadedAt, setPdfUploadedAt] = useState<string | null>(interview.application_pdf_uploaded_at || null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const uploadPdf = async (file: File) => {
    if (!file) return
    setUploadingPdf(true)
    setPdfMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/interviews/${interview.id}/document`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setPdfUrl(data.url)
        setPdfName(data.fileName)
        setPdfUploadedAt(data.uploadedAt)
        setPdfMsg('Indeed application PDF attached successfully!')
        setTimeout(() => setPdfMsg(''), 4000)
      } else {
        alert(data.error || 'Failed to upload PDF application.')
      }
    } catch (e) {
      console.error(e)
      alert('Error uploading PDF application.')
    } finally {
      setUploadingPdf(false)
    }
  }

  const deletePdf = async () => {
    if (!confirm('Are you sure you want to remove the attached application PDF?')) return
    try {
      const res = await fetch(`/api/interviews/${interview.id}/document`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPdfUrl(null)
        setPdfName(null)
        setPdfUploadedAt(null)
        setShowPdfPreview(false)
        setPdfMsg('Attached application removed.')
        setTimeout(() => setPdfMsg(''), 4000)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Calculate total score
  const totalScore = Object.values(scores).reduce<number>((acc, curr) => acc + (typeof curr === 'number' ? curr : 0), 0)

  const activeQuestion = SCORECARD_QUESTIONS.find((q) => q.id === activeQuestionId) || SCORECARD_QUESTIONS[0]
  const currentVideoUrl = interview.video_urls?.[activeQuestionId] || (activeQuestionId === 'roleplay' ? interview.roleplay_video_url : null)
  const currentTextAnswer = interview.text_answers?.[activeQuestionId]

  const handleScoreChange = (qId: string, scoreVal: number) => {
    setScores((prev) => ({
      ...prev,
      [qId]: prev[qId] === scoreVal ? null : scoreVal,
    }))
  }

  const handleMatrixChange = (area: string, flag: 'green' | 'red') => {
    setMatrix((prev) => ({
      ...prev,
      [area]: prev[area] === flag ? null : flag,
    }))
  }

  const saveScorecard = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores,
          evaluation_matrix: matrix,
          recommendation: recommendation || null,
          admin_notes: notes,
        }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      console.error('[saveScorecard] error:', err)
      alert('Failed to save scorecard. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const executeCandidateAction = async (action: 'schedule_interview' | 'hold' | 'decline') => {
    setActionLoading(true)
    try {
      const payload: Record<string, unknown> = { action }
      if (action === 'schedule_interview') {
        payload.interview_date = scheduleDate
        payload.location_or_link = scheduleLocation
        payload.notes = scheduleNotes
        payload.send_email = scheduleSendEmail
      } else {
        payload.notes = modalNotes
        payload.send_email = modalSendEmail
      }

      const res = await fetch(`/api/interviews/${interview.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok && data.ok) {
        if (action === 'schedule_interview') {
          setCurrentStatus('interview_scheduled')
          setActionSuccessMsg(`In-person interview scheduled for ${new Date(scheduleDate).toLocaleDateString()}! Email notification dispatched.`)
        } else if (action === 'hold') {
          setCurrentStatus('keep_on_file')
          setRecommendation('keep_on_file')
          setActionSuccessMsg('Candidate marked as on hold / kept on file.')
        } else if (action === 'decline') {
          setCurrentStatus('rejected')
          setRecommendation('do_not_proceed')
          setActionSuccessMsg('Application declined and notice sent.')
        }
        setActionModal(null)
        setTimeout(() => setActionSuccessMsg(''), 5000)
      } else {
        alert(data.error || 'Failed to complete action.')
      }
    } catch (err) {
      console.error('[executeCandidateAction] error:', err)
      alert('Action error. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const onboardAffiliate = async () => {
    if (!confirm(`Are you sure you want to approve ${interview.candidate_name} and onboard them into the PurePulse Affiliate Program? This will generate their referral code and send an onboarding email.`)) {
      return
    }

    setIsOnboarding(true)
    try {
      const res = await fetch(`/api/interviews/${interview.id}/onboard`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setOnboardResult(data)
        setCurrentStatus('strong_hire')
        setRecommendation('strong_hire')
      } else {
        alert(data.error || 'Failed to onboard candidate.')
      }
    } catch (err) {
      console.error('[onboardAffiliate] error:', err)
      alert('Error during onboarding. Check server logs.')
    } finally {
      setIsOnboarding(false)
    }
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link
          href="/interviews"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#9CA3AF', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to Candidate List
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Action: Schedule In-Person Interview */}
          <button
            onClick={() => {
              setModalNotes('')
              setActionModal('schedule')
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#1F1F2E', border: '1px solid #3B82F6', color: '#60A5FA',
              fontSize: '0.8125rem', fontWeight: 600,
              padding: '0.625rem 1rem', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            <Calendar size={14} /> Schedule In-Person
          </button>

          {/* Action: Put on Hold / Keep on File */}
          <button
            onClick={() => {
              setModalNotes('')
              setActionModal('hold')
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#14141F', border: '1px solid #4B5563', color: '#9CA3AF',
              fontSize: '0.8125rem', fontWeight: 600,
              padding: '0.625rem 1rem', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            <Clock size={14} /> Put on Hold
          </button>

          {/* Action: Decline */}
          <button
            onClick={() => {
              setModalNotes('')
              setActionModal('decline')
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#14141F', border: '1px solid #7F1D1D', color: '#F87171',
              fontSize: '0.8125rem', fontWeight: 600,
              padding: '0.625rem 1rem', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            <X size={14} /> Decline
          </button>

          {/* Action: Save Scorecard */}
          <button
            onClick={saveScorecard}
            disabled={isSaving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: saveSuccess ? '#10B981' : '#14141F',
              border: '1px solid #2D2D42', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 600,
              padding: '0.625rem 1rem', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saveSuccess ? 'Saved!' : 'Save Scorecard'}
          </button>

          {/* Action: Approve & Onboard */}
          <button
            onClick={onboardAffiliate}
            disabled={isOnboarding}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', fontSize: '0.8125rem', fontWeight: 700,
              padding: '0.625rem 1.25rem', borderRadius: '8px',
              border: 'none', cursor: isOnboarding ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}
          >
            {isOnboarding ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
            Approve &amp; Onboard
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccessMsg && (
        <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#BFDBFE', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} color="#60A5FA" /> {actionSuccessMsg}
        </div>
      )}

      {/* Action Modals */}
      {actionModal === 'schedule' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#100f1c', border: '1px solid rgba(123,47,255,0.4)', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.75rem', color: '#F4F4FF' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>
              📅 Schedule In-Person / Next-Step Interview
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: '#9CA3AF' }}>
              Set interview date, meeting link or address, and dispatch an invitation email directly to {interview.candidate_name}.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Interview Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  style={{ width: '100%', background: '#181726', border: '1px solid #2E2D44', borderRadius: '8px', padding: '0.625rem 0.75rem', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Location or Google Meet Link *
                </label>
                <input
                  type="text"
                  value={scheduleLocation}
                  onChange={e => setScheduleLocation(e.target.value)}
                  placeholder="e.g. 123 Main St / Google Meet Link"
                  style={{ width: '100%', background: '#181726', border: '1px solid #2E2D44', borderRadius: '8px', padding: '0.625rem 0.75rem', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Preparation Notes / Agenda
                </label>
                <textarea
                  rows={2}
                  value={scheduleNotes}
                  onChange={e => setScheduleNotes(e.target.value)}
                  placeholder="e.g. Bring your target prospecting territory list and portfolio questions."
                  style={{ width: '100%', background: '#181726', border: '1px solid #2E2D44', borderRadius: '8px', padding: '0.625rem 0.75rem', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#D1D5DB', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scheduleSendEmail}
                  onChange={e => setScheduleSendEmail(e.target.checked)}
                />
                Send official interview invitation email to {interview.candidate_email}
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setActionModal(null)}
                style={{ background: 'transparent', border: '1px solid #2E2D44', color: '#9CA3AF', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeCandidateAction('schedule_interview')}
                disabled={actionLoading}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                {actionLoading ? 'Scheduling...' : 'Confirm & Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal === 'hold' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#100f1c', border: '1px solid #4B5563', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '1.75rem', color: '#F4F4FF' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>
              ⏸️ Put Candidate on Hold / Keep on File
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: '#9CA3AF' }}>
              Save {interview.candidate_name}'s application for future hiring batches.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Internal Notes
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder="Reason for holding (e.g. territory currently full, re-evaluate next month)..."
                  style={{ width: '100%', background: '#181726', border: '1px solid #2E2D44', borderRadius: '8px', padding: '0.625rem 0.75rem', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#D1D5DB', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={modalSendEmail}
                  onChange={e => setModalSendEmail(e.target.checked)}
                />
                Send polite update email to candidate
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setActionModal(null)}
                style={{ background: 'transparent', border: '1px solid #2E2D44', color: '#9CA3AF', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeCandidateAction('hold')}
                disabled={actionLoading}
                style={{ background: '#4B5563', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                {actionLoading ? 'Updating...' : 'Put on Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal === 'decline' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#100f1c', border: '1px solid #7F1D1D', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '1.75rem', color: '#F4F4FF' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#F87171' }}>
              ❌ Decline Candidate Application
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: '#9CA3AF' }}>
              Mark {interview.candidate_name}'s application as rejected.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#F87171', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Internal Feedback / Reason
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder="Reason for declining (e.g. communication style, roleplay score)..."
                  style={{ width: '100%', background: '#181726', border: '1px solid #2E2D44', borderRadius: '8px', padding: '0.625rem 0.75rem', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#D1D5DB', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={modalSendEmail}
                  onChange={e => setModalSendEmail(e.target.checked)}
                />
                Send polite decline notice email to candidate
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setActionModal(null)}
                style={{ background: 'transparent', border: '1px solid #2E2D44', color: '#9CA3AF', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeCandidateAction('decline')}
                disabled={actionLoading}
                style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                {actionLoading ? 'Declining...' : 'Decline Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Profile Header Card */}
      <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(123,47,255,0.12)', border: '1px solid rgba(123,47,255,0.25)', padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, color: '#A066FF', marginBottom: '0.5rem' }}>
            PurePulse.one Affiliate Interview Scorecard
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#F4F4FF' }}>
            {interview.candidate_name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', color: '#9CA3AF', fontSize: '0.8125rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} color="#A066FF" /> {interview.candidate_email}
            </span>
            {interview.candidate_phone && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={14} /> {interview.candidate_phone}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} /> Submitted {new Date(interview.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Score Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#14141F', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #2D2D42' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Candidate Score</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: totalScore >= 35 ? '#10B981' : totalScore >= 25 ? '#F59E0B' : '#EF4444' }}>
              {totalScore} <span style={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>/ 45</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '40px', background: '#2D2D42' }} />

          <div>
            <span style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Recommendation</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: recommendation === 'strong_hire' ? '#10B981' : recommendation === 'hire_with_training' ? '#3B82F6' : recommendation === 'keep_on_file' ? '#9CA3AF' : recommendation === 'do_not_proceed' ? '#EF4444' : '#F59E0B' }}>
              {recommendation === 'strong_hire' ? 'Strong Hire' : recommendation === 'hire_with_training' ? 'Hire w/ Training' : recommendation === 'keep_on_file' ? 'Keep on File' : recommendation === 'do_not_proceed' ? 'Do Not Proceed' : 'Pending Evaluation'}
            </span>
          </div>
        </div>
      </div>

      {/* Indeed Application & Resume PDF Attachment Card */}
      <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '14px', marginBottom: '1.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1F1F2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ background: 'rgba(123,47,255,0.15)', color: '#A066FF', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#F4F4FF' }}>
                Indeed Application &amp; Candidate Resume (PDF)
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {pdfUrl ? 'Attached PDF is available for review alongside video pre-screen' : 'Attach applicant resume or PDF application export from Indeed'}
              </span>
            </div>
          </div>

          {pdfUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: '#14141F', border: '1px solid #2D2D42', color: '#D1D5DB',
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer'
                }}
              >
                <Eye size={13} /> {showPdfPreview ? 'Hide Preview' : 'Preview PDF'}
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: '#7B2FFF', color: '#fff',
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: '6px', textDecoration: 'none'
                }}
              >
                <ExternalLink size={13} /> Open
              </a>
            </div>
          )}
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {pdfMsg && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#A7F3D0', padding: '0.625rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#10B981" /> {pdfMsg}
            </div>
          )}

          {pdfUrl ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '10px', padding: '0.875rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#F4F4FF' }}>
                      {pdfName || 'Indeed_Application.pdf'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.125rem' }}>
                      Attached {pdfUploadedAt ? new Date(pdfUploadedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recently'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    href={pdfUrl}
                    download={pdfName || 'Indeed_Application.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      background: '#1F1F2E', border: '1px solid #374151', color: '#D1D5DB',
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '6px', textDecoration: 'none'
                    }}
                  >
                    <Download size={13} /> Download
                  </a>

                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: '#1F1F2E', border: '1px solid #374151', color: '#D1D5DB',
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={13} /> Replace
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) uploadPdf(file)
                      }}
                    />
                  </label>

                  <button
                    onClick={deletePdf}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      background: 'transparent', border: '1px solid #7F1D1D', color: '#F87171',
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.55rem', borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>

              {/* Embedded PDF Viewer Preview */}
              {showPdfPreview && (
                <div style={{ marginTop: '1rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid #2D2D42', height: '480px', background: '#000' }}>
                  <iframe
                    src={pdfUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Indeed Application Preview"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) uploadPdf(file)
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: dragActive ? '2px dashed #7B2FFF' : '2px dashed #2D2D42',
                  borderRadius: '10px', padding: '1.75rem 1.5rem', textAlign: 'center',
                  background: dragActive ? 'rgba(123,47,255,0.06)' : '#14141F',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) uploadPdf(file)
                  }}
                />
                {uploadingPdf ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#A066FF' }}>
                    <Loader2 size={26} className="animate-spin" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Uploading Indeed Application PDF...</span>
                  </div>
                ) : (
                  <>
                    <div style={{ background: 'rgba(123,47,255,0.12)', color: '#A066FF', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      <UploadCloud size={20} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F4F4FF', marginBottom: '0.15rem' }}>
                      Upload Indeed Application PDF / Resume
                    </span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>
                      Drag &amp; drop candidate PDF application here, or <span style={{ color: '#A066FF', textDecoration: 'underline' }}>browse file</span>
                    </p>
                  </>
                )}
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Onboard Success Alert */}
      {onboardResult && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem', color: '#D1FAE5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
            <CheckCircle2 size={18} color="#10B981" /> {onboardResult.message}
          </div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#A7F3D0' }}>
            Partner Code: <strong>{onboardResult.referral_code}</strong> • Welcome email dispatched with portal setup link.
          </p>
          {onboardResult.portal_url && (
            <a href={onboardResult.portal_url} target="_blank" style={{ color: '#10B981', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              Open Partner Portal Setup Link <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Main 2-Column Grid: Video Player (Left) & Digital Scorecard (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(460px, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Video Player & Question Selector */}
        <div>
          {/* Question Selector Tabs */}
          <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {SCORECARD_QUESTIONS.map((q) => {
              const hasVideo = !!interview.video_urls?.[q.id] || (q.id === 'roleplay' && !!interview.roleplay_video_url)
              const scoreVal = scores[q.id]
              const isSelected = activeQuestionId === q.id

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  style={{
                    background: isSelected ? '#7B2FFF' : hasVideo ? '#14141F' : 'transparent',
                    border: isSelected ? '1px solid #9747FF' : '1px solid #2D2D42',
                    color: isSelected ? '#fff' : hasVideo ? '#D1D5DB' : '#6B7280',
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  }}
                >
                  {q.number} {scoreVal ? `(${scoreVal}★)` : ''}
                </button>
              )
            })}
          </div>

          {/* Video Player Box */}
          <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', overflow: 'hidden', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', textTransform: 'uppercase' }}>
                {activeQuestion.section}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {activeQuestion.number}: {activeQuestion.title}
              </span>
            </div>

            <div style={{ position: 'relative', width: '100%', height: '320px', background: '#000', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
              {currentVideoUrl ? (
                <video
                  key={currentVideoUrl}
                  src={currentVideoUrl}
                  controls
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', textAlign: 'center', padding: '2rem' }}>
                  <Video size={36} style={{ marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>No video recording uploaded for {activeQuestion.number}.</p>
                  {currentTextAnswer && (
                    <p style={{ color: '#A066FF', fontSize: '0.8125rem', marginTop: '0.5rem' }}>Candidate submitted a text answer below.</p>
                  )}
                </div>
              )}
            </div>

            {/* Question Prompt Display */}
            <div style={{ background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                Question Prompt
              </span>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: '#F4F4FF', lineHeight: 1.4 }}>
                {activeQuestion.prompt}
              </p>

              {currentTextAnswer && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #2D2D42', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    Candidate Text Response:
                  </span>
                  <p style={{ margin: 0, color: '#D1D5DB', fontSize: '0.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {currentTextAnswer}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Digital Scorecard (Matching PDF) */}
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1.25rem', color: '#F4F4FF' }}>
            Candidate Evaluation Form
          </h2>

          {/* Section Questions Scoring */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {SCORECARD_QUESTIONS.map((q) => {
              const currentScore = scores[q.id]
              const isCurrentActive = activeQuestionId === q.id

              return (
                <div
                  key={q.id}
                  style={{
                    background: isCurrentActive ? 'rgba(123,47,255,0.06)' : '#14141F',
                    border: isCurrentActive ? '1px solid rgba(123,47,255,0.3)' : '1px solid #2D2D42',
                    borderRadius: '10px', padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#A066FF', fontWeight: 700, textTransform: 'uppercase' }}>
                        {q.number} • {q.title}
                      </span>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#D1D5DB', lineHeight: 1.4 }}>
                        {q.prompt}
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveQuestionId(q.id)}
                      style={{
                        background: isCurrentActive ? '#7B2FFF' : '#1F1F2E',
                        border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600,
                        padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {isCurrentActive ? 'Playing' : 'View Video'}
                    </button>
                  </div>

                  {/* Score 1-5 Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1F1F2E', paddingTop: '0.625rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>Score:</span>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {[1, 2, 3, 4, 5].map((val) => {
                        const selected = currentScore === val
                        return (
                          <button
                            key={val}
                            onClick={() => handleScoreChange(q.id, val)}
                            style={{
                              width: '32px', height: '30px',
                              background: selected ? '#7B2FFF' : '#0D0D14',
                              border: selected ? '1px solid #9747FF' : '1px solid #2D2D42',
                              color: selected ? '#fff' : '#9CA3AF',
                              fontWeight: 700, fontSize: '0.8125rem',
                              borderRadius: '6px', cursor: 'pointer',
                              transition: 'all 0.1s',
                            }}
                          >
                            {val}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Evaluation Matrix (Green Flags vs Red Flags) */}
          <div style={{ borderTop: '1px solid #1F1F2E', paddingTop: '1.5rem', marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#F4F4FF' }}>
              Evaluation Areas (Flags &amp; Competencies)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                {
                  id: 'b2b_communication',
                  area: 'B2B Communication',
                  green: 'Professional, consultative, listens well, clear pitch.',
                  red: 'Overly robotic script, talks over client, strictly retail cashier focus.',
                },
                {
                  id: 'outreach_drive',
                  area: 'Outreach Drive',
                  green: 'Proactive, comfortable walking in / calling, resilient.',
                  red: 'Expects leads provided, timid, easily discouraged by "No".',
                },
                {
                  id: 'tech_clarity',
                  area: 'Tech & Value Clarity',
                  green: 'Articulates custom design ROI; comfortable with links.',
                  red: 'Unable to navigate basic portal/links; overpromises tech.',
                },
              ].map((item) => {
                const currentFlag = matrix[item.id]

                return (
                  <div key={item.id} style={{ background: '#14141F', border: '1px solid #2D2D42', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.875rem', color: '#F4F4FF' }}>{item.area}</strong>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleMatrixChange(item.id, 'green')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            background: currentFlag === 'green' ? '#10B981' : '#1F1F2E',
                            border: currentFlag === 'green' ? '1px solid #34D399' : '1px solid #2D2D42',
                            color: currentFlag === 'green' ? '#fff' : '#9CA3AF',
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer',
                          }}
                        >
                          <Check size={12} /> Positive (Green)
                        </button>
                        <button
                          onClick={() => handleMatrixChange(item.id, 'red')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            background: currentFlag === 'red' ? '#EF4444' : '#1F1F2E',
                            border: currentFlag === 'red' ? '1px solid #F87171' : '1px solid #2D2D42',
                            color: currentFlag === 'red' ? '#fff' : '#9CA3AF',
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer',
                          }}
                        >
                          <X size={12} /> Concern (Red)
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
                      <div style={{ color: '#10B981', background: 'rgba(16,185,129,0.06)', padding: '0.5rem', borderRadius: '6px' }}>
                        <strong>Green:</strong> {item.green}
                      </div>
                      <div style={{ color: '#EF4444', background: 'rgba(239,68,68,0.06)', padding: '0.5rem', borderRadius: '6px' }}>
                        <strong>Red:</strong> {item.red}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Final Recommendation & Next Steps */}
          <div style={{ borderTop: '1px solid #1F1F2E', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#F4F4FF' }}>
              Final Recommendation &amp; Next Steps
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[
                { id: 'strong_hire', label: 'Strong Hire / Onboard', color: '#10B981' },
                { id: 'hire_with_training', label: 'Hire with Training', color: '#3B82F6' },
                { id: 'keep_on_file', label: 'Keep on File', color: '#9CA3AF' },
                { id: 'do_not_proceed', label: 'Do Not Proceed', color: '#EF4444' },
              ].map((rec) => {
                const selected = recommendation === rec.id

                return (
                  <button
                    key={rec.id}
                    onClick={() => setRecommendation(rec.id)}
                    style={{
                      background: selected ? `${rec.color}22` : '#14141F',
                      border: selected ? `1px solid ${rec.color}` : '1px solid #2D2D42',
                      color: selected ? rec.color : '#9CA3AF',
                      fontWeight: selected ? 700 : 500,
                      fontSize: '0.75rem', padding: '0.625rem 0.5rem', borderRadius: '8px',
                      cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    {rec.label}
                  </button>
                )
              })}
            </div>

            {/* Admin Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '0.375rem' }}>
                Admin Notes &amp; Observations
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal candidate notes, roleplay feedback, or training priorities..."
                style={{ width: '100%', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Bottom Save Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveScorecard}
              disabled={isSaving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #7B2FFF, #9747FF)',
                color: '#fff', fontSize: '0.9375rem', fontWeight: 700,
                padding: '0.75rem 2rem', borderRadius: '8px',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(123,47,255,0.4)',
              }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Scorecard &amp; Decision
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
