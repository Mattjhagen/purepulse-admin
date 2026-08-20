import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { dollarsToCents, centsToDollars, formatCentsToMoney } from '@/lib/stripe-global-payouts'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 })
  }

  const supabase = adminSupabase()

  // Fetch pending commissions
  const { data: commissions, error: commError } = await supabase
    .from('affiliate_commissions')
    .select('id, affiliate_id, period_month, amount, status, created_at')
    .eq('status', 'pending')

  if (commError) {
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
  }

  // Fetch affiliates
  const { data: affiliates, error: affError } = await supabase
    .from('affiliates')
    .select('id, name, email, referral_code, stripe_global_payout_recipient_id, payout_onboarding_status, payouts_enabled, payout_country, payout_entity_type')

  if (affError) {
    return NextResponse.json({ error: 'Failed to fetch affiliates' }, { status: 500 })
  }

  const affiliateMap = new Map((affiliates || []).map(a => [a.id, a]))

  // Group pending commissions by affiliate
  const batchesByAffiliate = new Map<string, {
    affiliate: (typeof affiliates)[0]
    commission_ids: string[]
    total_cents: number
    commission_count: number
  }>()

  for (const c of commissions || []) {
    const aff = affiliateMap.get(c.affiliate_id)
    if (!aff) continue

    const cents = dollarsToCents(Number(c.amount || 0))
    if (!batchesByAffiliate.has(c.affiliate_id)) {
      batchesByAffiliate.set(c.affiliate_id, {
        affiliate: aff,
        commission_ids: [c.id],
        total_cents: cents,
        commission_count: 1,
      })
    } else {
      const entry = batchesByAffiliate.get(c.affiliate_id)!
      entry.commission_ids.push(c.id)
      entry.total_cents += cents
      entry.commission_count += 1
    }
  }

  const eligible: Array<{
    affiliate_id: string
    name: string
    email: string
    recipient_id: string
    total_cents: number
    total_formatted: string
    commission_count: number
    commission_ids: string[]
    status: string
  }> = []

  const ineligible: Array<{
    affiliate_id: string
    name: string
    email: string
    total_cents: number
    total_formatted: string
    commission_count: number
    commission_ids: string[]
    reason: string
    recipient_status: string
  }> = []

  let totalPayableCents = 0

  for (const [affId, batch] of batchesByAffiliate.entries()) {
    const aff = batch.affiliate
    const meetsMin = batch.total_cents >= 2000 // $20.00 minimum
    const isReady = aff.stripe_global_payout_recipient_id && aff.payouts_enabled && aff.payout_onboarding_status === 'ready_for_payouts'

    if (meetsMin && isReady) {
      eligible.push({
        affiliate_id: affId,
        name: aff.name,
        email: aff.email,
        recipient_id: aff.stripe_global_payout_recipient_id!,
        total_cents: batch.total_cents,
        total_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_count,
        commission_ids: batch.commission_ids,
        status: aff.payout_onboarding_status,
      })
      totalPayableCents += batch.total_cents
    } else {
      let reason = 'Unknown'
      if (!meetsMin) {
        reason = `Below $20 minimum threshold (current: ${formatCentsToMoney(batch.total_cents)})`
      } else if (!aff.stripe_global_payout_recipient_id) {
        reason = 'No Stripe Global Payouts recipient setup'
      } else if (!aff.payouts_enabled) {
        reason = 'Payouts not enabled in Stripe'
      } else {
        reason = `Recipient status: ${aff.payout_onboarding_status.replace(/_/g, ' ')}`
      }

      ineligible.push({
        affiliate_id: affId,
        name: aff.name,
        email: aff.email,
        total_cents: batch.total_cents,
        total_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_count,
        commission_ids: batch.commission_ids,
        reason,
        recipient_status: aff.payout_onboarding_status || 'setup_required',
      })
    }
  }

  return NextResponse.json({
    summary: {
      total_payable_cents: totalPayableCents,
      total_payable_formatted: formatCentsToMoney(totalPayableCents),
      eligible_affiliates_count: eligible.length,
      ineligible_affiliates_count: ineligible.length,
      minimum_threshold_cents: 2000,
    },
    eligible,
    ineligible,
  })
}
