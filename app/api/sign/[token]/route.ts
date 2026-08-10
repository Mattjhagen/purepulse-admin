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
    .select('id, status, clients(name, email)')
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

  // Notify admin (non-fatal if email fails)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients
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
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.purepulse.one'}/contracts/${contract.id}"
             style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            View Contract →
          </a>
        </div>
      `,
    })
    if (adminEmailError) {
      console.error('[sign] admin email error:', adminEmailError)
    }
  } catch (emailErr) {
    console.error('[sign] admin email threw:', emailErr)
  }

  return NextResponse.json({ ok: true, signed_at: signedAt })
}
