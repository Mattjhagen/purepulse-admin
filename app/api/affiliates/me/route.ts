import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'
import { ensureAuthenticatedAffiliate } from '@/lib/affiliate-auth'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const authUser = user || session?.user

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = adminSupabase()
  const affiliate = await ensureAuthenticatedAffiliate(authUser, admin)

  if (!affiliate) {
    return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
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

  // Fetch recent clicks / source attribution
  const { data: recentClicks } = await admin
    .from('affiliate_clicks')
    .select('id, source, converted, created_at')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const activeReferrals = (referrals ?? []).filter(r => r.status === 'active')
  const monthlyEarnings = activeReferrals.reduce((sum, r) => sum + Number(r.monthly_commission || 0), 0)
  const lifetimeEarnings = (commissions ?? []).reduce((sum, c) => sum + Number(c.amount || 0), 0)
  const pendingCommissions = (commissions ?? [])
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0)

  const totalClicksCount = Math.max(affiliate.clicks || 0, (recentClicks ?? []).length)
  const conversionRate = totalClicksCount > 0
    ? Math.round(((referrals ?? []).length / totalClicksCount) * 1000) / 10
    : 0

  // Aggregate clicks by campaign source
  const sourceBreakdown: Record<string, number> = {}
  for (const c of recentClicks ?? []) {
    const src = c.source || 'direct'
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1
  }

  // Free plan eligibility: at least 1 active referral
  const freePlanEligible = activeReferrals.length >= 1

  return NextResponse.json({
    affiliate,
    referrals: referrals ?? [],
    commissions: commissions ?? [],
    recent_clicks: recentClicks ?? [],
    source_breakdown: sourceBreakdown,
    stats: {
      total_referrals: (referrals ?? []).length,
      active_referrals: activeReferrals.length,
      monthly_earnings: monthlyEarnings,
      lifetime_earnings: lifetimeEarnings,
      pending_commissions: pendingCommissions,
      total_clicks: totalClicksCount,
      conversion_rate: conversionRate,
      free_plan_eligible: freePlanEligible,
    },
  })
}
