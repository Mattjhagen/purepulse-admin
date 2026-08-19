import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'
import { getResend } from '@/lib/resend'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

function generateReferralCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'PARTNER'
  const rand = Math.floor(100 + Math.random() * 900)
  return `${clean}${rand}`
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = adminSupabase()

  // 1. Fetch interview
  const { data: interview, error: fetchErr } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  const email = interview.candidate_email.trim().toLowerCase()
  const name = interview.candidate_name.trim()
  const phone = interview.candidate_phone?.trim() || null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  // 2. Check if affiliate record already exists or create new
  let referralCode = generateReferralCode(name)
  const { data: existingAffiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('email', email)
    .single()

  let affiliateId = existingAffiliate?.id

  if (!existingAffiliate) {
    const { data: newAffiliate, error: createErr } = await supabase
      .from('affiliates')
      .insert({
        name,
        email,
        phone,
        referral_code: referralCode,
        status: 'active',
        promotion_strategy: `Indeed candidate - interview score: ${interview.overall_score || 'N/A'}/45`,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createErr) {
      console.error('[interviews/onboard] Create affiliate error:', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
    affiliateId = newAffiliate.id
    referralCode = newAffiliate.referral_code
  } else {
    referralCode = existingAffiliate.referral_code
  }

  // 3. Generate Supabase Auth invite link
  let portalUrl = `${appUrl}/affiliates/dashboard`
  try {
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/affiliates/dashboard`,
      },
    })
    if (!inviteErr && inviteData?.properties?.action_link) {
      portalUrl = inviteData.properties.action_link
    }
  } catch (authErr) {
    console.warn('[interviews/onboard] generateLink warning:', authErr)
  }

  // 4. Send official onboarding acceptance email via Resend
  const referralLink = `https://purepulse.one/pricing?ref=${referralCode}`
  try {
    const resend = getResend()
    await resend.emails.send({
      from: 'Matty at PurePulse <matty@purepulse.one>',
      to: email,
      subject: `🎉 Congratulations! You're invited to the PurePulse Affiliate Team`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="background:#07070D;padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:800;color:#F4F4FF;letter-spacing:-0.03em;">Pure<span style="color:#A066FF;">Pulse</span></span>
            <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.1em;">Partner Network</p>
          </div>

          <div style="padding:32px 32px 24px;">
            <h2 style="font-size:20px;font-weight:800;margin:0 0 12px;color:#111827;">Welcome to the Team, ${name}!</h2>
            <p style="color:#4B5563;line-height:1.6;margin:0 0 20px;font-size:15px;">
              Great news! Following your video interview submission, our team has selected you to join PurePulse as an official <strong>Affiliate Sales Partner</strong>.
            </p>

            <div style="background:#F3F4F6;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Your Partner Details</p>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:14px;color:#1F2937;">
                <div><strong>Partner Code:</strong> <span style="font-family:monospace;background:#E5E7EB;padding:2px 6px;border-radius:4px;font-weight:700;color:#7B2FFF;">${referralCode}</span></div>
                <div><strong>Referral Link:</strong> <a href="${referralLink}" style="color:#7B2FFF;word-break:break-all;">${referralLink}</a></div>
                <div><strong>Monthly Commission:</strong> Up to 50% recurring MRR / client</div>
                <div><strong>Bonus Perk:</strong> Free $49/mo vibecodes.space plan with 1+ referral/mo</div>
              </div>
            </div>

            <p style="color:#4B5563;line-height:1.6;margin:0 0 24px;font-size:14px;">
              Click the button below to access your partner portal, download high-res printable flyers/business cards, create social media campaigns, and connect your bank account for payouts:
            </p>

            <div style="text-align:center;margin-bottom:28px;">
              <a href="${portalUrl}" style="display:inline-block;background:#7B2FFF;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:100px;text-decoration:none;box-shadow:0 4px 14px rgba(123,47,255,0.35);">
                Open Your Affiliate Portal →
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 16px;">
            <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.5;">
              If you have any questions or want help crafting your first outreach strategy, reply directly to this email or reach out to matty@purepulse.one.
            </p>
          </div>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('[interviews/onboard] Email sending error:', emailErr)
  }

  // 5. Update interview record
  await supabase
    .from('interviews')
    .update({
      status: 'strong_hire',
      recommendation: 'strong_hire',
      admin_notes: `${interview.admin_notes || ''}\n[${new Date().toLocaleDateString()}] Onboarded as affiliate partner with code ${referralCode}.`.trim(),
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({
    ok: true,
    affiliate_id: affiliateId,
    referral_code: referralCode,
    portal_url: portalUrl,
    message: `Candidate ${name} successfully onboarded as affiliate!`,
  })
}
