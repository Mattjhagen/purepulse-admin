import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import {
  createOutboundPayment,
  dollarsToCents,
  formatCentsToMoney,
} from '@/lib/stripe-global-payouts'

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 })
  }

  let body: {
    affiliate_ids?: string[]
    test_mode_simulation?: boolean
  } = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const supabase = adminSupabase()
  const targetAffiliateIds = body.affiliate_ids

  // Fetch pending commissions
  let commQuery = supabase
    .from('affiliate_commissions')
    .select('id, affiliate_id, period_month, amount, status')
    .eq('status', 'pending')

  if (Array.isArray(targetAffiliateIds) && targetAffiliateIds.length > 0) {
    commQuery = commQuery.in('affiliate_id', targetAffiliateIds)
  }

  const { data: commissions, error: commError } = await commQuery

  if (commError) {
    return NextResponse.json({ error: 'Failed to query commissions' }, { status: 500 })
  }

  // Fetch affiliates
  let affQuery = supabase
    .from('affiliates')
    .select('id, name, email, referral_code, stripe_global_payout_recipient_id, payout_onboarding_status, payouts_enabled')

  if (Array.isArray(targetAffiliateIds) && targetAffiliateIds.length > 0) {
    affQuery = affQuery.in('id', targetAffiliateIds)
  }

  const { data: affiliates, error: affError } = await affQuery

  if (affError) {
    return NextResponse.json({ error: 'Failed to query affiliates' }, { status: 500 })
  }

  const affiliateMap = new Map((affiliates || []).map(a => [a.id, a]))

  // Group pending commissions by affiliate
  const batches = new Map<string, {
    affiliate: (typeof affiliates)[0]
    commission_ids: string[]
    total_cents: number
    period_months: string[]
  }>()

  for (const c of commissions || []) {
    const aff = affiliateMap.get(c.affiliate_id)
    if (!aff) continue

    const cents = dollarsToCents(Number(c.amount || 0))
    if (!batches.has(c.affiliate_id)) {
      batches.set(c.affiliate_id, {
        affiliate: aff,
        commission_ids: [c.id],
        total_cents: cents,
        period_months: [c.period_month],
      })
    } else {
      const entry = batches.get(c.affiliate_id)!
      entry.commission_ids.push(c.id)
      entry.total_cents += cents
      if (!entry.period_months.includes(c.period_month)) {
        entry.period_months.push(c.period_month)
      }
    }
  }

  const results: Array<{
    affiliate_id: string
    name: string
    amount_cents: number
    amount_formatted: string
    commission_count: number
    payout_id?: string
    outbound_payment_id?: string
    status: 'initiated' | 'skipped' | 'failed'
    reason?: string
  }> = []

  const currentYearMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  for (const [affId, batch] of batches.entries()) {
    const aff = batch.affiliate

    // 1. Validation: $20 minimum (2000 cents)
    if (batch.total_cents < 2000) {
      results.push({
        affiliate_id: affId,
        name: aff.name,
        amount_cents: batch.total_cents,
        amount_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_ids.length,
        status: 'skipped',
        reason: `Below $20 minimum threshold (${formatCentsToMoney(batch.total_cents)})`,
      })
      continue
    }

    // 2. Validation: Recipient & Payouts Enabled
    if (!aff.stripe_global_payout_recipient_id || !aff.payouts_enabled || aff.payout_onboarding_status !== 'ready_for_payouts') {
      results.push({
        affiliate_id: affId,
        name: aff.name,
        amount_cents: batch.total_cents,
        amount_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_ids.length,
        status: 'skipped',
        reason: `Recipient not ready for payouts (${aff.payout_onboarding_status})`,
      })
      continue
    }

    // 3. Deterministic Idempotency Key
    const idempotencyKey = `payout_${aff.id}_${currentYearMonth}_${batch.total_cents}_${batch.commission_ids.sort().join('_')}`

    // Check if payout with idempotency key already exists
    const { data: existingPayout } = await supabase
      .from('affiliate_payouts')
      .select('id, status, stripe_outbound_payment_id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingPayout) {
      results.push({
        affiliate_id: affId,
        name: aff.name,
        amount_cents: batch.total_cents,
        amount_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_ids.length,
        payout_id: existingPayout.id,
        outbound_payment_id: existingPayout.stripe_outbound_payment_id || undefined,
        status: 'initiated',
        reason: 'Reused existing payout execution record (idempotent)',
      })
      continue
    }

    try {
      let outboundPaymentId = `op_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      let paymentStatus = 'processing'

      // If not simulation and Stripe key is present, execute via Stripe Global Payouts API
      if (!body.test_mode_simulation && process.env.STRIPE_SECRET_KEY) {
        try {
          const payment = await createOutboundPayment({
            recipientAccountId: aff.stripe_global_payout_recipient_id,
            amountCents: batch.total_cents,
            currency: 'usd',
            idempotencyKey,
            description: `PurePulse Affiliate Commission Payout (${currentYearMonth})`,
          })
          outboundPaymentId = payment.id
          paymentStatus = payment.status || 'processing'
        } catch (apiErr: unknown) {
          const msg = apiErr instanceof Error ? apiErr.message : 'Stripe Outbound Payment creation failed'
          console.error(`[payouts/execute] Affiliate ${aff.id} Stripe error:`, apiErr)

          results.push({
            affiliate_id: affId,
            name: aff.name,
            amount_cents: batch.total_cents,
            amount_formatted: formatCentsToMoney(batch.total_cents),
            commission_count: batch.commission_ids.length,
            status: 'failed',
            reason: msg,
          })
          continue
        }
      }

      // Record payout in database
      const { data: payoutRecord, error: insertError } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: aff.id,
          stripe_outbound_payment_id: outboundPaymentId,
          amount_cents: batch.total_cents,
          currency: 'usd',
          status: paymentStatus === 'posted' ? 'posted' : 'processing',
          idempotency_key: idempotencyKey,
          commission_ids: batch.commission_ids,
          metadata: {
            simulation: !!body.test_mode_simulation,
            periods: batch.period_months,
          },
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[payouts/execute] DB insert error:', insertError)
        results.push({
          affiliate_id: affId,
          name: aff.name,
          amount_cents: batch.total_cents,
          amount_formatted: formatCentsToMoney(batch.total_cents),
          commission_count: batch.commission_ids.length,
          status: 'failed',
          reason: 'Failed to record payout transaction in database',
        })
        continue
      }

      results.push({
        affiliate_id: affId,
        name: aff.name,
        amount_cents: batch.total_cents,
        amount_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_ids.length,
        payout_id: payoutRecord?.id,
        outbound_payment_id: outboundPaymentId,
        status: 'initiated',
      })
    } catch (err: unknown) {
      console.error('[payouts/execute] Unexpected error:', err)
      results.push({
        affiliate_id: affId,
        name: aff.name,
        amount_cents: batch.total_cents,
        amount_formatted: formatCentsToMoney(batch.total_cents),
        commission_count: batch.commission_ids.length,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'Unknown execution error',
      })
    }
  }

  const successCount = results.filter(r => r.status === 'initiated').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const skippedCount = results.filter(r => r.status === 'skipped').length

  return NextResponse.json({
    summary: {
      total_processed: results.length,
      success_count: successCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
    },
    results,
  })
}
