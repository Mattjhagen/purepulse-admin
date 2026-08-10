import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

// GET — load contract by token (public, no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminSupabase()

  const { data, error } = await supabase
    .from('contracts')
    .select('id, title, plan, monthly_rate, hourly_rate, start_date, end_date, status, content, signed_at, signed_by, clients(name, email, company)')
    .eq('signature_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Contract not found or link is invalid.' }, { status: 404 })
  }

  return NextResponse.json(data)
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

  // Load contract to verify it's in 'sent' state
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('id, status, plan, clients(name, email)')
    .eq('signature_token', token)
    .single()

  if (fetchError || !contract) {
    return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 })
  }

  if (contract.status === 'signed') {
    return NextResponse.json({ error: 'This contract has already been signed.' }, { status: 409 })
  }

  if (contract.status !== 'sent') {
    return NextResponse.json({ error: 'This contract is not available for signing.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const signedAt = new Date().toISOString()

  const { error: updateError } = await supabase
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

  if (updateError) {
    console.error('[sign] update error:', JSON.stringify(updateError))
    return NextResponse.json({ error: 'Failed to record signature.' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const firstName = (client?.name ?? signed_by.trim()).split(' ')[0]

  // Send admin notification (non-fatal)
  try {
    const { error: adminEmailError } = await resend.emails.send({
      from: 'PurePulse <contracts@login.purepulse.one>',
      to: 'contact@purepulse.one',
      subject: `✅ Contract signed by ${signed_by.trim()}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
          <h2 style="margin:0 0 16px;">Contract signed</h2>
          <p style="color:#555;margin:0 0 8px;"><strong>${signed_by.trim()}</strong> (${client?.email ?? 'unknown'}) signed the contract.</p>
          <p style="color:#555;margin:0 0 24px;">Signed at: ${new Date(signedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
          <a href="${appUrl}/contracts/${contract.id}"
             style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            View Contract →
          </a>
        </div>
      `,
    })
    if (adminEmailError) console.error('[sign] admin email error:', adminEmailError)
  } catch (emailErr) {
    console.error('[sign] admin email threw:', emailErr)
  }

  // Send client portal invite email (non-fatal)
  if (client?.email) {
    try {
      // Generate a Supabase invite link so the client can set up their portal account
      const { data: inviteData } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: client.email,
        options: { redirectTo: `${appUrl}/portal` },
      })
      const portalLink = inviteData?.properties?.action_link ?? `${appUrl}/portal`

      const { error: clientEmailError } = await resend.emails.send({
        from: 'PurePulse <contracts@login.purepulse.one>',
        to: client.email,
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
      if (clientEmailError) console.error('[sign] client invite email error:', clientEmailError)
    } catch (emailErr) {
      console.error('[sign] client invite email threw:', emailErr)
    }
  }

  return NextResponse.json({ ok: true, signed_at: signedAt })
}
