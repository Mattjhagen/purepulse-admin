import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend } from '@/lib/resend'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = adminSupabase()

  // Load contract + client
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*, clients(*)')
    .eq('id', id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients

  if (!client?.email) {
    return NextResponse.json({ error: 'Client has no email address.' }, { status: 400 })
  }

  // Generate a signing token
  const token = crypto.randomUUID()
  const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'}/sign/${token}`

  // Save token + mark sent
  const { error: updateError } = await supabase
    .from('contracts')
    .update({ signature_token: token, status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update contract.' }, { status: 500 })
  }

  // Send email
  const resend = getResend()
  const { error: emailError } = await resend.emails.send({
    from: 'PurePulse <matty@purepulse.one>',
    to: client.email,
    subject: `Please sign your PurePulse Web Services Agreement`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:32px;">
          <span style="font-size:1.25rem;font-weight:700;letter-spacing:-0.02em;">PurePulse</span>
        </div>
        <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Your contract is ready to sign</h2>
        <p style="color:#555;line-height:1.6;margin:0 0 8px;">Hi ${client.name},</p>
        <p style="color:#555;line-height:1.6;margin:0 0 24px;">
          Your Web Services Agreement is ready for your signature. Please review the contract and sign below.
          This link is unique to you — do not share it.
        </p>
        <a href="${signingUrl}"
           style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9375rem;">
          Review &amp; Sign Contract →
        </a>
        <p style="color:#999;font-size:0.8125rem;margin:32px 0 0;line-height:1.6;">
          If you have any questions, reply to this email or contact us at
          <a href="mailto:contact@purepulse.one" style="color:#555;">contact@purepulse.one</a>.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
        <p style="color:#bbb;font-size:0.75rem;margin:0;">PurePulse · Web Design &amp; Maintenance · purepulse.one</p>
      </div>
    `,
  })

  if (emailError) {
    console.error('[contracts/send] Resend rejected contract email:', emailError)
    return NextResponse.json({ error: `Contract updated but email failed: ${emailError.message}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, signingUrl })
}
