import { adminSupabase } from '@/lib/supabase'
import Link from 'next/link'
import { Video, Clock, CheckCircle2, AlertCircle, Sparkles, Search, ArrowUpRight, Copy, UserCheck } from 'lucide-react'
import InterviewsClientList from './InterviewsClientList'

export const dynamic = 'force-dynamic'

export default async function InterviewsPage() {
  const supabase = adminSupabase()

  const { data: interviews, error } = await supabase
    .from('interviews')
    .select('*')
    .order('created_at', { ascending: false })

  const interviewList = interviews || []

  // Metrics
  const total = interviewList.length
  const pending = interviewList.filter((i) => i.status === 'submitted' || i.status === 'under_review').length
  const strongHires = interviewList.filter((i) => i.status === 'strong_hire' || i.recommendation === 'strong_hire').length
  const trainingHires = interviewList.filter((i) => i.status === 'hire_with_training' || i.recommendation === 'hire_with_training').length

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const publicInterviewUrl = `${appUrl}/interview`

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(123,47,255,0.12)', border: '1px solid rgba(123,47,255,0.25)', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, color: '#A066FF', marginBottom: '0.5rem' }}>
            <Video size={13} /> Indeed Hiring &amp; Candidate Evaluation
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
            Candidate Video Interviews
          </h1>
          <p style={{ color: 'var(--text-muted, #9CA3AF)', fontSize: '0.875rem', margin: 0 }}>
            Review asynchronous candidate recordings, score responses against the scorecard, and 1-click onboard affiliates.
          </p>
        </div>

        {/* Quick Link Card */}
        <div style={{ background: '#14141F', border: '1px solid #2D2D42', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Candidate Interview Link</span>
            <span style={{ fontSize: '0.8125rem', color: '#A066FF', fontFamily: 'monospace', fontWeight: 600 }}>{publicInterviewUrl}</span>
          </div>
          <Link
            href="/interview"
            target="_blank"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              background: '#7B2FFF', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
              padding: '0.4rem 0.75rem', borderRadius: '6px', textDecoration: 'none',
            }}
          >
            Preview <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Metric Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Submissions</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F4F4FF', marginTop: '0.25rem' }}>{total}</div>
        </div>

        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Needs Review</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.25rem' }}>{pending}</div>
        </div>

        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strong Hires / Onboarded</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '0.25rem' }}>{strongHires}</div>
        </div>

        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hire with Training</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3B82F6', marginTop: '0.25rem' }}>{trainingHires}</div>
        </div>
      </div>

      {/* Client List Component for Filtering & Actions */}
      <InterviewsClientList initialInterviews={interviewList} publicInterviewUrl={publicInterviewUrl} />
    </div>
  )
}
