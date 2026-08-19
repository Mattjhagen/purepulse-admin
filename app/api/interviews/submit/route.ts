import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend } from '@/lib/resend'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      candidate_name,
      candidate_email,
      candidate_phone,
      job_title = 'Affiliate Sales Partner',
      video_urls = {},
      text_answers = {},
      roleplay_video_url,
    } = body

    if (!candidate_name?.trim() || !candidate_email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    const { data: interview, error } = await supabase
      .from('interviews')
      .insert({
        candidate_name: candidate_name.trim(),
        candidate_email: candidate_email.trim().toLowerCase(),
        candidate_phone: candidate_phone?.trim() || null,
        job_title,
        status: 'submitted',
        video_urls,
        text_answers,
        roleplay_video_url: roleplay_video_url || video_urls.roleplay || null,
        ip,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[interviews/submit] Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
    const reviewUrl = `${appUrl}/interviews/${interview.id}`
    const questionCount = Object.keys(video_urls).length

    // Send admin alert email (non-blocking)
    try {
      const resend = getResend()
      await resend.emails.send({
        from: 'PurePulse Hiring <hiring@login.purepulse.one>',
        to: 'matty@purepulse.one',
        subject: `🎥 New Video Interview: ${candidate_name.trim()} (${job_title})`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;border:1px solid #262626;overflow:hidden;">
            <div style="background:linear-gradient(135deg, #7B2FFF22, #00F5FF11);padding:24px;border-bottom:1px solid #262626;">
              <span style="font-size:18px;font-weight:800;letter-spacing:-0.03em;">Pure<span style="color:#A066FF;">Pulse</span> Hiring</span>
              <h2 style="margin:12px 0 4px;font-size:20px;font-weight:700;">New Candidate Video Interview Submitted</h2>
              <p style="margin:0;color:#a3a3a3;font-size:14px;">A new applicant has completed the automated asynchronous interview.</p>
            </div>
            <div style="padding:24px;">
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 0;color:#737373;font-size:13px;">Candidate:</td>
                  <td style="padding:8px 0;color:#fff;font-weight:600;font-size:14px;">${candidate_name.trim()}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#737373;font-size:13px;">Email:</td>
                  <td style="padding:8px 0;color:#A066FF;font-size:14px;">${candidate_email.trim()}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#737373;font-size:13px;">Phone:</td>
                  <td style="padding:8px 0;color:#fff;font-size:14px;">${candidate_phone?.trim() || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#737373;font-size:13px;">Role:</td>
                  <td style="padding:8px 0;color:#fff;font-size:14px;">${job_title}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#737373;font-size:13px;">Recorded Responses:</td>
                  <td style="padding:8px 0;color:#00F5FF;font-weight:700;font-size:14px;">${questionCount} Questions + Roleplay</td>
                </tr>
              </table>

              <a href="${reviewUrl}" style="display:inline-block;background:#7B2FFF;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Review Video &amp; Score Candidate →
              </a>
            </div>
          </div>
        `,
      })
    } catch (emailErr) {
      console.warn('[interviews/submit] Admin email notification error:', emailErr)
    }

    // Send candidate confirmation email
    try {
      const resend = getResend()
      await resend.emails.send({
        from: 'PurePulse Hiring <hiring@login.purepulse.one>',
        to: candidate_email.trim(),
        subject: `We've received your PurePulse Video Interview!`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
            <div style="margin-bottom:20px;">
              <span style="font-size:20px;font-weight:800;">Pure<span style="color:#7B2FFF;">Pulse</span></span>
            </div>
            <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">Thank you for completing your virtual interview, ${candidate_name.trim()}!</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 16px;">
              Your video responses and roleplay pitch for the <strong>${job_title}</strong> position have been received by our hiring team.
            </p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">What happens next</p>
              <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.7;">
                <li>Our team will review your responses and evaluation scorecard within 24–48 hours.</li>
                <li>If selected, you'll receive an official invitation with your partner onboarding link and portal access.</li>
              </ul>
            </div>
            <p style="color:#888;font-size:13px;">If you have any questions, feel free to reply directly to this email.</p>
          </div>
        `,
      })
    } catch (candEmailErr) {
      console.warn('[interviews/submit] Candidate confirmation email error:', candEmailErr)
    }

    return NextResponse.json({
      ok: true,
      interview_id: interview.id,
      message: 'Interview submitted successfully',
    })
  } catch (err) {
    console.error('[interviews/submit] Handler exception:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
