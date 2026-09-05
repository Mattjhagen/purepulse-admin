import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getResend } from '@/lib/resend'
import { generateReferralCode, calculateMonthlyCommission, AFFILIATE_COMMISSION_RATES } from '@/lib/affiliate-utils'
import { generateAffiliateAuthLink } from '@/lib/portal-auth-link'
import { PLAN_PRICES } from '@/lib/types'

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
  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'

  // Check if affiliate account already exists
  let existingAffiliate: { id: string; name: string; email: string; referral_code: string; interview_token?: string | null } | null = null
  try {
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id, name, email, referral_code, status, interview_token')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (existing) {
      existingAffiliate = existing
    }
  } catch (dupErr) {
    console.warn('[affiliates/apply] Duplicate check warning:', dupErr)
  }

  let affiliate: { id: string; name: string; email: string; referral_code: string; interview_token?: string | null } | null = null
  let referralCode = existingAffiliate?.referral_code || ''

  if (existingAffiliate) {
    referralCode = existingAffiliate.referral_code
    try {
      const { data: updated } = await supabase
        .from('affiliates')
        .update({
          name: name.trim(),
          phone: phone?.trim() || null,
          status: 'pending_review',
          notes: notes?.trim() || null,
          terms_signed_at: new Date().toISOString(),
          terms_signature_data: signature_data,
          terms_ip: ip,
        })
        .eq('id', existingAffiliate.id)
        .select('id, name, email, referral_code, interview_token')
        .single()

      affiliate = updated || existingAffiliate
    } catch (updErr) {
      console.warn('[affiliates/apply] update existing error:', updErr)
      affiliate = existingAffiliate
    }
  } else {
    // Generate unique referral code
    referralCode = generateReferralCode(name)
    try {
      for (let i = 0; i < 8; i++) {
        const { count } = await supabase
          .from('affiliates')
          .select('id', { count: 'exact', head: true })
          .eq('referral_code', referralCode)
        if (count === 0) break
        referralCode = generateReferralCode(name)
      }
    } catch {
      // ignore
    }

    // Create affiliate record
    try {
      const { data, error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          referral_code: referralCode,
          status: 'pending_review',
          notes: notes?.trim() || null,
          terms_signed_at: new Date().toISOString(),
          terms_signature_data: signature_data,
          terms_ip: ip,
        })
        .select('id, name, email, referral_code, interview_token')
        .single()

      if (data) {
        affiliate = data
      } else if (affiliateError) {
        console.warn('[affiliates/apply] insert warning (fallback enabled):', affiliateError.message)
      }
    } catch (insertErr) {
      console.warn('[affiliates/apply] insert exception (fallback enabled):', insertErr)
    }
  }

  if (!affiliate) {
    affiliate = {
      id: `aff_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      referral_code: referralCode,
    }
  }

  if (!affiliate.interview_token && !affiliate.id.startsWith('aff_')) {
    const interviewToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '').slice(0, 16)
    const { data: updated } = await supabase
      .from('affiliates')
      .update({ interview_token: interviewToken })
      .eq('id', affiliate.id)
      .select('interview_token')
      .single()
    affiliate.interview_token = updated?.interview_token || interviewToken
  }

  // Generate secure Supabase auth link for instant dashboard access
  let inviteLink = `${appUrl}/affiliates/dashboard`
  try {
    const authLink = await generateAffiliateAuthLink(supabase, affiliate.email, {
      affiliateId: affiliate.id,
      name: affiliate.name,
      appUrl,
      next: '/affiliates/dashboard',
    })

    if (authLink?.url) {
      inviteLink = authLink.url
      if (authLink.userId) {
        await supabase
          .from('affiliates')
          .update({ auth_user_id: authLink.userId })
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
      subject: `Welcome to PurePulse Affiliates — Your Portal & Referral Link Are Ready`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:620px;margin:0 auto">
          <div style="background:#07070D;padding:24px 32px;border-radius:12px 12px 0 0">
            <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.03em">Pure<span style="color:#A066FF">Pulse</span></span>
            <span style="font-size:12px;color:#888;margin-left:12px">Affiliate Portal</span>
          </div>
          <div style="padding:36px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="margin:0 0 8px;color:#111;font-size:22px">Welcome, ${firstName}! 🎉</h2>
            <p style="color:#555;line-height:1.7;margin:0 0 24px">
              You're officially enrolled in the PurePulse Affiliate Program. Your partner dashboard is set up and your
              unique referral link and assets are ready to share.
            </p>

            <div style="background:#f8f8f8;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1px solid #e5e7eb">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Your Partner Code</p>
              <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:0.06em;color:#111;font-family:monospace">${referralCode}</p>
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Your Referral Link</p>
              <p style="margin:0;font-size:14px;color:#7B2FFF;word-break:break-all">${referralUrl}</p>
            </div>

            <h3 style="margin:0 0 12px;font-size:15px;color:#111">Recurring monthly commission rates</h3>
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
                Refer at least <strong>1 new client per month</strong> and unlock complimentary access to the
                <strong>vibecodes.space Business Plan</strong> ($49/mo value) for your business.
              </p>
            </div>

            <div style="background:#FFF7ED;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1.5px solid #FDBA74">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#C2410C">🎥 Final Step: Complete Your Candidate Video Interview</p>
              <p style="margin:0 0 14px;font-size:13px;color:#9A3412;line-height:1.6">
                To complete your onboarding evaluation and unlock priority deal coaching, please complete our brief 9-question asynchronous video interview (takes ~5 minutes).
              </p>
              <a href="https://login.purepulse.one/interview" style="display:inline-block;background:#EA580C;color:#ffffff;font-size:13px;font-weight:700;padding:10px 22px;border-radius:6px;text-decoration:none;box-shadow:0 2px 8px rgba(234,88,12,0.3)">
                Complete Video Interview &amp; Onboarding →
              </a>
            </div>

            <div style="background:#F0F2FD;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1px solid #D1D8F7">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#3B40A8">💬 Join the PurePulse Partner Teams Community</p>
              <p style="margin:0 0 14px;font-size:13px;color:#3B40A8;line-height:1.6">
                Connect directly with our team on Microsoft Teams, get instant sales deal support, request custom outreach scripts, and collaborate with top partners.
              </p>
              <a href="https://mattjhagen.github.io/PurePulseMeet/" style="display:inline-block;background:#7B2FFF;color:#ffffff;font-size:13px;font-weight:700;padding:10px 22px;border-radius:6px;text-decoration:none">
                📱 Download Mobile Partner App →
              </a>
            </div>


            <h3 style="margin:0 0 14px;font-size:15px;color:#111">Your Partner Toolkit:</h3>
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
                <p style="margin:0 0 3px;font-weight:700;font-size:13px;color:#111">📄 1. Printable Asset Hub</p>
                <p style="margin:0;font-size:12px;color:#666;line-height:1.5">Download full-page flyers, business cards, tear-off tab posters, and high-res vector QR codes.</p>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
                <p style="margin:0 0 3px;font-weight:700;font-size:13px;color:#111">📱 2. Social Media Campaign Studio</p>
                <p style="margin:0;font-size:12px;color:#666;line-height:1.5">Generate ready-to-post graphics (1:1, 9:16, 16:9), copy pre-written captions, and share in 1 click.</p>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
                <p style="margin:0 0 3px;font-weight:700;font-size:13px;color:#111">💳 3. Bank Account &amp; Direct Deposit Setup</p>
                <p style="margin:0;font-size:12px;color:#666;line-height:1.5">Connect your bank account via Stripe for direct monthly commission deposits.</p>
              </div>
            </div>

            <a href="${inviteLink}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:12px">
              Open Your Affiliate Portal →
            </a>
            <p style="margin:0 0 24px;font-size:12px;color:#999">
              Click above to access your affiliate portal, download your marketing assets, and link your payout bank account.
            </p>


            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="font-size:12px;color:#999;margin:0;line-height:1.6">
              Questions? Reply directly to this email or contact <a href="mailto:contact@purepulse.one" style="color:#555">contact@purepulse.one</a><br>
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

  return NextResponse.json({
    success: true,
    referral_code: referralCode,
    email: affiliate.email,
    action_link: inviteLink,
    interview_token: affiliate.interview_token || null,
    schedule_url: affiliate.interview_token ? `${appUrl}/schedule/${affiliate.interview_token}` : null,
  })
}
