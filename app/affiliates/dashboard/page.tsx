import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import AffiliateDashboardClient from './DashboardClient'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export default async function AffiliateDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/affiliates/login')

  const admin = adminSupabase()

  const { data: affiliate } = await admin
    .from('affiliates')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!affiliate) redirect('/affiliates/login')

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
