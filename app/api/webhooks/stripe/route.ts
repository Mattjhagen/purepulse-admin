import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, PLAN_CENTS, PLAN_LABELS, getPlanPriceId } from '@/lib/stripe'
import { Resend } from 'resend'
import type Stripe from 'stripe'
import type { Plan } from '@/lib/types'

const resend = new Resend(process.env.RESEND_API_KEY)

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = adminSupabase()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const contractId = session.metadata?.contract_id
    const plan = session.metadata?.plan as Plan | undefined
    const planCents = parseInt(session.metadata?.plan_cents ?? '0', 10)

    if (!contractId) return NextResponse.json({ ok: true })

    const { data: contract } = await supabase
      .from('contracts')
      .select('id, plan, clients(name, email)')
      .eq('id', contractId)
      .single()

    if (!contract) return NextResponse.json({ ok: true })

    const customerId = session.customer as string | null
    let subscriptionId: string | null = null

    // Create recurring monthly subscription starting 30 days from now.
    // The card saved via setup_future_usage is attached to the customer.
    if (customerId && plan && planCents > 0) {
      try {
        const paymentIntent = await getStripe().paymentIntents.retrieve(
          session.payment_intent as string
        )
        const paymentMethodId = paymentIntent.payment_method as string | null
        const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
        const priceId = getPlanPriceId(plan)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await (getStripe().subscriptions.create as any)({
          customer: customerId,
          items: priceId
            ? [{ price: priceId }]
            : [
                {
                  price_data: {
                    currency: 'usd',
                    product_data: { name: `PurePulse ${PLAN_LABELS[plan] ?? plan} Plan` },
                    unit_amount: planCents,
                    recurring: { interval: 'month' },
                  },
                },
              ],
          billing_cycle_anchor: thirtyDaysFromNow,
          proration_behavior: 'none',
          default_payment_method: paymentMethodId ?? undefined,
          metadata: { contract_id: contractId, plan },
        })
        subscriptionId = subscription.id
      } catch (err) {
        // Non-fatal: subscription creation failure is logged but doesn't block the deposit confirmation
        console.error('Failed to create subscription after checkout:', err)
      }
    }

    await supabase
      .from('contracts')
      .update({
        payment_status: 'paid',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        deposit_paid_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients

    await resend.emails.send({
      from: 'PurePulse <contracts@login.purepulse.one>',
      to: 'contact@purepulse.one',
      subject: `💳 Payment received — ${client?.name ?? 'Client'}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
          <h2 style="margin:0 0 16px;">Payment received</h2>
          <p style="color:#555;margin:0 0 8px;"><strong>${client?.name ?? 'Client'}</strong> (${client?.email ?? ''}) completed the deposit payment.</p>
          <p style="color:#555;margin:0 0 8px;">Plan: <strong>${contract.plan}</strong></p>
          ${subscriptionId ? `<p style="color:#555;margin:0 0 24px;">Stripe subscription ID: <code>${subscriptionId}</code></p>` : '<p style="color:#d97706;margin:0 0 24px;">⚠ Subscription not created automatically — set up manually in Stripe.</p>'}
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://purepulseadmin.netlify.app'}/contracts/${contractId}"
             style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            View Contract →
          </a>
        </div>
      `,
    })

    if (client?.email) {
      await resend.emails.send({
        from: 'PurePulse <contracts@login.purepulse.one>',
        to: client.email,
        subject: `You're all set — PurePulse project confirmed`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
            <div style="margin-bottom:32px;">
              <span style="font-size:1.25rem;font-weight:700;letter-spacing:-0.02em;">PurePulse</span>
            </div>
            <h2 style="margin:0 0 12px;">You're officially on the books 🎉</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 8px;">Hi ${client.name},</p>
            <p style="color:#555;line-height:1.6;margin:0 0 24px;">
              Your deposit payment was received and your project is now confirmed. We'll be in touch within 1 business day
              to schedule your kick-off and gather any remaining content.
            </p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:0.8125rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your Plan</p>
              <p style="margin:0;font-weight:700;font-size:1.125rem;text-transform:capitalize;">${contract.plan}</p>
            </div>
            <p style="color:#999;font-size:0.8125rem;line-height:1.6;margin:0 0 8px;">
              Questions? Reply to this email or reach us at
              <a href="mailto:contact@purepulse.one" style="color:#555;">contact@purepulse.one</a>.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
            <p style="color:#bbb;font-size:0.75rem;margin:0;">PurePulse · Web Design &amp; Maintenance · purepulse.one</p>
          </div>
        `,
      })
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = (invoice as { subscription?: string }).subscription

    if (subscriptionId) {
      await supabase
        .from('contracts')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
    }
  }

  return NextResponse.json({ ok: true })
}
