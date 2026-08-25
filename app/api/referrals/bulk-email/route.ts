import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { referral_ids = [], template_type = 'apology', custom_subject, custom_body } = await req.json()

    if (!Array.isArray(referral_ids) || referral_ids.length === 0) {
      return NextResponse.json({ error: 'No candidates selected' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const { data: candidates, error: fetchErr } = await supabase
      .from('affiliates')
      .select('id, name, email')
      .in('id', referral_ids)

    if (fetchErr || !candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'Selected candidates not found' }, { status: 404 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 })
    }
    const resend = new Resend(resendKey)

    let sentCount = 0
    const errors: string[] = []

    for (const cand of candidates) {
      if (!cand.email) continue

      let subject = custom_subject || '⚠️ Quick Update: Technical Fix & Pre-Screen Re-submission Link for PurePulse'
      let htmlBody = custom_body || `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;border:1px solid #262626;padding:32px;">
          <div style="margin-bottom:20px;">
            <span style="font-size:20px;font-weight:800;color:#fff;">Pure<span style="color:#A066FF;">Pulse</span></span>
          </div>
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">System Update &amp; Re-submission</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi ${cand.name}, apology for the technical glitch!</h1>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We noticed you attempted to complete your PurePulse video pre-screen interview recently. Due to a temporary video compression issue on our upload server, a few video responses were not fully saved to your profile.</p>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We have upgraded our video processing engine. Please visit the updated link below to submit your responses one last time so our team can review and certify your application:</p>
          <div style="margin:24px 0;text-align:center;">
            <a href="https://login.purepulse.one/interview" style="display:inline-block;background:linear-gradient(135deg, #7B2FFF, #00D4FF);color:#FFFFFF;font-weight:800;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;box-shadow:0 4px 16px rgba(123,47,255,0.4);">
              Record Pre-Screen Interview Now →
            </a>
          </div>
          <p style="margin:16px 0 0;font-size:13px;color:rgba(244,244,255,0.6);">If you have any questions, reply directly to this email and our team will assist you immediately.</p>
          <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best regards,<br><strong style="color:#FFF;">PurePulse Hiring Team</strong><br><a href="mailto:hiring@purepulse.one" style="color:#00D4FF;text-decoration:none;">hiring@purepulse.one</a></p>
        </div>
      `

      try {
        const { error: sendErr } = await resend.emails.send({
          from: 'PurePulse Hiring <hiring@purepulse.one>',
          to: cand.email,
          subject,
          html: htmlBody,
        })

        if (sendErr) {
          errors.push(`${cand.email}: ${sendErr.message}`)
        } else {
          sentCount++
        }
      } catch (err: any) {
        errors.push(`${cand.email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent_count: sentCount,
      total: candidates.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk email failed' }, { status: 500 })
  }
}
