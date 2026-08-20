import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend } from '@/lib/resend'
import { getStripe } from '@/lib/stripe'
import { TEST_EMAILS_TO_REMOVE, cleanupTestAffiliates } from '@/lib/cleanup-test-affiliates'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function GET() {
  try {
    // Run cleanup of specified test accounts
    try {
      await cleanupTestAffiliates()
    } catch (cleanErr) {
      console.warn('Auto-cleanup test affiliates notice:', cleanErr)
    }

    const supabase = adminSupabase()

    const [
      { data: affData },
      { data: refData },
      { data: affRefs },
      { data: affComms },
      { data: interviewData },
    ] = await Promise.all([
      supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
      supabase.from('referrals').select('*').order('created_at', { ascending: false }),
      supabase.from('affiliate_referrals').select('id, affiliate_id, status, monthly_commission'),
      supabase.from('affiliate_commissions').select('id, affiliate_id, amount, status'),
      supabase.from('interviews').select('id, candidate_name, candidate_email, candidate_phone, status, created_at').order('created_at', { ascending: false }),
    ])

    const merged: Array<{
      id: string
      name: string
      email: string | null
      phone: string | null
      code: string
      clicks: number
      conversions: number
      commission_per_conversion: number
      total_earned: number
      total_paid: number
      notes: string | null
      active: boolean
      source: string
      created_at: string
    }> = []

    const seenEmails = new Set<string>()
    const seenCodes = new Set<string>()

    // 1. Process all affiliates from `affiliates` table
    if (affData) {
      for (const a of affData) {
        const emailKey = a.email ? a.email.toLowerCase().trim() : null
        const codeKey = a.referral_code ? a.referral_code.toUpperCase().trim() : null
        if (emailKey) seenEmails.add(emailKey)
        if (codeKey) seenCodes.add(codeKey)

        const aRefs = (affRefs ?? []).filter(r => r.affiliate_id === a.id)
        const aComms = (affComms ?? []).filter(c => c.affiliate_id === a.id)
        const totalEarned = aComms.reduce((s, c) => s + Number(c.amount || 0), 0)
        const totalPaid = aComms.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0)

        merged.push({
          id: a.id,
          name: a.name,
          email: a.email || null,
          phone: a.phone || null,
          code: a.referral_code,
          clicks: a.clicks || 0,
          conversions: aRefs.length,
          commission_per_conversion: 50,
          total_earned: totalEarned,
          total_paid: totalPaid,
          notes: a.notes || null,
          active: a.status === 'active',
          source: 'affiliate',
          created_at: a.created_at,
        })
      }
    }

    // 2. Process legacy referrers from `referrals` table
    if (refData) {
      for (const r of refData) {
        const emailKey = r.email ? r.email.toLowerCase().trim() : null
        const codeKey = r.code ? r.code.toUpperCase().trim() : null

        if (emailKey && seenEmails.has(emailKey)) {
          const existing = merged.find(m => m.email?.toLowerCase().trim() === emailKey)
          if (existing) {
            existing.clicks = Math.max(existing.clicks, r.clicks || 0)
            existing.conversions = Math.max(existing.conversions, r.conversions || 0)
            existing.total_earned = Math.max(existing.total_earned, r.total_earned || 0)
            existing.total_paid = Math.max(existing.total_paid, r.total_paid || 0)
          }
          continue
        }
        if (codeKey && seenCodes.has(codeKey)) continue

        if (emailKey) seenEmails.add(emailKey)
        if (codeKey) seenCodes.add(codeKey)

        merged.push({
          id: r.id,
          name: r.name,
          email: r.email || null,
          phone: r.phone || null,
          code: r.code,
          clicks: r.clicks || 0,
          conversions: r.conversions || 0,
          commission_per_conversion: r.commission_per_conversion || 50,
          total_earned: r.total_earned || 0,
          total_paid: r.total_paid || 0,
          notes: r.notes || null,
          active: r.active ?? true,
          source: 'referral',
          created_at: r.created_at,
        })
      }
    }

    // 3. Process candidate applicants from `interviews` table
    if (interviewData) {
      for (const iv of interviewData) {
        const emailKey = iv.candidate_email ? iv.candidate_email.toLowerCase().trim() : null
        if (!emailKey || seenEmails.has(emailKey)) continue
        seenEmails.add(emailKey)

        const codeFallback = iv.candidate_name
          ? iv.candidate_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) + '346'
          : 'PARTNER'

        merged.push({
          id: iv.id,
          name: iv.candidate_name || 'Applicant',
          email: iv.candidate_email,
          phone: iv.candidate_phone || null,
          code: codeFallback,
          clicks: 0,
          conversions: 0,
          commission_per_conversion: 50,
          total_earned: 0,
          total_paid: 0,
          notes: `Applicant from Video Interview (${iv.status})`,
          active: iv.status === 'onboarded' || iv.status === 'completed',
          source: 'applicant',
          created_at: iv.created_at,
        })
      }
    }

    const testEmailSet = new Set(TEST_EMAILS_TO_REMOVE.map((e: string) => e.toLowerCase().trim()))
    const finalMerged = merged.filter(m => {
      if (!m.email) return true
      return !testEmailSet.has(m.email.toLowerCase().trim())
    })

    finalMerged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      referrals: finalMerged,
      total: finalMerged.length,
      activeCount: finalMerged.filter(m => m.active).length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch affiliates'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

              <!-- Microsoft Teams Community Card -->
              <div style="background:#111118;border:1.5px solid #2D2D42;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;color:#fff">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B83EB">💬 Partner Community</p>
                <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#F4F4FF">Join the PurePulse Affiliate Teams Community</p>
                <p style="margin:0 0 16px;font-size:13px;color:#9CA3AF;line-height:1.5">Connect directly with our team on Microsoft Teams, get custom outreach scripts, ask closing questions, and collaborate with top partners.</p>
                <a href="https://teams.live.com/l/community/FAAT7_iyVqeIobIvQ?v=g1" style="display:inline-block;background:linear-gradient(135deg, #5B5FC7, #464EB8);color:#ffffff;padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:13px;box-shadow:0 4px 12px rgba(91,95,199,0.4)">Join Teams Community Channel →</a>
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
