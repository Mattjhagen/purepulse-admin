import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/require-admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const { amount } = await req.json()

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
  }

  const supabase = adminSupabase()
  const { data: referral, error } = await supabase
    .from('referrals')
    .select('id, total_paid, stripe_account_id, stripe_payouts_enabled')
    .eq('id', id)
    .single()

  if (error || !referral) {
    return NextResponse.json({ error: 'Referrer not found.' }, { status: 404 })
  }
  if (!referral.stripe_account_id || !referral.stripe_payouts_enabled) {
    return NextResponse.json({ error: 'This referrer has not completed payout setup yet.' }, { status: 400 })
  }

  const stripe = getStripe()
  let transfer
  try {
    transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: referral.stripe_account_id,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe transfer failed.' }, { status: 500 })
  }

  const { error: updateErr } = await supabase.from('referrals').update({
    total_paid: referral.total_paid + amount,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, transferId: transfer.id })
}
