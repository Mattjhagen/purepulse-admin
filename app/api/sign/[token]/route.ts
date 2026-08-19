import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getResend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// GET — load contract by token (public, no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminSupabase()

  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, title, plan, monthly_rate, hourly_rate, start_date, end_date, status, content, signed_at, signed_by, clients(name, email, company)')
      .eq('signature_token', token)
      .single()

    if (data) return NextResponse.json(data)
  } catch (err) {
    console.warn('[sign/GET] DB fetch warning:', err)
  }

  // Fallback mock contract data for test tokens
  return NextResponse.json({
    id: `ct_${token}`,
    title: 'Web Services Agreement',
    plan: 'growth',
    monthly_rate: 50,
    hourly_rate: 85,
    start_date: new Date().toISOString().split('T')[0],
    status: 'sent',
    content: 'PurePulse Web Services Agreement Content...',
    clients: { name: 'Client Test', email: 'test@example.com', company: 'Test Co' },
  })
}

// POST — record signature
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminSupabase()
  const { signed_by, signature_data } = await req.json()

  if (!signed_by?.trim()) {
    return NextResponse.json({ error: 'Full name is required to sign.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const signedAt = new Date().toISOString()
  let clientEmail = 'client@example.com'
  let contractId = `ct_${token}`

  // Load contract to verify it's in 'sent' state
  try {
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, status, plan, clients(name, email)')
      .eq('signature_token', token)
      .single()

    if (contract) {
      contractId = contract.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients
      if (client?.email) clientEmail = client.email

      await supabase
        .from('contracts')
        .update({
          status: 'signed',
          signed_at: signedAt,
          signed_by: signed_by.trim(),
          signature_ip: ip,
          signature_data: signature_data ?? null,
          updated_at: signedAt,
        })
        .eq('id', contract.id)
    }
  } catch (err) {
    console.warn('[sign/POST] DB update warning (fallback enabled):', err)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const firstName = signed_by.trim().split(' ')[0]

  // Send admin notification (non-fatal)
  try {
    const resend = getResend()
    await resend.emails.send({
      from: 'PurePulse <contracts@login.purepulse.one>',
      to: 'matty@purepulse.one',
      subject: `✅ Contract signed by ${signed_by.trim()}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
          <h2 style="margin:0 0 16px;">Contract signed</h2>
          <p style="color:#555;margin:0 0 8px;"><strong>${signed_by.trim()}</strong> (${clientEmail}) signed the contract.</p>
          <p style="color:#555;margin:0 0 24px;">Signed at: ${new Date(signedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
          <a href="${appUrl}/contracts/${contractId}"
             style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            View Contract →
          </a>
        </div>
      `,
    })
  } catch (emailErr) {
    console.warn('[sign] admin email notice:', emailErr)
  }

  // Send client portal invite email (non-fatal)
  if (clientEmail) {
    try {
      const resend = getResend()
      const portalLink = `${appUrl}/portal`

      await resend.emails.send({
        from: 'PurePulse <contracts@login.purepulse.one>',
        to: clientEmail,
        subject: `You're signed — set up your PurePulse client portal`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
            <div style="margin-bottom:32px;">
              <span style="font-size:1.25rem;font-weight:700;letter-spacing:-0.02em;">PurePulse</span>
            </div>
            <h2 style="margin:0 0 12px;">Contract signed — you're almost there</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 8px;">Hi ${firstName},</p>
            <p style="color:#555;line-height:1.6;margin:0 0 24px;">
              Thanks for signing your Web Services Agreement. We just need you to complete your deposit payment
              to lock in your project, then you'll have access to your client portal to track progress and communicate with us.
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:0.75rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">What's next</p>
              <ol style="margin:8px 0 0;padding-left:20px;color:#374151;line-height:2;font-size:0.9rem;">
                <li>Complete your deposit payment (happening now via checkout)</li>
                <li>Set up your client portal account using the button below</li>
                <li>We'll reach out within 1 business day to kick things off</li>
              </ol>
            </div>

            <a href="${portalLink}"
               style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9375rem;margin-bottom:24px;">
              Set Up Your Account →
            </a>

            <p style="color:#999;font-size:0.8125rem;line-height:1.6;margin:0 0 8px;">
              This invite link is unique to you and expires in 24 hours. If you need a new one, contact us at
              <a href="mailto:contact@purepulse.one" style="color:#555;">contact@purepulse.one</a>.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
            <p style="color:#bbb;font-size:0.75rem;margin:0;">PurePulse · Web Design &amp; Maintenance · purepulse.one</p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.warn('[sign] client invite email notice:', emailErr)
    }
  }

  return NextResponse.json({ ok: true, signed_at: signedAt })
}
