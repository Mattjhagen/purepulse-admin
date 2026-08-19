import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in to your affiliate account.' }, { status: 401 })
  }

  const admin = adminSupabase()
  const { data: affiliate, error } = await admin
    .from('affiliates')
    .select('id, name, email, referral_code, stripe_account_id, stripe_payouts_enabled')
    .eq('auth_user_id', session.user.id)
    .single()

  if (error || !affiliate) {
    return NextResponse.json({ error: 'Affiliate record not found.' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const stripe = getStripe()
  let accountId = affiliate.stripe_account_id as string | null

  try {
    // If no Stripe Connect account exists yet, create one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: affiliate.email,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
        metadata: {
          affiliate_id: affiliate.id,
          referral_code: affiliate.referral_code,
          name: affiliate.name,
        },
      })
      accountId = account.id
      await admin
        .from('affiliates')
        .update({
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliate.id)
    }

    // Check account status in Stripe
    const stripeAccount = await stripe.accounts.retrieve(accountId)
    const payoutsEnabled = Boolean(stripeAccount.payouts_enabled)

    if (payoutsEnabled !== affiliate.stripe_payouts_enabled) {
      await admin
        .from('affiliates')
        .update({ stripe_payouts_enabled: payoutsEnabled, updated_at: new Date().toISOString() })
        .eq('id', affiliate.id)
    }

    let url: string

    // If already fully onboarded and payouts enabled, generate Express Dashboard login link
    const action = req.nextUrl.searchParams.get('action')
    if (payoutsEnabled && action !== 'reauth') {
      try {
        const loginLink = await stripe.accounts.createLoginLink(accountId)
        url = loginLink.url
      } catch {
        // Fallback to account link if login link creation fails
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${appUrl}/affiliates/dashboard?tab=payouts&reauth=1`,
          return_url: `${appUrl}/affiliates/dashboard?tab=payouts&success=1`,
          type: 'account_onboarding',
        })
        url = accountLink.url
      }
    } else {
      // Generate Account Onboarding link for initial setup / completion
      const accountLink: Stripe.AccountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/affiliates/dashboard?tab=payouts&reauth=1`,
        return_url: `${appUrl}/affiliates/dashboard?tab=payouts&success=1`,
        type: 'account_onboarding',
      })
      url = accountLink.url
    }

    return NextResponse.json({
      url,
      account_id: accountId,
      payouts_enabled: payoutsEnabled,
      success: true,
    })
  } catch (err) {
    console.error('[api/affiliates/connect] Stripe Connect error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to create Stripe payout link.',
    }, { status: 500 })
  }
}
