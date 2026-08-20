import type { User, SupabaseClient } from '@supabase/supabase-js'

export type PayoutOnboardingStatus =
  | 'setup_required'
  | 'verification_pending'
  | 'ready_for_payouts'
  | 'additional_information_required'
  | 'payouts_restricted'

export interface AffiliateRecord {
  id: string
  auth_user_id: string | null
  name: string
  email: string
  phone: string | null
  referral_code: string
  status: string
  clicks?: number
  notes?: string | null
  stripe_global_payout_recipient_id: string | null
  stripe_payout_method_id: string | null
  payout_onboarding_status: PayoutOnboardingStatus
  payouts_enabled: boolean
  payout_country: string
  payout_entity_type: 'individual' | 'company'
  payout_requirements_due: unknown
  payout_onboarded_at: string | null
  last_payout_status_sync_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Resolves the authenticated user to their corresponding affiliate record.
 * Handles existing affiliates created prior to auth user creation by matching
 * on verified email and safely linking auth_user_id without duplicate creation.
 */
export async function resolveAuthenticatedAffiliate(
  user: User,
  adminClient: SupabaseClient
): Promise<{ affiliate: AffiliateRecord | null; error?: string }> {
  if (!user || !user.id) {
    return { affiliate: null, error: 'User is not authenticated' }
  }

  // 1. Direct lookup by auth_user_id
  const { data: affByAuth, error: authErr } = await adminClient
    .from('affiliates')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (affByAuth) {
    return { affiliate: affByAuth as AffiliateRecord }
  }

  if (authErr) {
    console.error('[resolveAuthenticatedAffiliate] Auth query error:', authErr)
  }

  // 2. Fallback lookup by normalized email
  if (user.email) {
    const cleanEmail = user.email.toLowerCase().trim()

    const { data: affByEmail, error: emailErr } = await adminClient
      .from('affiliates')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (emailErr) {
      console.error('[resolveAuthenticatedAffiliate] Email query error:', emailErr)
    }

    if (affByEmail) {
      // Link the auth_user_id to the existing affiliate record
      const { data: updatedAff, error: updateErr } = await adminClient
        .from('affiliates')
        .update({
          auth_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affByEmail.id)
        .select('*')
        .single()

      if (updateErr) {
        console.error('[resolveAuthenticatedAffiliate] Link error:', updateErr)
        return { affiliate: affByEmail as AffiliateRecord }
      }

      return { affiliate: (updatedAff || affByEmail) as AffiliateRecord }
    }
  }

  return { affiliate: null, error: 'Affiliate record not found' }
}
