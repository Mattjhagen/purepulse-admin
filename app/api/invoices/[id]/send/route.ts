import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

// Returns the Stripe rendering template id to use for a given invoice type.
// Set STRIPE_TEMPLATE_MONTHLY / STRIPE_TEMPLATE_DEPOSIT / STRIPE_TEMPLATE_PROJECT
// in Vercel env vars. Values look like invtpl_xxx (from Stripe Dashboard URL).
function templateId(invoiceType: string | null): string | undefined {
  if (invoiceType === 'deposit') return process.env.STRIPE_TEMPLATE_DEPOSIT ?? undefined
  if (invoiceType === 'project') return process.env.STRIPE_TEMPLATE_PROJECT ?? undefined
  return process.env.STRIPE_TEMPLATE_MONTHLY ?? undefined
}

async function getOrCreateStripeCustomer(
  stripe: ReturnType<typeof getStripe>,
  clientId: string,
  clientName: string,
  clientEmail: string,
  supabase: ReturnType<typeof adminSupabase>
): Promise<string> {
  // Look up existing Stripe customer from most recent active contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('stripe_customer_id')
    .eq('client_id', clientId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (contract?.stripe_customer_id) return contract.stripe_customer_id

  // Create a new Stripe customer and save it back
  const customer = await stripe.customers.create({
    name: clientName,
    email: clientEmail,
    metadata: { client_id: clientId },
  })

  // Store on the most recent contract so future lookups find it
  const { data: latestContract } = await supabase
    .from('contracts')
    .select('id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestContract) {
    await supabase
      .from('contracts')
      .update({ stripe_customer_id: customer.id })
      .eq('id', latestContract.id)
  }

  return customer.id
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  // Load invoice with client and line items
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(id, name, email), invoice_line_items(description, quantity, unit_price, total, sort_order)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.total <= 0) return NextResponse.json({ error: 'Invoice total must be greater than 0' }, { status: 400 })

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
  if (!client?.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const stripe = getStripe()

  // If already sent via Stripe, just return the existing invoice URL
  if (invoice.stripe_invoice_id) {
    const existing = await stripe.invoices.retrieve(invoice.stripe_invoice_id)
    return NextResponse.json({ ok: true, invoiceUrl: existing.hosted_invoice_url })
  }

  // Get or create Stripe customer
  const stripeCustomerId = await getOrCreateStripeCustomer(
    stripe,
    client.id,
    client.name,
    client.email,
    supabase
  )

  // Determine rendering template
  const tmpl = templateId(invoice.type ?? null)

  // Create Stripe Invoice
  const stripeInvoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: 'send_invoice',
    days_until_due: 30,
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
    ...(tmpl ? { rendering: { template: tmpl } } : {}),
  })

  // Add line items
  const lineItems = (Array.isArray(invoice.invoice_line_items) ? invoice.invoice_line_items : [])
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  if (lineItems.length === 0) {
    // Fallback: single line item from the invoice total
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: stripeInvoice.id,
      description: `Invoice ${invoice.invoice_number}`,
      amount: Math.round(invoice.total * 100),
      currency: 'usd',
    })
  } else {
    for (const item of lineItems as { description: string; quantity: number; unit_price: number; total: number }[]) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        description: item.description,
        amount: Math.round(item.unit_price * item.quantity * 100),
        currency: 'usd',
      })
    }
  }

  // Finalize and send — Stripe emails the client using the template
  await stripe.invoices.finalizeInvoice(stripeInvoice.id)
  const sent = await stripe.invoices.sendInvoice(stripeInvoice.id)

  // Persist stripe_invoice_id and update status
  await supabase
    .from('invoices')
    .update({
      stripe_invoice_id: stripeInvoice.id,
      stripe_payment_link: sent.hosted_invoice_url,
      status: 'sent',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ ok: true, invoiceUrl: sent.hosted_invoice_url })
}
