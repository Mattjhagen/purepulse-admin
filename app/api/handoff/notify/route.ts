import { NextRequest, NextResponse } from 'next/server'
import { sendEmailSafely } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { title = 'Acme Home Services Website', pr_number = '44', stage = 'human-approval' } = await req.json()

    const sent = await sendEmailSafely({
      to: 'matty@purepulse.one',
      subject: `🚨 Server Handoff: ${title} Ready for Human Review (PR #${pr_number})`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;border:1px solid #262626;padding:32px;">
          <div style="margin-bottom:20px;"><span style="font-size:20px;font-weight:800;color:#fff;">Pure<span style="color:#A066FF;">Pulse</span> Server Handoff</span></div>
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00D4FF;">Pipeline Stage: Human Review Required</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">${title} is ready for handoff review!</h1>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">The AI Developer agent on Google Cloud VM has completed all 5 production pages and opened GitHub Pull Request #${pr_number}.</p>
          <div style="margin:24px 0;text-align:center;">
            <a href="https://tty-purepulse.relayapp.pro" style="display:inline-block;background:linear-gradient(135deg, #7B2FFF, #00D4FF);color:#FFFFFF;font-weight:800;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
              Open Command Center TTY →
            </a>
          </div>
          <p style="margin:16px 0 0;font-size:13px;color:rgba(244,244,255,0.6);">Or review directly on GitHub: <a href="https://github.com/Mattjhagen/Projects/pull/${pr_number}" style="color:#00D4FF;">Pull Request #${pr_number}</a></p>
        </div>
      `,
    })

    return NextResponse.json({ success: sent, message: 'Notification dispatched to matty@purepulse.one' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Notification failed' }, { status: 500 })
  }
}
