import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, PLAN_CENTS } from '@/lib/stripe'
import { generatePortalLink } from '@/lib/portal-auth-link'
import { Resend } from 'resend'
import type Stripe from 'stripe'
import { bootstrapCampaign } from '@/lib/campaign-bootstrap'
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
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = adminSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

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
      .select('id, plan, client_id, clients(name, email, referral_code)')
      .eq('id', contractId)
      .single()

    if (!contract) return NextResponse.json({ ok: true })

    // In subscription mode, Stripe automatically creates and returns the subscription ID.
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

    // Bootstrap campaign + milestones (non-fatal)
    try {
      await bootstrapCampaign(supabase, contractId, contract.client_id, client?.name ?? 'Client', contract.plan as Plan)
    } catch (err) {
      console.error('[stripe webhook] campaign bootstrap threw:', err)
    }

    // Auto-record a referral commission if this client was attributed to one.
    // Commission = the plan's recurring monthly rate (the "first payment" is
    // deposit + first month combined; this is that first payment minus the
    // deposit portion).
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
            const { error: refEmailErr } = await resend.emails.send({
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
            if (refEmailErr) console.error('[stripe webhook] referral email error:', refEmailErr)
          } catch (err) {
            console.error('[stripe webhook] referral email threw:', err)
          }
        }
      } catch (err) {
        console.error('[stripe webhook] referral commission error:', err)
      }
    }

    try {
      const { error: adminEmailErr } = await resend.emails.send({
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
      if (adminEmailErr) console.error('[stripe webhook] admin email error:', adminEmailErr)
    } catch (err) {
      console.error('[stripe webhook] admin email threw:', err)
    }

    if (client?.email) {
      // Generate a portal sign-in link and link the account to this client record
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

      // Get Stripe invoice PDF URL
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
        const { error: clientEmailErr } = await resend.emails.send({
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
                  We'll be in touch within 1 business day to schedule your kick-off call.
                </p>

                <div style="background:#f9f9f9;border-radius:10px;padding:20px 24px;margin-bottom:24px">
                  <p style="margin:0 0 4px;font-size:12px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Your Plan</p>
                  <p style="margin:0;font-weight:700;font-size:18px;text-transform:capitalize">${contract.plan}</p>
                </div>

                ${stripeInvoiceUrl ? `
                <div style="margin-bottom:20px">
                  <a href="${stripeInvoiceUrl}" style="display:inline-block;background:#f9f9f9;border:1px solid #e5e7eb;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                    📄 Download Your Invoice
                  </a>
                </div>` : ''}

                <div style="background:#f8f8ff;border-radius:12px;padding:24px;margin:24px 0;border:1px solid #e8e4ff">
                  <h3 style="margin:0 0 8px;color:#07070D;font-size:16px">📋 Set up your client portal</h3>
                  <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6">
                    Track your project progress, send us messages, view invoices, and submit support tickets — all in one place.
                    Click below to create your account with a password.
                  </p>
                  <a href="${portalSignupUrl}" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
                    Create Your Portal Account →
                  </a>
                  <p style="margin:12px 0 0;color:#999;font-size:12px">Use this email: <strong>${client.email}</strong></p>
                </div>

                <div style="background:#f9f9f9;border-radius:10px;padding:16px 20px;margin-bottom:24px">
                  <p style="margin:0 0 4px;font-size:12px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">What happens next</p>
                  <ol style="margin:8px 0 0;padding-left:20px;color:#374151;line-height:2;font-size:14px">
                    <li>Create your portal account above</li>
                    <li>We'll reach out within 1 business day to schedule kick-off</li>
                    <li>Content collection &amp; discovery call</li>
                    <li>Build begins — delivery in 2–4 weeks</li>
                  </ol>
                </div>

                <p style="color:#555;line-height:1.7">Questions? Just reply to this email.</p>
                <p style="color:#555">— Matty<br><span style="font-size:13px;color:#999">PurePulse · Web Design &amp; Development</span></p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                <p style="font-size:12px;color:#999;margin:0">
                  <a href="${appUrl}/sign/${contractId}" style="color:#999">View your signed contract</a>
                </p>
              </div>
            </div>
          `,
        })
        if (clientEmailErr) console.error('[stripe webhook] client email error:', clientEmailErr)
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

  // Stripe Invoice paid — mark our invoice record as paid
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

  return NextResponse.json({ ok: true })
}
