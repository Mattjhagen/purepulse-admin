import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getStripe, DEPOSIT_CENTS, PLAN_CENTS, PLAN_LABELS, getPlanPriceId, getDepositPriceId } from '@/lib/stripe'
import type { Plan } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminSupabase()

  let contract: any = null
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, plan, monthly_rate, status, payment_status, clients(name, email)')
      .eq('signature_token', token)
      .single()

    if (data) contract = data
  } catch (err) {
    console.warn('[checkout/[token]] DB fetch warning:', err)
  }

  // Fallback mock contract if testing or db unavailable
  if (!contract) {
    contract = {
      id: `ct_${token}`,
      plan: 'growth',
      monthly_rate: 50,
      status: 'signed',
      payment_status: 'unpaid',
      clients: { name: 'Client Test', email: 'test@example.com' },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients
  const urlPlan = _req.nextUrl.searchParams.get('plan') as Plan | null
  const plan = urlPlan || (contract.plan as Plan) || 'growth'
  const planLabel = PLAN_LABELS[plan] ?? 'Growth'
  const planCents = PLAN_CENTS[plan] ?? (contract.monthly_rate ? Math.round(contract.monthly_rate * 100) : 5000)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const planPriceId = getPlanPriceId(plan)
  const depositPriceId = getDepositPriceId()
  const firstInvoiceCents = DEPOSIT_CENTS + planCents

  // Line items support pre-created Stripe price IDs or dynamic inline price_data
  const lineItems: any[] = []

  if (depositPriceId) {
    lineItems.push({ price: depositPriceId, quantity: 1 })
  } else {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'PurePulse Website Build Deposit',
          description: 'One-time initial design & development deposit ($150.00)',
        },
        unit_amount: DEPOSIT_CENTS,
      },
      quantity: 1,
    })
  }

  if (planPriceId) {
    lineItems.push({ price: planPriceId, quantity: 1 })
  } else {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `PurePulse ${planLabel} Plan`,
          description: `Monthly website hosting & maintenance (${planLabel})`,
        },
        unit_amount: planCents,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: client?.email,
      client_reference_id: contract.id,
      metadata: {
        contract_id: contract.id,
        signature_token: token,
        plan,
        plan_cents: String(planCents),
      },
      line_items: lineItems,
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

    try {
      await supabase
        .from('contracts')
        .update({
          stripe_checkout_session_id: session.id,
          payment_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id)
    } catch {
      // ignore
    }

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (stripeErr) {
    console.warn('[checkout/[token]] Stripe session notice:', stripeErr)
    // Return checkout mock url if test environment without secret key
    const fallbackCheckoutUrl = `${appUrl}/checkout/mock?token=${token}&plan=${plan}`
    return NextResponse.json({
      url: fallbackCheckoutUrl,
      warning: stripeErr instanceof Error ? stripeErr.message : 'Stripe checkout fallback',
    })
  }
}
