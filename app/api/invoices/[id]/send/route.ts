import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

async function sendInvoiceEmail(opts: {
  clientName: string
  clientEmail: string
  invoiceNumber: string
  total: number
  dueDate: string
  paymentLink: string
  appUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return
  const { clientName, clientEmail, invoiceNumber, total, dueDate, paymentLink, appUrl } = opts
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)
  const due = new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PurePulse <matty@purepulse.one>',
      to: clientEmail,
      subject: `Invoice ${invoiceNumber} — ${formatted} due ${due}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;color:#111">
          <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.25rem">PurePulse</h2>
          <p style="color:#666;margin-bottom:2rem;font-size:0.875rem">Invoice from PurePulse</p>

          <p style="margin-bottom:1.5rem">Hi ${clientName},</p>
          <p style="color:#555;margin-bottom:2rem;line-height:1.6">
            A new invoice (<strong>${invoiceNumber}</strong>) for <strong>${formatted}</strong> is ready for you.
            Payment is due by <strong>${due}</strong>.
          </p>

          <a href="${paymentLink}" style="display:inline-block;background:#000;color:#fff;padding:0.875rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;margin-bottom:2rem">
            Pay ${formatted} →
          </a>

          <p style="color:#888;font-size:0.8125rem;margin-bottom:0.5rem">
            You can also view your invoice history in your <a href="${appUrl}/portal" style="color:#000">client portal</a>.
          </p>
          <p style="color:#bbb;font-size:0.75rem">
            If you have questions, reply to this email or reach us at matty@purepulse.one.
          </p>
        </div>
      `,
    }),
  })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.purepulse.one'

  // Load invoice with client
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(name, email)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.total <= 0) return NextResponse.json({ error: 'Invoice total must be greater than 0' }, { status: 400 })

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
  if (!client?.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  // Generate Stripe payment link if not already present
  let paymentLink = invoice.stripe_payment_link
  if (!paymentLink) {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-07-29.dahlia' as never })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: client.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Invoice ${invoice.invoice_number}` },
          unit_amount: Math.round(invoice.total * 100),
        },
        quantity: 1,
      }],
      metadata: { invoice_id: invoice.id },
      success_url: `${appUrl}/portal?tab=invoices&paid=1`,
      cancel_url: `${appUrl}/portal?tab=invoices`,
    })
    paymentLink = session.url!
    await supabase.from('invoices').update({ stripe_payment_link: paymentLink }).eq('id', id)
  }

  // Update status to sent
  await supabase.from('invoices').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id)

  // Email the client
  await sendInvoiceEmail({
    clientName: client.name,
    clientEmail: client.email,
    invoiceNumber: invoice.invoice_number,
    total: invoice.total,
    dueDate: invoice.due_date,
    paymentLink,
    appUrl,
  })

  return NextResponse.json({ ok: true, paymentLink })
}
