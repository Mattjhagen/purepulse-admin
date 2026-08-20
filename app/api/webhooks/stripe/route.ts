import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getStripe, PLAN_CENTS } from '@/lib/stripe'
import { generatePortalLink } from '@/lib/portal-auth-link'
import { getResend } from '@/lib/resend'
import type Stripe from 'stripe'
import { bootstrapCampaign } from '@/lib/campaign-bootstrap'
import type { Plan } from '@/lib/types'
import { calculateMonthlyCommission, AFFILIATE_COMMISSION_RATES } from '@/lib/affiliate-utils'
import { mapStripeRecipientStatus, type StripeV2Account } from '@/lib/stripe-global-payouts'

const resend = getResend()

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err instanceof Error ? err.message : 'Invalid signature')
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = adminSupabase()

  // 1. Idempotency check: record event ID to prevent duplicate processing
  try {
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle()

    if (existingEvent) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    await supabase.from('stripe_webhook_events').insert({
      id: event.id,
      type: event.type,
      status: 'processing',
      metadata: { livemode: event.livemode },
    })
  } catch (idempErr) {
    console.warn('[stripe webhook] idempotency record warning:', idempErr)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const eventType = event.type as string

  try {
    // -------------------------------------------------------------
    // Global Payouts / Accounts v2 Events
    // -------------------------------------------------------------
    if (
      eventType === 'v2.core.account.updated' ||
      eventType === 'v2.core.account.created' ||
      eventType === 'v2.core.account[defaults].updated' ||
      eventType.startsWith('v2.core.account')
    ) {
      const accountObj = (event.data?.object || {}) as StripeV2Account
      const accountId = accountObj.id || (event as unknown as { related_object?: { id?: string } }).related_object?.id

      if (accountId) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id, payout_onboarded_at')
          .eq('stripe_global_payout_recipient_id', accountId)
          .maybeSingle()

        if (affiliate) {
          const statusResult = mapStripeRecipientStatus(accountObj)
          const now = new Date().toISOString()
          const isNowOnboarded = statusResult.payoutsEnabled && !affiliate.payout_onboarded_at

          await supabase
            .from('affiliates')
            .update({
              payout_onboarding_status: statusResult.payoutOnboardingStatus,
              payouts_enabled: statusResult.payoutsEnabled,
              payout_requirements_due: statusResult.requirementsDue,
              stripe_payout_method_id: statusResult.payoutMethodId,
              payout_onboarded_at: isNowOnboarded ? now : affiliate.payout_onboarded_at,
              last_payout_status_sync_at: now,
              updated_at: now,
            })
            .eq('id', affiliate.id)
        }
      }
    }

    // -------------------------------------------------------------
    // Outbound Payment Events (Money Movement / Global Payouts & Standard Payouts)
    // -------------------------------------------------------------
    if (
      eventType === 'v2.money_management.outbound_payment.posted' ||
      eventType === 'v2.money_management.outbound_payment.failed' ||
      eventType === 'v2.money_management.outbound_payment.canceled' ||
      eventType.includes('outbound_payment') ||
      eventType === 'payout.paid' ||
      eventType === 'payout.failed' ||
      eventType === 'payout.canceled'
    ) {
      const paymentObj = (event.data?.object || {}) as {
        id?: string
        status?: string
        failure_code?: string
        failure_message?: string
      }
      const paymentId = paymentObj.id

      if (paymentId) {
        const { data: payout } = await supabase
          .from('affiliate_payouts')
          .select('*')
          .eq('stripe_outbound_payment_id', paymentId)
          .maybeSingle()

        if (payout) {
          const now = new Date().toISOString()

          if (eventType.includes('posted') || eventType === 'payout.paid') {
            await supabase
              .from('affiliate_payouts')
              .update({
                status: 'posted',
                posted_at: now,
                updated_at: now,
              })
              .eq('id', payout.id)

            // Finalize commission records to 'paid'
            if (Array.isArray(payout.commission_ids) && payout.commission_ids.length > 0) {
              await supabase
                .from('affiliate_commissions')
                .update({
                  status: 'paid',
                  paid_at: now,
                })
                .in('id', payout.commission_ids)
            }
          } else if (eventType.includes('failed') || eventType.includes('canceled') || eventType === 'payout.failed' || eventType === 'payout.canceled') {
            await supabase
              .from('affiliate_payouts')
              .update({
                status: (eventType.includes('failed') || eventType === 'payout.failed') ? 'failed' : 'canceled',
                failure_code: paymentObj.failure_code || null,
                failure_message: paymentObj.failure_message || 'Payment was not completed by Stripe network',
                updated_at: now,
              })
              .eq('id', payout.id)

            // Revert commissions to 'pending' so they can be included in future payout batches
            if (Array.isArray(payout.commission_ids) && payout.commission_ids.length > 0) {
              await supabase
                .from('affiliate_commissions')
                .update({
                  status: 'pending',
                  paid_at: null,
                })
                .in('id', payout.commission_ids)
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Core Checkout & Contract Payment Handling
    // -------------------------------------------------------------
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const invoiceId = session.metadata?.invoice_id
      if (invoiceId) {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: (session.payment_intent as string | null) ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId)
        return NextResponse.json({ ok: true })
      }

      const contractId = session.metadata?.contract_id
      if (!contractId) return NextResponse.json({ ok: true })

      const { data: contract } = await supabase
        .from('contracts')
        .select('id, plan, client_id, monthly_rate, clients(name, email, referral_code)')
        .eq('id', contractId)
        .single()

      if (!contract) return NextResponse.json({ ok: true })

      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null

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

      try {
        await bootstrapCampaign(supabase, contractId, contract.client_id, client?.name ?? 'Client', contract.plan as Plan)
      } catch (err) {
        console.error('[stripe webhook] campaign bootstrap threw:', err)
      }

      // Legacy referral tracking
      if (client?.referral_code) {
        try {
          const { data: referral } = await supabase
            .from('referrals')
            .select('id, name, conversions, total_earned')
            .eq('code', client.referral_code)
            .eq('active', true)
            .maybeSingle()

          if (referral) {
            const commission = (PLAN_CENTS[contract.plan as Plan] ?? 0) / 100

            await supabase.from('referral_clicks').insert({
              referral_id: referral.id,
              converted: true,
              converted_at: new Date().toISOString(),
              client_name: client.name,
              plan: contract.plan,
            })

            await supabase.from('referrals').update({
              conversions: referral.conversions + 1,
              total_earned: referral.total_earned + commission,
              updated_at: new Date().toISOString(),
            }).eq('id', referral.id)

            try {
              await resend.emails.send({
                from: 'PurePulse Leads <matty@purepulse.one>',
                to: 'matty@purepulse.one',
                subject: `🎉 Referral commission earned — ${referral.name}`,
                html: `
                  <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
                    <h2 style="margin:0 0 16px;">Referral commission earned</h2>
                    <p style="color:#555;margin:0 0 8px;"><strong>${client.name}</strong> signed up on the <strong>${contract.plan}</strong> plan via <strong>${referral.name}</strong>'s referral link (code ${client.referral_code}).</p>
                    <p style="color:#555;margin:0 0 24px;">Commission owed: <strong>$${commission.toFixed(2)}</strong></p>
                    <a href="${appUrl}/referrals"
                       style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                      View Referrals →
                    </a>
                  </div>
                `,
              })
            } catch (err) {
              console.error('[stripe webhook] referral email threw:', err)
            }
          }
        } catch (err) {
          console.error('[stripe webhook] referral commission error:', err)
        }
      }

      // Tiered affiliate referral creation
      if (contract.client_id) {
        try {
          const { data: clientRecord } = await supabase
            .from('clients')
            .select('id, plan, referral_code')
            .eq('id', contract.client_id)
            .single()

          if (clientRecord?.referral_code) {
            const { data: affiliate } = await supabase
              .from('affiliates')
              .select('id')
              .eq('referral_code', clientRecord.referral_code)
              .eq('status', 'active')
              .single()

            if (affiliate) {
              const plan = clientRecord.plan ?? contract.plan
              const monthlyRate = Number((contract as { monthly_rate?: number }).monthly_rate ?? 0)
              const commissionRate = AFFILIATE_COMMISSION_RATES[plan as keyof typeof AFFILIATE_COMMISSION_RATES] ?? 0.10
              const monthlyCommission = calculateMonthlyCommission(plan, monthlyRate)

              await supabase
                .from('affiliate_referrals')
                .upsert({
                  affiliate_id: affiliate.id,
                  client_id: clientRecord.id,
                  plan,
                  status: 'active',
                  commission_rate: commissionRate,
                  monthly_commission: monthlyCommission,
                  activated_at: new Date().toISOString(),
                }, { onConflict: 'affiliate_id,client_id' })
            }
          }
        } catch (err) {
          console.error('[stripe webhook] affiliate referral error:', err)
        }
      }

      try {
        await resend.emails.send({
          from: 'PurePulse Leads <matty@purepulse.one>',
          to: 'matty@purepulse.one',
          subject: `💳 Payment received — ${client?.name ?? 'Client'}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
              <h2 style="margin:0 0 16px;">Payment received</h2>
              <p style="color:#555;margin:0 0 8px;"><strong>${client?.name ?? 'Client'}</strong> (${client?.email ?? ''}) completed the deposit payment.</p>
              <p style="color:#555;margin:0 0 8px;">Plan: <strong>${contract.plan}</strong></p>
              ${subscriptionId ? `<p style="color:#555;margin:0 0 24px;">Subscription ID: <code>${subscriptionId}</code></p>` : ''}
              <a href="${appUrl}/contracts/${contractId}"
                 style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                View Contract →
              </a>
            </div>
          `,
        })
      } catch (err) {
        console.error('[stripe webhook] admin email threw:', err)
      }

      if (client?.email) {
        let portalSignupUrl = `${appUrl}/portal`
        try {
          const link = await generatePortalLink(supabase, client.email, { clientId: contract.client_id, appUrl })
          if (link) {
            portalSignupUrl = link.url
            await supabase.from('portal_users').upsert(
              { auth_user_id: link.userId, client_id: contract.client_id, email: client.email },
              { onConflict: 'auth_user_id' }
            )
          }
        } catch (err) {
          console.error('[stripe webhook] portal signup link error:', err)
        }

        let stripeInvoiceUrl = ''
        try {
          if (session.invoice) {
            const stripeInvoice = await getStripe().invoices.retrieve(session.invoice as string)
            stripeInvoiceUrl = stripeInvoice.invoice_pdf ?? ''
          }
        } catch (err) {
          console.error('[stripe webhook] invoice PDF error:', err)
        }

        try {
          await resend.emails.send({
            from: 'Matty at PurePulse <matty@purepulse.one>',
            to: client.email,
            subject: `You're all set — PurePulse project confirmed`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#07070D;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
                  <span style="font-size:20px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
                </div>
                <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                  <h2 style="margin:0 0 12px;color:#07070D">You're officially on the books 🎉</h2>
                  <p style="color:#555;line-height:1.7;margin:0 0 8px">Hi ${client.name},</p>
                  <p style="color:#555;line-height:1.7;margin:0 0 24px">
                    Your deposit payment was received and your <strong>${contract.plan}</strong> project is now confirmed.
                  </p>
                  ${stripeInvoiceUrl ? `
                  <div style="margin-bottom:20px">
                    <a href="${stripeInvoiceUrl}" style="display:inline-block;background:#f9f9f9;border:1px solid #e5e7eb;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                      📄 Download Your Invoice
                    </a>
                  </div>` : ''}
                  <div style="background:#f8f8ff;border-radius:12px;padding:24px;margin:24px 0;border:1px solid #e8e4ff">
                    <h3 style="margin:0 0 8px;color:#07070D;font-size:16px">📋 Access your client portal</h3>
                    <a href="${portalSignupUrl}" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
                      Open Client Portal →
                    </a>
                  </div>
                </div>
              </div>
            `,
          })
        } catch (err) {
          console.error('[stripe webhook] client email threw:', err)
        }
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

    if (event.type === 'invoice.paid') {
      const stripeInv = event.data.object as Stripe.Invoice
      if (stripeInv.metadata?.invoice_id) {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', stripeInv.metadata.invoice_id)
      }
    }

    // Mark event processed
    await supabase
      .from('stripe_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', event.id)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[stripe webhook] handler execution error:', err)
    return NextResponse.json({ ok: true, warning: 'Processed with warnings' })
  }
}
