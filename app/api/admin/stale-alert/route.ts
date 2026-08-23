import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getResend } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { issue_number, title, elapsed_minutes, details } = body

    if (!issue_number) {
      return NextResponse.json({ error: 'issue_number is required' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const resend = getResend()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one'

    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .insert({
        subject: `STUCK TASK ALERT: Issue #${issue_number} — ${title || 'Development Task'}`,
        description: `Task #${issue_number} ('${title}') has been stuck in-progress for ${elapsed_minutes || 15} minutes with no activity.\n\nDetails: ${details || 'Unblocked by WatchdogAgent. Awaiting manual review.'}`,
        priority: 'urgent',
        status: 'open',
      })
      .select('id')
      .single()

    if (ticketErr) {
      console.error('[stale-alert] Failed creating admin ticket:', ticketErr)
    }

    let emailSent = false
    try {
      await resend.emails.send({
        from: 'PurePulse Pipeline Watchdog <matty@purepulse.one>',
        to: 'matty@purepulse.one',
        subject: `STUCK PIPELINE ALERT: Issue #${issue_number} Needs Manual Review`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
            <div style="background:#ef4444;color:#fff;padding:12px 20px;border-radius:8px;font-weight:700;font-size:16px;margin-bottom:20px;">
              Pipeline Task Stuck Alert
            </div>
            <h2 style="margin:0 0 12px;color:#111;">Issue #${issue_number} Requires Manual Review</h2>
            <p style="color:#555;line-height:1.6;">Hi Matty,</p>
            <p style="color:#555;line-height:1.6;">
              The Watchdog Agent detected that <strong>Issue #${issue_number}</strong> (<em>${title || 'Development Task'}</em>) has been stuck for <strong>${elapsed_minutes || 15} minutes</strong> without activity.
            </p>
            <div style="background:#fef2f2;border:1px solid #fca5a5;padding:16px;border-radius:8px;margin:20px 0;color:#991b1b;">
              <strong>Action Taken:</strong> The Watchdog Agent unblocked the task and reset its state so the pipeline can resume. Please inspect the Admin Dashboard or GitHub repository.
            </div>
            <a href="${appUrl}/dashboard" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Open Admin Dashboard →
            </a>
          </div>
        `,
      })
      emailSent = true
    } catch (err) {
      console.error('[stale-alert] Failed sending alert email:', err)
    }

    return NextResponse.json({
      success: true,
      ticket_id: ticket?.id ?? null,
      email_sent: emailSent,
      issue_number,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
