import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, clients(name, email)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  }
  if (!invoice.total || invoice.total <= 0) {
    return NextResponse.json({ error: 'Invoice total must be greater than zero.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(invoice.clients) ? (invoice.clients as any[])[0] : invoice.clients
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: client?.email,
    metadata: { invoice_id: invoice.id },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Invoice ${invoice.invoice_number}` },
          unit_amount: Math.round(invoice.total * 100),
        },
        quantity: 1,
      },
    ],
    payment_method_types: ['card'],
    success_url: `${appUrl}/portal?tab=invoices&paid=1`,
    cancel_url: `${appUrl}/portal?tab=invoices`,
  })

  const { error: updateErr } = await supabase
    .from('invoices')
    .update({ stripe_payment_link: session.url, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: session.url })
}
