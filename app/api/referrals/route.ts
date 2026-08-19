import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend } from '@/lib/resend'
import { getStripe } from '@/lib/stripe'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string
    email?: string
    phone?: string
    code?: string
    commission_per_conversion?: string | number
    notes?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, email, phone, code, commission_per_conversion, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  const supabase = adminSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const commissionVal = typeof commission_per_conversion === 'number'
    ? commission_per_conversion
    : (parseFloat(commission_per_conversion ?? '') || 50)

  const { data, error } = await supabase
    .from('referrals')
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      code: code.trim().toUpperCase(),
      commission_per_conversion: commissionVal,
      notes: notes?.trim() || null,
    })
    .select('id, name, email, code, commission_per_conversion')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create referral.' }, { status: 500 })
  }

  // When an affiliate/referrer is created with an email, send them a welcome email
  // with their unique link, flyer generator, payout setup, and tracking details.
  let emailed = false
  if (data.email) {
    try {
      // Create Stripe Express account if Stripe is configured
      let stripeAccountId: string | null = null
      try {
        const stripe = getStripe()
        const account = await stripe.accounts.create({
          type: 'express',
          email: data.email,
          business_type: 'individual',
          capabilities: { transfers: { requested: true } },
        })
        stripeAccountId = account.id
        await supabase
          .from('referrals')
          .update({
            stripe_account_id: stripeAccountId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id)
      } catch (stripeErr) {
        console.warn('[api/referrals] Stripe account setup notice:', stripeErr)
      }

      const resend = getResend()
      const referralCode = data.code
      const referralUrl = `${appUrl}/ref/${referralCode}`
      const setupPayoutUrl = `${appUrl}/referrals/connect/${data.id}`
      const flyerUrl = `${appUrl}/referrals/${data.id}?print=1`
      const firstName = data.name.split(' ')[0]

      const { error: emailErr } = await resend.emails.send({
        from: 'Matty at PurePulse <matty@purepulse.one>',
        to: data.email,
        subject: `Your PurePulse Partner Link & Dashboard — ${referralCode}`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:#07070D;padding:28px 32px;text-align:center">
              <span style="font-size:22px;font-weight:800;color:#F4F4FF;letter-spacing:-0.03em">Pure<span style="color:#A066FF">Pulse</span></span>
              <p style="margin:4px 0 0;color:rgba(244,244,255,0.5);font-size:12px;letter-spacing:0.08em;text-transform:uppercase">Partner &amp; Referral Program</p>
            </div>
            <div style="padding:32px">
              <h2 style="margin:0 0 10px;color:#111;font-size:22px">Welcome to the team, ${firstName}! 👋</h2>
              <p style="color:#555;line-height:1.7;margin:0 0 24px;font-size:15px">
                Your unique PurePulse referral link is live. You earn <strong>$${commissionVal.toFixed(2)}</strong> for every client who signs up through your link or QR code.
              </p>

              <!-- Referral Code Box -->
              <div style="background:#08060d;border:1px solid rgba(160,102,255,0.3);border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;color:#fff">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#A066FF">Your Referral Code</p>
                <p style="margin:0 0 12px;font-size:28px;font-weight:900;letter-spacing:0.1em;font-family:monospace;color:#fff">${referralCode}</p>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.5)">Your Tracking Link</p>
                <p style="margin:0;font-size:14px;color:#00D4FF;word-break:break-all;font-weight:600">${referralUrl}</p>
              </div>

              <!-- 3 Core Tools -->
              <h3 style="margin:0 0 16px;font-size:16px;color:#111">Your Partner Toolkit:</h3>
              <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px">
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
                  <p style="margin:0 0 4px;font-weight:700;font-size:14px;color:#111">📄 1. Generate &amp; Print Full-Page Flyers</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5">
                    Print high-resolution flyers featuring your unique QR code to hang up at local businesses, bulletin boards, or events.
                  </p>
                </div>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
                  <p style="margin:0 0 4px;font-weight:700;font-size:14px;color:#111">💳 2. Add Your Payout Method</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5">
                    Connect your bank account securely with Stripe so your referral commissions are deposited directly into your account.
                  </p>
                </div>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
                  <p style="margin:0 0 4px;font-weight:700;font-size:14px;color:#111">📊 3. Track Referrals &amp; Clicks</p>
                  <p style="margin:0;font-size:13px;color:#666;line-height:1.5">
                    Every link click and new customer signup is recorded and credited to your partner account automatically.
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <div style="text-align:center;margin-bottom:24px">
                <a href="${setupPayoutUrl}" style="display:inline-block;background:#7B2FFF;color:#fff;padding:14px 30px;border-radius:100px;text-decoration:none;font-weight:700;font-size:15px;margin:0 6px 10px">
                  Set Up Payouts &amp; Dashboard →
                </a>
                <a href="${flyerUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:700;font-size:15px;margin:0 6px 10px">
                  Print Your Flyer →
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
              <p style="font-size:12px;color:#999;margin:0;line-height:1.6;text-align:center">
                Questions or need marketing advice? Reply directly to this email or write to <a href="mailto:matty@purepulse.one" style="color:#555">matty@purepulse.one</a>.<br>
                PurePulse · Web Design &amp; Maintenance · <a href="https://purepulse.one" style="color:#555">purepulse.one</a>
              </p>
            </div>
          </div>
        `,
      })

      if (!emailErr) emailed = true
      else console.error('[api/referrals] email error:', emailErr)
    } catch (emailException) {
      console.error('[api/referrals] email exception:', emailException)
    }
  }

  return NextResponse.json({ id: data.id, emailed })
}
