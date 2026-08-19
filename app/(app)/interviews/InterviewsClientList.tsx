'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Video,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Copy,
  Sparkles,
  UserCheck,
  FileText,
  Mail,
} from 'lucide-react'

interface InterviewItem {
  id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string | null
  job_title: string
  status: string
  overall_score?: number
  scores?: Record<string, number | null>
  recommendation?: string | null
  video_urls?: Record<string, string>
  created_at: string
  reviewed_at?: string | null
}

export default function InterviewsClientList({
  initialInterviews,
  publicInterviewUrl,
}: {
  initialInterviews: InterviewItem[]
  publicInterviewUrl: string
}) {
  const [interviews] = useState<InterviewItem[]>(initialInterviews)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'strong_hire' | 'hire_with_training' | 'keep_on_file' | 'rejected'>('all')
  const [showIndeedModal, setShowIndeedModal] = useState(false)
  const [copiedIndeed, setCopiedIndeed] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const indeedTemplateText = `Hi {CANDIDATE_FIRST_NAME},

Thanks for applying to our {JOB_TITLE} position at {COMPANY_NAME}! We are excited about your background and would love to invite you to the next step of our hiring process.

To help us learn more about your outreach approach and communication style, please complete our quick virtual video interview. 

Before starting, you'll watch a 2-minute overview of the role, commission structure, and partner toolkit, followed by guided interview questions and a short roleplay:

👉 Virtual Video Interview Link:
https://login.purepulse.one/interview?name={CANDIDATE_FIRST_NAME}

You can complete this on any smartphone, laptop, or tablet with a camera. Once submitted, our hiring team will review your responses within 24-48 hours.

Best regards,
Hiring Team at {COMPANY_NAME}
hiring@purepulse.one`

  const filtered = interviews.filter((item) => {
    const matchSearch =
      item.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      item.candidate_email.toLowerCase().includes(search.toLowerCase()) ||
      (item.candidate_phone && item.candidate_phone.includes(search))

    if (!matchSearch) return false

    if (activeTab === 'all') return true
    if (activeTab === 'submitted') return item.status === 'submitted' || item.status === 'under_review'
    if (activeTab === 'strong_hire') return item.status === 'strong_hire' || item.recommendation === 'strong_hire'
    if (activeTab === 'hire_with_training') return item.status === 'hire_with_training' || item.recommendation === 'hire_with_training'
    if (activeTab === 'keep_on_file') return item.status === 'keep_on_file' || item.recommendation === 'keep_on_file'
    if (activeTab === 'rejected') return item.status === 'rejected' || item.recommendation === 'do_not_proceed'
    return true
  })

  return (
    <div>
      {/* Search & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name, email, or phone..."
            style={{ width: '100%', background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '8px', padding: '0.625rem 1rem 0.625rem 2.25rem', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(publicInterviewUrl)
              setCopiedLink(true)
              setTimeout(() => setCopiedLink(false), 2000)
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: '#14141F', border: '1px solid #2D2D42',
              color: '#D1D5DB', fontSize: '0.8125rem', fontWeight: 600,
              padding: '0.625rem 1rem', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            {copiedLink ? <CheckCircle2 size={14} color="#10B981" /> : <Copy size={14} />}
            {copiedLink ? 'Copied Link!' : 'Copy Public Link'}
          </button>

          <button
            onClick={() => setShowIndeedModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #7B2FFF, #9747FF)',
              color: '#fff', fontSize: '0.8125rem', fontWeight: 700,
              padding: '0.625rem 1.25rem', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(123,47,255,0.3)',
            }}
          >
            <Mail size={14} /> Indeed Automation Template
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1F1F2E', paddingBottom: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          { id: 'all', label: `All Candidates (${interviews.length})` },
          { id: 'submitted', label: `Needs Review (${interviews.filter((i) => i.status === 'submitted' || i.status === 'under_review').length})` },
          { id: 'strong_hire', label: `Strong Hire (${interviews.filter((i) => i.status === 'strong_hire' || i.recommendation === 'strong_hire').length})` },
          { id: 'hire_with_training', label: `Hire w/ Training (${interviews.filter((i) => i.status === 'hire_with_training' || i.recommendation === 'hire_with_training').length})` },
          { id: 'keep_on_file', label: `Keep on File (${interviews.filter((i) => i.status === 'keep_on_file' || i.recommendation === 'keep_on_file').length})` },
          { id: 'rejected', label: `Do Not Proceed (${interviews.filter((i) => i.status === 'rejected' || i.recommendation === 'do_not_proceed').length})` },
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                background: active ? 'rgba(123,47,255,0.15)' : 'transparent',
                border: active ? '1px solid rgba(123,47,255,0.35)' : '1px solid transparent',
                color: active ? '#A066FF' : '#9CA3AF',
                fontWeight: active ? 700 : 500,
                fontSize: '0.8125rem', padding: '0.4rem 0.875rem', borderRadius: '6px',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Candidate Interviews List Table */}
      {filtered.length === 0 ? (
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <Video size={36} color="#6B7280" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#F4F4FF' }}>No Candidate Interviews Found</h3>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            {search ? 'No interviews match your search criteria.' : 'Invite candidates from your Indeed job post using the automation template below.'}
          </p>
          <button
            onClick={() => setShowIndeedModal(true)}
            style={{
              background: '#7B2FFF', color: '#fff', fontSize: '0.875rem', fontWeight: 600,
              padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            }}
          >
            Get Indeed Automated Invite Message
          </button>
        </div>
      ) : (
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1F1F2E', color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.875rem 1.25rem' }}>Candidate</th>
                <th style={{ padding: '0.875rem 1rem' }}>Role / Date</th>
                <th style={{ padding: '0.875rem 1rem' }}>Videos</th>
                <th style={{ padding: '0.875rem 1rem' }}>Score</th>
                <th style={{ padding: '0.875rem 1rem' }}>Recommendation</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const recordedCount = Object.keys(item.video_urls || {}).length
                const score = item.overall_score || 0

                let badgeColor = '#F59E0B'
                let badgeBg = 'rgba(245,158,11,0.12)'
                let badgeText = 'Needs Review'

                if (item.recommendation === 'strong_hire' || item.status === 'strong_hire') {
                  badgeColor = '#10B981'
                  badgeBg = 'rgba(16,185,129,0.12)'
                  badgeText = 'Strong Hire'
                } else if (item.recommendation === 'hire_with_training' || item.status === 'hire_with_training') {
                  badgeColor = '#3B82F6'
                  badgeBg = 'rgba(59,130,246,0.12)'
                  badgeText = 'Hire w/ Training'
                } else if (item.recommendation === 'keep_on_file' || item.status === 'keep_on_file') {
                  badgeColor = '#9CA3AF'
                  badgeBg = 'rgba(156,163,175,0.12)'
                  badgeText = 'Keep on File'
                } else if (item.recommendation === 'do_not_proceed' || item.status === 'rejected') {
                  badgeColor = '#EF4444'
                  badgeBg = 'rgba(239,68,68,0.12)'
                  badgeText = 'Do Not Proceed'
                }

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #1F1F2E', transition: 'background 0.12s' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#F4F4FF' }}>
                        {item.candidate_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#A066FF', marginTop: '0.125rem' }}>
                        {item.candidate_email}
                      </div>
                      {item.candidate_phone && (
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                          {item.candidate_phone}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontSize: '0.8125rem', color: '#D1D5DB' }}>{item.job_title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.125rem' }}>
                        {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: '#00F5FF', background: 'rgba(0,245,255,0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        <Video size={12} /> {recordedCount}/9 Recorded
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      {score > 0 ? (
                        <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: score >= 35 ? '#10B981' : score >= 25 ? '#F59E0B' : '#EF4444' }}>
                          {score} <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 400 }}>/ 45</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Unscored</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: badgeColor, background: badgeBg, padding: '0.25rem 0.65rem', borderRadius: '100px' }}>
                        {badgeText}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <Link
                        href={`/interviews/${item.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          background: 'rgba(123,47,255,0.15)', border: '1px solid rgba(123,47,255,0.3)',
                          color: '#A066FF', fontSize: '0.8125rem', fontWeight: 700,
                          padding: '0.45rem 0.875rem', borderRadius: '6px', textDecoration: 'none',
                        }}
                      >
                        Review Scorecard <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Indeed Automation Modal */}
      {showIndeedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100 }}>
          <div style={{ background: '#0D0D14', border: '1px solid #2D2D42', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '2rem', boxShadow: '0 24px 48px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A066FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Indeed Employer Automation
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.25rem 0 0', color: '#F4F4FF' }}>
                  Message New Candidates Template
                </h2>
              </div>
              <button
                onClick={() => setShowIndeedModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#9CA3AF', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Paste this template directly into your Indeed Employer Dashboard under <strong>Automations &gt; Message new candidates</strong> (as configured in your screenshot). It automatically inserts the candidate&apos;s name and directs them to the video interview:
            </p>

            <div style={{ position: 'relative', background: '#14141F', border: '1px solid #2D2D42', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <pre style={{ margin: 0, color: '#D1D5DB', fontSize: '0.8125rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {indeedTemplateText}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowIndeedModal(false)}
                style={{ background: 'transparent', border: '1px solid #2D2D42', color: '#9CA3AF', padding: '0.625rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Close
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(indeedTemplateText)
                  setCopiedIndeed(true)
                  setTimeout(() => setCopiedIndeed(false), 2000)
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: copiedIndeed ? '#10B981' : 'linear-gradient(135deg, #7B2FFF, #9747FF)',
                  color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  padding: '0.625rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                }}
              >
                {copiedIndeed ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copiedIndeed ? 'Copied to Clipboard!' : 'Copy Indeed Message Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
