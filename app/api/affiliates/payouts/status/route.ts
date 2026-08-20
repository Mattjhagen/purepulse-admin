import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { resolveAuthenticatedAffiliate } from '@/lib/affiliate-auth'
import {
  getGlobalPayoutRecipient,
  mapStripeRecipientStatus,
} from '@/lib/stripe-global-payouts'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const authUser = user || session?.user

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = adminSupabase()
  const { affiliate, error: affError } = await resolveAuthenticatedAffiliate(authUser, admin)

  if (affError || !affiliate) {
    return NextResponse.json({ error: affError || 'Affiliate record not found' }, { status: 404 })
  }

  // If no Stripe recipient exists yet, return default setup_required status
  if (!affiliate.stripe_global_payout_recipient_id) {
    return NextResponse.json({
      status: affiliate.payout_onboarding_status || 'setup_required',
      payouts_enabled: false,
      requirements_due: [],
      country: affiliate.payout_country || 'US',
      entity_type: affiliate.payout_entity_type || 'individual',
      recipient_id: null,
      last_synced_at: affiliate.last_payout_status_sync_at,
    })
  }

  try {
    const stripeAccount = await getGlobalPayoutRecipient(affiliate.stripe_global_payout_recipient_id)
    const result = mapStripeRecipientStatus(stripeAccount)

    const now = new Date().toISOString()
    const isNowOnboarded = result.payoutsEnabled && !affiliate.payout_onboarded_at

    await admin
      .from('affiliates')
      .update({
        payout_onboarding_status: result.payoutOnboardingStatus,
        payouts_enabled: result.payoutsEnabled,
        payout_requirements_due: result.requirementsDue,
        stripe_payout_method_id: result.payoutMethodId || affiliate.stripe_payout_method_id,
        payout_onboarded_at: isNowOnboarded ? now : affiliate.payout_onboarded_at,
        last_payout_status_sync_at: now,
        updated_at: now,
      })
      .eq('id', affiliate.id)

    return NextResponse.json({
      status: result.payoutOnboardingStatus,
      payouts_enabled: result.payoutsEnabled,
      requirements_due: result.requirementsDue,
      country: affiliate.payout_country || 'US',
      entity_type: affiliate.payout_entity_type || 'individual',
      recipient_id: affiliate.stripe_global_payout_recipient_id,
      onboarded_at: isNowOnboarded ? now : affiliate.payout_onboarded_at,
      last_synced_at: now,
    })
  } catch (err: unknown) {
    console.error('[api/affiliates/payouts/status] Sync error:', err)
    // Return stored DB status if Stripe retrieval encounters an issue
    return NextResponse.json({
      status: affiliate.payout_onboarding_status,
      payouts_enabled: affiliate.payouts_enabled,
      requirements_due: Array.isArray(affiliate.payout_requirements_due) ? affiliate.payout_requirements_due : [],
      country: affiliate.payout_country,
      entity_type: affiliate.payout_entity_type,
      recipient_id: affiliate.stripe_global_payout_recipient_id,
      last_synced_at: affiliate.last_payout_status_sync_at,
      warning: err instanceof Error ? err.message : 'Unable to query Stripe directly',
    })
  }
}

export async function POST() {
  return GET()
}
