import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { z } from 'zod'
import { adminSupabase } from '@/lib/supabase'
import { getApiUser } from '@/lib/api-auth'
import { resolveAuthenticatedAffiliate } from '@/lib/affiliate-auth'
import {
  assertIssuingProvisioningEnabled,
  DEFAULT_MONTHLY_SPEND_LIMIT_CENTS,
  getIssuingFinancialAccountId,
  getIssuingStripe,
} from '@/lib/stripe-issuing'

const requestSchema = z.object({
  phone: z.string().trim().min(7).max(30),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().length(2).transform(value => value.toUpperCase()),
    postal_code: z.string().trim().min(5).max(10),
    country: z.literal('US'),
  }),
})

export async function POST(req: NextRequest) {
  try {
    assertIssuingProvisioningEnabled()
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Issuing disabled' }, { status: 503 })
  }

  const user = await getApiUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid cardholder information' }, { status: 400 })

  const admin = adminSupabase()
  const { affiliate } = await resolveAuthenticatedAffiliate(user, admin)
  if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
  if (affiliate.status !== 'active') return NextResponse.json({ error: 'Affiliate is not active' }, { status: 403 })

  const approvedAt = (affiliate as unknown as { issuing_approved_at?: string | null }).issuing_approved_at
  if (!approvedAt) return NextResponse.json({ error: 'Affiliate is not approved for a card' }, { status: 403 })

  const { data: existing } = await admin
    .from('affiliate_issuing_accounts')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .maybeSingle()
  if (existing?.stripe_card_id) {
    return NextResponse.json({ error: 'A card has already been provisioned' }, { status: 409 })
  }

  const stripe = getIssuingStripe()
  const nameParts = affiliate.name.trim().split(/\s+/)
  const firstName = nameParts.shift() || 'PurePulse'
  const lastName = nameParts.join(' ') || 'Partner'

  try {
    const cardholder = existing?.stripe_cardholder_id
      ? await stripe.issuing.cardholders.retrieve(existing.stripe_cardholder_id)
      : await stripe.issuing.cardholders.create({
          type: 'individual',
          name: affiliate.name,
          email: affiliate.email,
          phone_number: parsed.data.phone,
          billing: { address: parsed.data.address },
          individual: { first_name: firstName, last_name: lastName },
          metadata: { affiliate_id: affiliate.id, environment: 'test' },
          spending_controls: {
            spending_limits: [{ amount: DEFAULT_MONTHLY_SPEND_LIMIT_CENTS, interval: 'monthly' }],
            blocked_categories: [
              'automated_cash_disburse', 'manual_cash_disburse', 'betting_casino_gambling',
              'non_fi_money_orders', 'non_fi_stored_value_card_purchase_load',
              'security_brokers_dealers', 'wires_money_orders',
            ],
          },
        }, { idempotencyKey: `issuing-cardholder-${affiliate.id}-test` })

    const { data: account, error: accountError } = await admin
      .from('affiliate_issuing_accounts')
      .upsert({
        affiliate_id: affiliate.id,
        stripe_cardholder_id: cardholder.id,
        monthly_spend_limit_cents: DEFAULT_MONTHLY_SPEND_LIMIT_CENTS,
        environment: 'test',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'affiliate_id' })
      .select('*')
      .single()
    if (accountError || !account) throw new Error('Failed to persist Issuing cardholder')

    await admin.from('affiliates').update({
      stripe_issuing_cardholder_id: cardholder.id,
      updated_at: new Date().toISOString(),
    }).eq('id', affiliate.id)

    // Stripe's 2026-07-29.dahlia sandbox requires the v2 money-management
    // Financial Account field. stripe-node's generated types still expose the
    // legacy `financial_account` name, so keep this narrow compatibility type
    // until the SDK schema catches up with the API version.
    const cardParams: Stripe.Issuing.CardCreateParams & { financial_account_v2: string } = {
      cardholder: cardholder.id,
      currency: 'usd',
      financial_account_v2: getIssuingFinancialAccountId(),
      type: 'virtual',
      status: 'inactive',
      metadata: { affiliate_id: affiliate.id, environment: 'test' },
      spending_controls: {
        spending_limits: [{ amount: DEFAULT_MONTHLY_SPEND_LIMIT_CENTS, interval: 'monthly' }],
      },
    }
    const card = await stripe.issuing.cards.create(
      cardParams,
      { idempotencyKey: `issuing-card-${affiliate.id}-test` },
    )

    await admin.from('affiliate_issuing_accounts').update({
      stripe_card_id: card.id,
      card_status: card.status,
      card_brand: card.brand,
      card_last4: card.last4,
      updated_at: new Date().toISOString(),
    }).eq('id', account.id)
    await admin.from('affiliates').update({
      stripe_issuing_card_id: card.id,
      updated_at: new Date().toISOString(),
    }).eq('id', affiliate.id)

    return NextResponse.json({
      card: { id: card.id, status: card.status, brand: card.brand, last4: card.last4 },
    }, { status: 201 })
  } catch (error) {
    console.error('[issuing provision] failed:', error)
    return NextResponse.json({ error: 'Unable to provision sandbox card' }, { status: 502 })
  }
}
