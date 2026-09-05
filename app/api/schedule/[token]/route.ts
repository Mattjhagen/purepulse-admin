import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { adminSupabase } from '@/lib/supabase'
import { getResend } from '@/lib/resend'
import { INTERVIEW_TIMEZONE, createGoogleInterviewEvent, generateCentralInterviewSlots, getGoogleBusySlots } from '@/lib/google-calendar'

type Candidate = {
  id: string
  affiliate_id?: string | null
  candidate_name: string
  candidate_email: string
  candidate_phone?: string | null
  job_title?: string | null
  scheduled_at?: string | null
}

async function resolveCandidate(token: string): Promise<Candidate | null> {
  const supabase = adminSupabase()
  const { data: directInterview } = await supabase.from('interviews').select('*').eq('schedule_token', token).maybeSingle()
  if (directInterview) return directInterview as Candidate

  const { data: affiliate } = await supabase.from('affiliates').select('id, name, email, phone').eq('interview_token', token).maybeSingle()
  if (!affiliate) return null
  const { data: interview } = await supabase.from('interviews').select('*').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (interview) return interview as Candidate
  return {
    id: '',
    affiliate_id: affiliate.id,
    candidate_name: affiliate.name,
    candidate_email: affiliate.email,
    candidate_phone: affiliate.phone,
    job_title: 'Affiliate Sales Partner',
  }
}

function validateTargetDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const day = fromZonedTime(`${value} 12:00:00`, INTERVIEW_TIMEZONE)
  const now = new Date()
  return day.getTime() >= now.getTime() - 12 * 60 * 60 * 1000 && day.getTime() <= now.getTime() + 90 * 24 * 60 * 60 * 1000
}

async function availabilityForDate(targetDate: string) {
  const dayStart = fromZonedTime(`${targetDate} 00:00:00`, INTERVIEW_TIMEZONE)
  const dayEnd = fromZonedTime(`${targetDate} 23:59:59`, INTERVIEW_TIMEZONE)
  const busy = await getGoogleBusySlots(dayStart.toISOString(), dayEnd.toISOString())
  return generateCentralInterviewSlots(targetDate, busy)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const targetDate = req.nextUrl.searchParams.get('date') || formatInTimeZone(new Date(), INTERVIEW_TIMEZONE, 'yyyy-MM-dd')
    if (!validateTargetDate(targetDate)) return NextResponse.json({ error: 'Choose a weekday within the next 90 days.' }, { status: 400 })
    const candidate = await resolveCandidate(token)
    if (!candidate) return NextResponse.json({ error: 'Scheduling link is invalid or has expired.' }, { status: 404 })
    if (candidate.scheduled_at) return NextResponse.json({ error: 'This interview has already been scheduled.' }, { status: 409 })

    const slots = await availabilityForDate(targetDate)
    return NextResponse.json({
      candidate: { id: candidate.id, name: candidate.candidate_name, email: candidate.candidate_email, job_title: candidate.job_title || 'Affiliate Sales Partner' },
      date: targetDate,
      slots,
    })
  } catch (error) {
    console.error('[schedule/token] availability error:', error)
    const message = error instanceof Error && error.message === 'Google Calendar is not connected'
      ? 'Interview scheduling is temporarily unavailable. Please contact PurePulse.'
      : 'We could not load calendar availability. Please try again.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { startISO, endISO } = await req.json()
    const requestedStart = new Date(startISO)
    const requestedEnd = new Date(endISO)
    if (!startISO || !endISO || Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedEnd.getTime())) {
      return NextResponse.json({ error: 'Choose a valid interview time.' }, { status: 400 })
    }
    if (requestedEnd.getTime() - requestedStart.getTime() !== 30 * 60 * 1000 || requestedStart <= new Date()) {
      return NextResponse.json({ error: 'Interview appointments must be an available future 30-minute slot.' }, { status: 400 })
    }

    let candidate = await resolveCandidate(token)
    if (!candidate) return NextResponse.json({ error: 'Scheduling link is invalid or has expired.' }, { status: 404 })
    if (candidate.scheduled_at) return NextResponse.json({ error: 'This interview has already been scheduled.' }, { status: 409 })

    const targetDate = formatInTimeZone(requestedStart, INTERVIEW_TIMEZONE, 'yyyy-MM-dd')
    if (!validateTargetDate(targetDate)) return NextResponse.json({ error: 'Choose a weekday within the next 90 days.' }, { status: 400 })
    const slots = await availabilityForDate(targetDate)
    const selected = slots.find(slot => slot.available && slot.startISO === requestedStart.toISOString() && slot.endISO === requestedEnd.toISOString())
    if (!selected) return NextResponse.json({ error: 'That time is no longer available. Please select another slot.' }, { status: 409 })

    const supabase = adminSupabase()
    if (!candidate.id) {
      const interviewId = crypto.randomUUID()
      const { data, error } = await supabase.from('interviews').insert({
        id: interviewId,
        affiliate_id: candidate.affiliate_id,
        candidate_name: candidate.candidate_name,
        candidate_email: candidate.candidate_email,
        candidate_phone: candidate.candidate_phone || null,
        job_title: candidate.job_title || 'Affiliate Sales Partner',
        status: 'submitted',
        schedule_token: token,
      }).select('*').single()
      if (error || !data) throw new Error(error?.message || 'Unable to create interview record')
      candidate = data as Candidate
    }

    const event = await createGoogleInterviewEvent({
      candidateName: candidate.candidate_name,
      candidateEmail: candidate.candidate_email,
      startISO: selected.startISO,
      endISO: selected.endISO,
      interviewId: candidate.id,
    })
    const { error: updateError } = await supabase.from('interviews').update({
      status: 'scheduled_1on1', scheduled_at: selected.startISO, calendar_event_id: event.id,
      meeting_url: event.hangoutLink || null, updated_at: new Date().toISOString(),
    }).eq('id', candidate.id).is('scheduled_at', null)
    if (updateError) throw new Error(updateError.message)

    try {
      const formattedDate = formatInTimeZone(requestedStart, INTERVIEW_TIMEZONE, 'EEEE, MMMM d, yyyy')
      const displayTime = `${formatInTimeZone(requestedStart, INTERVIEW_TIMEZONE, 'h:mm a')} CT`
      await getResend().emails.send({
        from: 'PurePulse Hiring <hiring@purepulse.one>',
        to: [candidate.candidate_email, 'matty@purepulse.one'],
        subject: `Interview confirmed: ${formattedDate} at ${displayTime}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto"><h2>PurePulse interview confirmed</h2><p>Hi ${candidate.candidate_name}, your 30-minute interview is scheduled for <strong>${formattedDate} at ${displayTime}</strong>.</p>${event.hangoutLink ? `<p><a href="${event.hangoutLink}">Join the Google Meet</a></p>` : ''}<p>Google Calendar has also sent an invitation to ${candidate.candidate_email}.</p></div>`,
      })
    } catch (emailError) {
      console.warn('[schedule/token] confirmation email warning:', emailError)
    }
    return NextResponse.json({ success: true, message: 'Interview scheduled successfully.', meetingUrl: event.hangoutLink || null })
  } catch (error) {
    console.error('[schedule/token] booking error:', error)
    return NextResponse.json({ error: 'We could not schedule this interview. Please try another time.' }, { status: 500 })
  }
}
