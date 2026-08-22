import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { adminSupabase } from '@/lib/supabase'
import { getIssuingStripe } from '@/lib/stripe-issuing'

export const runtime = 'nodejs'

function objectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_ISSUING_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing webhook signature configuration' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getIssuingStripe().webhooks.constructEvent(await req.text(), signature, secret)
  } catch (error) {
    console.error('[issuing webhook] signature verification failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  if (event.livemode) {
    return NextResponse.json({ error: 'Live Issuing events are disabled' }, { status: 400 })
  }

  const admin = adminSupabase()
  const { data: claimed, error: claimError } = await admin
    .from('stripe_issuing_webhook_events')
    .insert({ id: event.id, type: event.type, livemode: event.livemode, status: 'processing' })
    .select('id')
    .maybeSingle()

  if (claimError) {
    if (claimError.code === '23505') return NextResponse.json({ ok: true, duplicate: true })
    console.error('[issuing webhook] failed to claim event:', claimError)
    return NextResponse.json({ error: 'Unable to claim webhook event' }, { status: 500 })
  }
  if (!claimed) return NextResponse.json({ error: 'Unable to claim webhook event' }, { status: 500 })

  try {
    const object = event.data.object

    if (event.type === 'issuing_card.created' || event.type === 'issuing_card.updated') {
      const card = object as Stripe.Issuing.Card
      const cardholderId = objectId(card.cardholder)
      if (cardholderId) {
        await admin.from('affiliate_issuing_accounts').update({
          stripe_card_id: card.id,
          card_status: card.status,
          card_brand: card.brand,
          card_last4: card.last4,
          updated_at: new Date().toISOString(),
        }).eq('stripe_cardholder_id', cardholderId)
      }
    }

    if (event.type === 'issuing_transaction.created' || event.type === 'issuing_transaction.updated') {
      const transaction = object as Stripe.Issuing.Transaction
      const cardId = objectId(transaction.card)
      const cardholderId = objectId(transaction.cardholder)
      if (cardId && cardholderId) {
        const { data: account } = await admin
          .from('affiliate_issuing_accounts')
          .select('affiliate_id')
          .eq('stripe_cardholder_id', cardholderId)
          .maybeSingle()

        if (account) {
          await admin.from('affiliate_issuing_transactions').upsert({
            id: transaction.id,
            affiliate_id: account.affiliate_id,
            stripe_card_id: cardId,
            stripe_cardholder_id: cardholderId,
            type: transaction.type,
            amount_cents: transaction.amount,
            currency: transaction.currency,
            merchant_name: transaction.merchant_data?.name || null,
            merchant_category: transaction.merchant_data?.category || null,
            status: transaction.type,
            authorized_at: transaction.created ? new Date(transaction.created * 1000).toISOString() : null,
            created_at: new Date(transaction.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            raw: JSON.parse(JSON.stringify(transaction)),
          }, { onConflict: 'id' })
        }
      }
    }

    await admin.from('stripe_issuing_webhook_events').update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      error: null,
    }).eq('id', event.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook processing error'
    console.error('[issuing webhook] handler failed:', message)
    await admin.from('stripe_issuing_webhook_events').update({
      status: 'failed', error: message, processed_at: new Date().toISOString(),
    }).eq('id', event.id)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

