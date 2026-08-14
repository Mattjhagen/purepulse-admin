import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateReferralCode, calculateMonthlyCommission, AFFILIATE_COMMISSION_RATES } from '@/lib/affiliate-utils'
import { PLAN_PRICES } from '@/lib/types'

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
    notes?: string
    signature_data?: string
    signed_by?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, email, phone, notes, signature_data, signed_by } = body

  if (!name?.trim() || !email?.trim() || !signature_data || !signed_by?.trim()) {
    return NextResponse.json({ error: 'name, email, signature_data, and signed_by are required.' }, { status: 400 })
  }

  const supabase = adminSupabase()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  // Check for duplicate email
  const { data: existing } = await supabase
    .from('affiliates')
    .select('id, referral_code, status')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'An affiliate account already exists for this email address.' }, { status: 409 })
  }

  // Generate unique referral code
  let referralCode = generateReferralCode(name)
  for (let i = 0; i < 8; i++) {
    const { count } = await supabase
      .from('affiliates')
      .select('id', { count: 'exact', head: true })
      .eq('referral_code', referralCode)
    if (count === 0) break
    referralCode = generateReferralCode(name)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'

  // Create affiliate record
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      referral_code: referralCode,
      status: 'active',
      notes: notes?.trim() || null,
      terms_signed_at: new Date().toISOString(),
      terms_signature_data: signature_data,
      terms_ip: ip,
    })
    .select('id, name, email, referral_code')
    .single()

  if (affiliateError || !affiliate) {
    console.error('[affiliates/apply] insert error:', affiliateError)
    return NextResponse.json({ error: 'Failed to create affiliate account.' }, { status: 500 })
  }

  // Create Supabase auth user + magic link for dashboard access
  const dashboardUrl = `${appUrl}/affiliates/dashboard`
  let inviteLink = `${appUrl}/affiliates/login`
  try {
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: affiliate.email,
      options: {
        redirectTo: dashboardUrl,
        data: { full_name: affiliate.name, role: 'affiliate', affiliate_id: affiliate.id },
      },
    })
    if (linkData?.properties?.action_link) {
      inviteLink = linkData.properties.action_link
      // Link auth user to affiliate record
      const authUserId = linkData.user?.id
      if (authUserId) {
        await supabase
          .from('affiliates')
          .update({ auth_user_id: authUserId })
          .eq('id', affiliate.id)
      }
    }
  } catch (err) {
    console.error('[affiliates/apply] invite link error:', err)
  }

  const referralUrl = `https://purepulse.one/pricing?ref=${referralCode}`
  const firstName = affiliate.name.split(' ')[0]

  // Commission preview table for email
  const commissionRows = Object.entries(AFFILIATE_COMMISSION_RATES)
    .map(([plan, rate]) => {
      const price = PLAN_PRICES[plan as keyof typeof PLAN_PRICES]
      const commission = calculateMonthlyCommission(plan, price)
      const planLabel = { starter: 'Starter', growth: 'Growth', premium: 'Premium', business: 'Business' }[plan] ?? plan
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${planLabel}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#555">$${price}/mo</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#555">${(rate * 100).toFixed(0)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#111">$${commission.toFixed(2)}/mo</td>
      </tr>`
    })
    .join('')

  try {
    await resend.emails.send({
      from: 'Matty at PurePulse <matty@purepulse.one>',
      to: affiliate.email,
      subject: `Welcome to the PurePulse Affiliate Program — your link is ready`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:620px;margin:0 auto">
          <div style="background:#111;padding:24px 32px;border-radius:12px 12px 0 0">
            <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.03em">PurePulse</span>
            <span style="font-size:12px;color:#666;margin-left:12px">Affiliate Program</span>
          </div>
          <div style="padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="margin:0 0 8px;color:#111;font-size:22px">Welcome, ${firstName}! 🎉</h2>
            <p style="color:#555;line-height:1.7;margin:0 0 24px">
              You're officially part of the PurePulse Affiliate Program. Your account is active and your
              unique referral link is ready to share.
            </p>

            <div style="background:#f8f8f8;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1px solid #e5e7eb">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Your Referral Code</p>
              <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:0.06em;color:#111;font-family:monospace">${referralCode}</p>
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Your Referral Link</p>
              <p style="margin:0;font-size:14px;color:#7B2FFF;word-break:break-all">${referralUrl}</p>
            </div>

            <h3 style="margin:0 0 12px;font-size:15px;color:#111">Your commission rates</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #f3f4f6;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f9f9f9">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">Plan</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">Price</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">Rate</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">You Earn</th>
                </tr>
              </thead>
              <tbody>${commissionRows}</tbody>
            </table>

            <div style="background:#f0fdf4;border-radius:10px;padding:16px 20px;margin-bottom:24px;border:1px solid #bbf7d0">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#166534">⭐ Performance Bonus</p>
              <p style="margin:0;font-size:13px;color:#166534;line-height:1.6">
                Refer at least <strong>1 new client per month</strong> and get a free
                <strong>vibecodes.space Business Plan</strong> ($49/mo value) for your own use.
              </p>
            </div>

            <a href="${inviteLink}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:12px">
              Set Up Your Dashboard →
            </a>
            <p style="margin:0 0 24px;font-size:12px;color:#999">
              Click above to set your password and access your affiliate dashboard where you can
              track referrals, earnings, and download marketing materials.
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="font-size:12px;color:#999;margin:0;line-height:1.6">
              Questions? Reply to this email or contact <a href="mailto:contact@purepulse.one" style="color:#555">contact@purepulse.one</a><br>
              PurePulse · Web Design &amp; Maintenance · purepulse.one
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('[affiliates/apply] welcome email error:', err)
  }

  // Notify admin
  try {
    await resend.emails.send({
      from: 'PurePulse Affiliates <matty@purepulse.one>',
      to: 'matty@purepulse.one',
      subject: `New affiliate signup — ${affiliate.name}`,
      html: `
        <p><strong>${affiliate.name}</strong> (${affiliate.email}) just signed up as an affiliate.</p>
        <p>Referral code: <strong>${referralCode}</strong></p>
        ${notes ? `<p>Notes: ${notes}</p>` : ''}
      `,
    })
  } catch {}

  return NextResponse.json({ referral_code: referralCode, email: affiliate.email, success: true })
}
