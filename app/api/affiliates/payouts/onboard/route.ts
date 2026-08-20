import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'
import { ensureAuthenticatedAffiliate } from '@/lib/affiliate-auth'
import {
  createGlobalPayoutRecipient,
  createRecipientAccountLink,
  getGlobalPayoutRecipient,
  mapStripeRecipientStatus,
} from '@/lib/stripe-global-payouts'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const authUser = user || session?.user

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in to your affiliate account.' }, { status: 401 })
  }

  const admin = adminSupabase()
  const affiliate = await ensureAuthenticatedAffiliate(authUser, admin)

  if (!affiliate) {
    return NextResponse.json({ error: 'Affiliate record not found.' }, { status: 404 })
  }

  let body: { country?: string; entity_type?: 'individual' | 'company' } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine, use defaults
  }

  const country = (body.country || affiliate.payout_country || 'US').toUpperCase()
  const entityType = body.entity_type || affiliate.payout_entity_type || 'individual'
  const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one'

  try {
    let recipientId = affiliate.stripe_global_payout_recipient_id

    // If no Global Payouts recipient exists yet, create one via Accounts v2
    if (!recipientId) {
      const recipientAccount = await createGlobalPayoutRecipient({
        email: affiliate.email,
        name: affiliate.name,
        country,
        entityType,
        affiliateId: affiliate.id,
        referralCode: affiliate.referral_code,
      })

      recipientId = recipientAccount.id

      await admin
        .from('affiliates')
        .update({
          stripe_global_payout_recipient_id: recipientId,
          payout_country: country,
          payout_entity_type: entityType,
          payout_onboarding_status: 'setup_required',
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliate.id)
    }

    // Generate single-use Account Link v2 for Stripe-hosted recipient onboarding
    const returnUrl = `${appUrl}/affiliates/dashboard?tab=payouts&returned=1`
    const refreshUrl = `${appUrl}/affiliates/dashboard?tab=payouts&reauth=1`

    const accountLink = await createRecipientAccountLink({
      accountId: recipientId,
      returnUrl,
      refreshUrl,
      collectionOption: 'currently_due',
    })

    return NextResponse.json({
      url: accountLink.url,
      recipient_id: recipientId,
      status: affiliate.payout_onboarding_status,
      success: true,
    })
  } catch (err: unknown) {
    console.error('[api/affiliates/payouts/onboard] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to initiate Stripe Global Payouts onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
