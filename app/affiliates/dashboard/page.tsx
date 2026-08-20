import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'
import { generateReferralCode } from '@/lib/affiliate-utils'
import AffiliateDashboardClient from './DashboardClient'

export default async function AffiliateDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const authUser = user || session?.user

  if (!authUser) redirect('/affiliates/login')

  const admin = adminSupabase()

  let { data: affiliate } = await admin
    .from('affiliates')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!affiliate && authUser.email) {
    const cleanEmail = authUser.email.toLowerCase().trim()

    const { data: affByEmail } = await admin
      .from('affiliates')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (affByEmail) {
      affiliate = affByEmail
      try {
        await admin
          .from('affiliates')
          .update({ auth_user_id: authUser.id, updated_at: new Date().toISOString() })
          .eq('id', affByEmail.id)
      } catch (linkErr) {
        console.warn('[affiliates/dashboard] link auth_user_id notice:', linkErr)
      }
    } else {
      // Check interviews for previous applicant
      let interview: { candidate_name?: string; candidate_phone?: string; job_title?: string } | null = null
      try {
        const { data: iv } = await admin
          .from('interviews')
          .select('*')
          .eq('candidate_email', cleanEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        interview = iv
      } catch (ivErr) {
        console.warn('[affiliates/dashboard] interview query notice:', ivErr)
      }

      const candidateName = interview?.candidate_name?.trim() ||
        (authUser.user_metadata?.full_name || authUser.user_metadata?.name || cleanEmail.split('@')[0] || 'Partner')

      const refCode = generateReferralCode(candidateName)
      try {
        const { data: newAff, error: insertErr } = await admin
          .from('affiliates')
          .insert({
            name: candidateName,
            email: cleanEmail,
            phone: interview?.candidate_phone?.trim() || null,
            auth_user_id: authUser.id,
            referral_code: refCode,
            status: 'active',
            promotion_strategy: interview ? `Previous Applicant — ${interview.job_title || 'Affiliate'}` : 'Direct Partner Signup',
            created_at: new Date().toISOString(),
          })
          .select('*')
          .single()

        if (newAff && !insertErr) {
          affiliate = newAff
        }
      } catch (createErr) {
        console.warn('[affiliates/dashboard] affiliate creation notice:', createErr)
      }
    }
  }

  // If still not in DB, create a graceful session-backed affiliate object so authenticated users are never kicked out
  if (!affiliate) {
    const cleanEmail = (authUser.email || '').toLowerCase().trim()
    const candidateName = (authUser.user_metadata?.full_name || authUser.user_metadata?.name || cleanEmail.split('@')[0] || 'Partner') as string
    const refCode = generateReferralCode(candidateName)
    affiliate = {
      id: authUser.id,
      name: candidateName,
      email: cleanEmail,
      phone: null,
      auth_user_id: authUser.id,
      referral_code: refCode,
      status: 'active',
      clicks: 0,
      notes: null,
      stripe_global_payout_recipient_id: null,
      stripe_payout_method_id: null,
      payout_onboarding_status: 'setup_required',
      payouts_enabled: false,
      payout_country: 'US',
      payout_entity_type: 'individual',
      payout_requirements_due: [],
      payout_onboarded_at: null,
      last_payout_status_sync_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }


  // Fetch referrals
  const { data: referrals } = await admin
    .from('affiliate_referrals')
    .select('*, clients(name, email, company)')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })

  // Fetch commissions
  const { data: commissions } = await admin
    .from('affiliate_commissions')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('period_month', { ascending: false })

  // Fetch clicks / source stats
  const { data: recentClicks } = await admin
    .from('affiliate_clicks')
    .select('id, source, converted, created_at')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const activeReferrals = (referrals ?? []).filter((r: { status: string }) => r.status === 'active')
  const monthlyEarnings = activeReferrals.reduce((sum: number, r: { monthly_commission?: number }) => sum + Number(r.monthly_commission || 0), 0)
  const lifetimeEarnings = (commissions ?? []).reduce((sum: number, c: { amount?: number }) => sum + Number(c.amount || 0), 0)
  const pendingCommissions = (commissions ?? [])
    .filter((c: { status: string }) => c.status === 'pending')
    .reduce((sum: number, c: { amount?: number }) => sum + Number(c.amount || 0), 0)

  const totalClicksCount = Math.max(affiliate.clicks || 0, (recentClicks ?? []).length)
  const conversionRate = totalClicksCount > 0
    ? Math.round(((referrals ?? []).length / totalClicksCount) * 1000) / 10
    : 0

  const sourceBreakdown: Record<string, number> = {}
  for (const c of (recentClicks ?? []) as Array<{ source?: string }>) {
    const src = c.source || 'direct'
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1
  }

  const freePlanEligible = activeReferrals.length >= 1

  return (
    <AffiliateDashboardClient
      affiliate={affiliate}
      referrals={referrals ?? []}
      commissions={commissions ?? []}
      recentClicks={recentClicks ?? []}
      sourceBreakdown={sourceBreakdown}
      stats={{
        total_referrals: (referrals ?? []).length,
        active_referrals: activeReferrals.length,
        monthly_earnings: monthlyEarnings,
        lifetime_earnings: lifetimeEarnings,
        pending_commissions: pendingCommissions,
        total_clicks: totalClicksCount,
        conversion_rate: conversionRate,
        free_plan_eligible: freePlanEligible,
      }}
    />
  )
}
