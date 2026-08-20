import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/require-admin'
import { getResend } from '@/lib/resend'
import type Stripe from 'stripe'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const supabase = adminSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const { data: referral, error } = await supabase
    .from('referrals')
    .select('id, name, email, stripe_account_id')
    .eq('id', id)
    .single()

  if (error || !referral) {
    return NextResponse.json({ error: 'Referrer not found.' }, { status: 404 })
  }

  const stripe = getStripe()
  let accountId = referral.stripe_account_id as string | null
  let link: Stripe.AccountLink

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: referral.email ?? undefined,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
      })
      accountId = account.id
      await supabase.from('referrals').update({
        stripe_account_id: accountId,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }

    link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/referrals/connect/${id}`,
      return_url: `${appUrl}/referrals/connect/${id}`,
      type: 'account_onboarding',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe Connect setup failed.' }, { status: 500 })
  }

  let emailed = false
  if (referral.email) {
    try {
      const resend = getResend()
      const { error: emailErr } = await resend.emails.send({
        from: 'Matty at PurePulse <matty@purepulse.one>',
        to: referral.email,
        subject: `Set up payouts for your PurePulse referrals`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#07070D;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
              <span style="font-size:20px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
            </div>
            <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
              <p style="color:#555;line-height:1.7;margin:0 0 8px">Hi ${referral.name},</p>
              <p style="color:#555;line-height:1.7;margin:0 0 24px">
                Click below to securely add your bank details with Stripe so PurePulse can pay your referral commissions directly.
              </p>
              <a href="${link.url}" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
                Set Up Payouts →
              </a>
              <p style="margin:16px 0 0;color:#999;font-size:12px">This link is one-time use and tied to your referral account.</p>
            </div>
          </div>
        `,
      })
      if (!emailErr) emailed = true
      else console.error('[referral connect] email error:', emailErr)
    } catch (err) {
      console.error('[referral connect] email threw:', err)
    }
  }

  return NextResponse.json({ url: link.url, emailed })
}
