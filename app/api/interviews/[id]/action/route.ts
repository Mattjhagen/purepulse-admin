import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/require-admin'
import { getResend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

async function sendEmailSafely(options: {
  to: string
  subject: string
  html: string
}) {
  const resend = getResend()
  const fromAddresses = [
    'Matty at PurePulse <matty@purepulse.one>',
    'PurePulse <team@cmameet.site>',
    'PurePulse Hiring <hiring@login.purepulse.one>',
    'PurePulse <onboarding@resend.dev>',
  ]

  for (const from of fromAddresses) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })
      if (!error && data) {
        return { success: true, data }
      }
      console.warn(`[sendEmailSafely] from ${from} error:`, error?.message)
    } catch (err: unknown) {
      console.warn(`[sendEmailSafely] exception with ${from}:`, err instanceof Error ? err.message : String(err))
    }
  }
  return { success: false }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { action, interview_date, location_or_link, notes, send_email = true } = body

  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
  const supabase = hasServiceRole ? adminSupabase() : await createServerSupabaseClient()

  // 1. Fetch candidate interview record
  let { data: interview } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()

  if (!interview) {
    const fb = hasServiceRole ? await createServerSupabaseClient() : adminSupabase()
    const { data: fbInterview } = await fb
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single()
    interview = fbInterview
  }

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const candidateName = interview.candidate_name.trim()
  const candidateEmail = interview.candidate_email.trim().toLowerCase()
  const jobTitle = interview.job_title || 'Affiliate Sales Partner'

  const updatePayload: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
  }

  if (action === 'schedule_interview') {
    updatePayload.status = 'interview_scheduled'
    updatePayload.scheduled_interview_at = interview_date || new Date().toISOString()
    updatePayload.scheduled_interview_location = location_or_link || 'PurePulse Office / Virtual Meeting'
    updatePayload.scheduled_interview_notes = notes || null
    if (notes) {
      updatePayload.admin_notes = `${interview.admin_notes || ''}\n[${new Date().toLocaleDateString()}] Scheduled In-Person / Follow-Up Interview: ${interview_date} at ${location_or_link}.`.trim()
    }

    if (send_email) {
      const formattedDate = interview_date ? new Date(interview_date).toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) : 'To be coordinated'

      await sendEmailSafely({
        to: candidateEmail,
        subject: `📅 Invitation to In-Person / Next-Step Interview with PurePulse`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
            <div style="background:#07070D;padding:24px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#F4F4FF;letter-spacing:-0.03em;">Pure<span style="color:#A066FF;">Pulse</span></span>
              <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.1em;">Hiring &amp; Partner Team</p>
            </div>
            <div style="padding:32px;">
              <h2 style="font-size:20px;font-weight:800;margin:0 0 12px;color:#111827;">Next Step Interview Invitation, ${candidateName}!</h2>
              <p style="color:#4B5563;line-height:1.6;font-size:15px;margin:0 0 20px;">
                Thank you for completing your video pre-screen for the <strong>${jobTitle}</strong> position. We were impressed with your responses and would like to invite you to the next-step interview.
              </p>
              <div style="background:#F3F4F6;border-radius:8px;padding:20px;margin-bottom:20px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;">Interview Details</p>
                <div style="font-size:14px;color:#1F2937;line-height:1.7;">
                  <div><strong>Date &amp; Time:</strong> ${formattedDate}</div>
                  <div><strong>Location / Meeting Link:</strong> ${location_or_link || 'PurePulse Office / Google Meet link will follow'}</div>
                  ${notes ? `<div><strong>Notes:</strong> ${notes}</div>` : ''}
                </div>
              </div>
              <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
                Please reply directly to this email to confirm your availability or if you need to reschedule.
              </p>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 16px;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">
                Best regards,<br>
                <strong>Matty at PurePulse</strong><br>
                matty@purepulse.one
              </p>
            </div>
          </div>
        `,
      })
    }
  } else if (action === 'hold' || action === 'keep_on_file') {
    updatePayload.status = 'keep_on_file'
    updatePayload.recommendation = 'keep_on_file'
    if (notes) {
      updatePayload.admin_notes = `${interview.admin_notes || ''}\n[${new Date().toLocaleDateString()}] Kept on file: ${notes}`.trim()
    }

    if (send_email) {
      await sendEmailSafely({
        to: candidateEmail,
        subject: `Update on your PurePulse Application (${jobTitle})`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
            <span style="font-size:20px;font-weight:800;color:#111;">Pure<span style="color:#7B2FFF;">Pulse</span></span>
            <h2 style="font-size:18px;font-weight:700;margin:16px 0 12px;">Hi ${candidateName},</h2>
            <p style="color:#4B5563;line-height:1.6;font-size:14px;margin:0 0 16px;">
              Thank you for taking the time to complete your video pre-screen for the <strong>${jobTitle}</strong> position.
            </p>
            <p style="color:#4B5563;line-height:1.6;font-size:14px;margin:0 0 16px;">
              We have saved your interview and application in our priority talent pool. As new partner tiers and outreach slots open in your area, our hiring team will reach out directly.
            </p>
            <p style="color:#6B7280;font-size:13px;margin:24px 0 0;">
              Best regards,<br>
              PurePulse Hiring Team
            </p>
          </div>
        `,
      })
    }
  } else if (action === 'decline' || action === 'reject') {
    updatePayload.status = 'rejected'
    updatePayload.recommendation = 'do_not_proceed'
    if (notes) {
      updatePayload.admin_notes = `${interview.admin_notes || ''}\n[${new Date().toLocaleDateString()}] Application declined: ${notes}`.trim()
    }

    if (send_email) {
      await sendEmailSafely({
        to: candidateEmail,
        subject: `Your PurePulse Application (${jobTitle})`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
            <span style="font-size:20px;font-weight:800;color:#111;">Pure<span style="color:#7B2FFF;">Pulse</span></span>
            <h2 style="font-size:18px;font-weight:700;margin:16px 0 12px;">Hi ${candidateName},</h2>
            <p style="color:#4B5563;line-height:1.6;font-size:14px;margin:0 0 16px;">
              Thank you for your interest in PurePulse and for completing the video pre-screen for the <strong>${jobTitle}</strong> position.
            </p>
            <p style="color:#4B5563;line-height:1.6;font-size:14px;margin:0 0 16px;">
              While we were impressed by your background, we have decided to move forward with other candidates whose experience more closely matches our immediate outreach targets at this time.
            </p>
            <p style="color:#4B5563;line-height:1.6;font-size:14px;margin:0 0 16px;">
              We wish you all the best in your career pursuits.
            </p>
            <p style="color:#6B7280;font-size:13px;margin:24px 0 0;">
              Best regards,<br>
              PurePulse Hiring Team
            </p>
          </div>
        `,
      })
    }
  }

  const { data: updatedInterview, error: updateErr } = await supabase
    .from('interviews')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    interview: updatedInterview,
    message: `Candidate action "${action}" completed successfully.`,
  })
}
