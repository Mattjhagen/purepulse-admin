import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, DEPOSIT_CENTS, PLAN_CENTS, PLAN_LABELS, getPlanPriceId, getDepositPriceId } from '@/lib/stripe'
import type { Plan } from '@/lib/types'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminSupabase()

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, plan, monthly_rate, status, payment_status, clients(name, email)')
    .eq('signature_token', token)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
  }

  if (contract.status !== 'signed') {
    return NextResponse.json({ error: 'Contract must be signed before payment.' }, { status: 400 })
  }

  if (contract.payment_status === 'paid') {
    return NextResponse.json({ error: 'This contract has already been paid.' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients
  const plan = contract.plan as Plan
  const planLabel = PLAN_LABELS[plan] ?? plan
  const planCents = PLAN_CENTS[plan] ?? Math.round(contract.monthly_rate * 100)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const planPriceId = getPlanPriceId(plan)
  const depositPriceId = getDepositPriceId()

  if (!planPriceId || !depositPriceId) {
    return NextResponse.json(
      { error: 'Stripe price configuration missing. Contact support.' },
      { status: 500 }
    )
  }

  const firstInvoiceCents = DEPOSIT_CENTS + planCents

  // Subscription mode: Stripe charges deposit + month 1 today on the first invoice,
  // then auto-bills the recurring plan price every month from month 2.
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: client?.email,
    client_reference_id: contract.id,
    metadata: {
      contract_id: contract.id,
      signature_token: token,
      plan,
      plan_cents: String(planCents),
    },
    line_items: [
      {
        // One-time deposit — charged on first invoice only
        price: depositPriceId,
        quantity: 1,
      },
      {
        // Recurring plan price — becomes the subscription, billed monthly
        price: planPriceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        contract_id: contract.id,
        plan,
        plan_cents: String(planCents),
      },
    },
    payment_method_types: ['card'],
    allow_promotion_codes: false,
    success_url: `${appUrl}/checkout/success?token=${token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/sign/${token}?cancelled=true`,
    custom_text: {
      submit: {
        message: `Today's charge: $${(firstInvoiceCents / 100).toFixed(2)} ($150 deposit + first month). Monthly billing of $${(planCents / 100).toFixed(2)} starts next month.`,
      },
    },
  })

  await supabase
    .from('contracts')
    .update({
      stripe_checkout_session_id: session.id,
      payment_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', contract.id)

  return NextResponse.json({ url: session.url })
}
