import { getResend } from '@/lib/resend'

export async function sendPortalInviteEmail(params: { email: string; name?: string; url: string }) {
  const resend = getResend()
  return resend.emails.send({
    from: 'Matty at PurePulse <matty@purepulse.one>',
    to: params.email,
    subject: `Set up your PurePulse client portal`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#07070D;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
          <span style="font-size:20px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
        </div>
        <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="color:#555;line-height:1.7;margin:0 0 24px">
            ${params.name ? `Hi ${params.name},` : 'Hi,'} click below to set up your PurePulse client portal —
            track project progress, message us, view invoices, and submit support tickets, all in one place.
          </p>
          <a href="${params.url}" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
            Open Your Portal →
          </a>
          <p style="color:#999;font-size:12px;margin:24px 0 0">This link works for one sign-in. Questions? Just reply to this email.</p>
        </div>
      </div>
    `,
  })
}
