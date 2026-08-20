import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getResend } from '@/lib/resend'
import { generateAffiliateAuthLink } from '@/lib/portal-auth-link'
import { generateReferralCode } from '@/lib/affiliate-utils'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { email } = body
  if (!email || !email.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()
  const supabase = adminSupabase()
  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  // 1. Look up affiliate in the database
  let affiliate: { id: string; name: string; email: string; auth_user_id: string | null; status: string; referral_code: string } | null = null
  try {
    const { data: existingAff } = await supabase
      .from('affiliates')
      .select('id, name, email, auth_user_id, status, referral_code')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingAff) {
      affiliate = existingAff
    }
  } catch (err) {
    console.warn('[affiliates/login] affiliates lookup error:', err)
  }

  // 2. If not found, check previous applicants in 'interviews' table
  if (!affiliate) {
    try {
      const { data: interview } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (interview) {
        const candidateName = interview.candidate_name?.trim() || cleanEmail.split('@')[0]
        const refCode = generateReferralCode(candidateName)
        const { data: createdAff } = await supabase
          .from('affiliates')
          .insert({
            name: candidateName,
            email: cleanEmail,
            phone: interview.candidate_phone?.trim() || null,
            referral_code: refCode,
            status: 'active',
            promotion_strategy: `Previous Applicant — ${interview.job_title || 'Affiliate'}`,
            created_at: new Date().toISOString(),
          })
          .select('id, name, email, auth_user_id, status, referral_code')
          .single()

        if (createdAff) {
          affiliate = createdAff
        }
      }
    } catch (interviewErr) {
      console.warn('[affiliates/login] interviews lookup error:', interviewErr)
    }
  }

  // 3. If still not found, check 'clients' table
  if (!affiliate) {
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (client) {
        const clientName = client.name?.trim() || client.company?.trim() || cleanEmail.split('@')[0]
        const refCode = generateReferralCode(clientName)
        const { data: createdAff } = await supabase
          .from('affiliates')
          .insert({
            name: clientName,
            email: cleanEmail,
            phone: client.phone?.trim() || null,
            referral_code: refCode,
            status: 'active',
            created_at: new Date().toISOString(),
          })
          .select('id, name, email, auth_user_id, status, referral_code')
          .single()

        if (createdAff) {
          affiliate = createdAff
        }
      }
    } catch (clientErr) {
      console.warn('[affiliates/login] clients lookup error:', clientErr)
    }
  }

  // 4. If still not found, check Supabase Auth users
  if (!affiliate) {
    try {
      const { data: userList } = await supabase.auth.admin.listUsers()
      const foundUser = userList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail)
      if (foundUser) {
        const name = (foundUser.user_metadata?.full_name || foundUser.user_metadata?.name || cleanEmail.split('@')[0]) as string
        const refCode = generateReferralCode(name)
        const { data: createdAff } = await supabase
          .from('affiliates')
          .insert({
            name,
            email: cleanEmail,
            auth_user_id: foundUser.id,
            referral_code: refCode,
            status: 'active',
            created_at: new Date().toISOString(),
          })
          .select('id, name, email, auth_user_id, status, referral_code')
          .single()

        if (createdAff) {
          affiliate = createdAff
        }
      }
    } catch (authUsersErr) {
      console.warn('[affiliates/login] auth users lookup error:', authUsersErr)
    }
  }

  if (!affiliate) {
    return NextResponse.json(
      { error: 'No affiliate account found for that email. Please check the address or apply below.' },
      { status: 404 }
    )
  }

  // 2. Generate secure Supabase magic link
  let authLinkUrl: string | null = null
  try {
    const authLink = await generateAffiliateAuthLink(supabase, affiliate.email, {
      affiliateId: affiliate.id,
      name: affiliate.name,
      appUrl,
      next: '/affiliates/dashboard',
    })

    if (authLink?.url) {
      authLinkUrl = authLink.url
      if (authLink.userId && affiliate.auth_user_id !== authLink.userId) {
        await supabase
          .from('affiliates')
          .update({ auth_user_id: authLink.userId })
          .eq('id', affiliate.id)
      }
    }
  } catch (authErr) {
    console.error('[affiliates/login] generate link error:', authErr)
  }

  if (!authLinkUrl) {
    return NextResponse.json(
      { error: 'Unable to generate sign-in link. Please contact support or try again.' },
      { status: 500 }
    )
  }

  // 3. Send magic link email via Resend
  const firstName = affiliate.name.split(' ')[0] || 'Partner'
  try {
    await resend.emails.send({
      from: 'Matty at PurePulse <matty@purepulse.one>',
      to: affiliate.email,
      subject: 'Your PurePulse Affiliate Portal Sign-In Link',
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:#07070D;padding:24px 32px">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.03em">Pure<span style="color:#A066FF">Pulse</span></span>
            <span style="font-size:12px;color:#888888;margin-left:12px;font-weight:500">Affiliate Portal</span>
          </div>

          <div style="padding:32px">
            <h1 style="font-size:20px;font-weight:800;color:#111111;margin:0 0 12px">Sign in to your partner portal</h1>
            <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 24px">
              Hi ${firstName}, click the button below to access your PurePulse affiliate dashboard, track your referral earnings, download printable promotional assets, and manage payouts:
            </p>

            <div style="text-align:center;margin:28px 0">
              <a
                href="${authLinkUrl}"
                style="display:inline-block;background:#7B2FFF;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;box-shadow:0 4px 14px rgba(123,47,255,0.35)"
              >
                Sign In to Affiliate Dashboard →
              </a>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:24px 0 0">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600">Your Partner Code:</p>
              <code style="font-size:14px;font-weight:700;color:#7B2FFF;background:#ffffff;padding:2px 8px;border-radius:4px;border:1px solid #e5e7eb">${affiliate.referral_code}</code>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px" />
            <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.5">
              This sign-in link is secure and valid for 24 hours. If you didn't request this email, you can safely ignore it.
            </p>
          </div>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('[affiliates/login] email send error:', emailErr)
    return NextResponse.json(
      { error: 'Failed to send sign-in email. Please try again in a few moments.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    email: affiliate.email,
    message: 'Sign-in link sent successfully.',
  })
}
