import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()
  const body = await req.json().catch(() => ({}))
  const reason: string = body.reason ?? 'Overdue balance'

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (client.suspended) return NextResponse.json({ error: 'Client is already suspended' }, { status: 400 })

  // Load overdue invoices for the email
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, due_date, stripe_payment_link')
    .eq('client_id', id)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  const invoices = overdueInvoices ?? []
  const totalOwed = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const now = new Date()

  const invoiceRows = invoices.map(i => {
    const daysOverdue = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86_400_000)
    return `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${i.invoice_number}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${fmt(i.total)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;color:#ef4444">+${daysOverdue}d overdue</td></tr>`
  }).join('')

  // Suspend the client
  await supabase.from('clients').update({
    suspended: true,
    suspended_at: now.toISOString(),
    suspension_reason: reason,
    updated_at: now.toISOString(),
  }).eq('id', id)

  if (process.env.RESEND_API_KEY) {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'matty@purepulse.one'

    // Client suspension email
    if (client.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PurePulse <matty@purepulse.one>',
          to: client.email,
          subject: '🚫 Your portal access has been suspended',
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;color:#111">
              <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.25rem">PurePulse</h2>
              <p style="color:#666;margin-bottom:2rem;font-size:0.875rem">Account Notice</p>

              <p style="margin-bottom:1rem">Hi ${client.name},</p>

              <div style="background:#fff5f5;border:1px solid #ef4444;border-radius:8px;padding:1rem;margin-bottom:1.5rem">
                <p style="color:#dc2626;font-weight:700;margin-bottom:0.25rem">🚫 Portal access suspended</p>
                <p style="color:#555;font-size:0.875rem;margin:0">
                  Your client portal access has been suspended due to an outstanding balance of <strong>${fmt(totalOwed)}</strong>.
                </p>
              </div>

              ${invoices.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
                <thead><tr>
                  <th style="text-align:left;font-size:0.75rem;color:#999;padding-bottom:6px">Invoice</th>
                  <th style="text-align:right;font-size:0.75rem;color:#999;padding-bottom:6px">Amount</th>
                  <th style="text-align:right;font-size:0.75rem;color:#999;padding-bottom:6px">Status</th>
                </tr></thead>
                <tbody>${invoiceRows}</tbody>
                <tfoot><tr>
                  <td colspan="2" style="padding-top:8px;font-weight:700">Total due</td>
                  <td style="padding-top:8px;font-weight:700;text-align:right;color:#dc2626">${fmt(totalOwed)}</td>
                </tr></tfoot>
              </table>
              ` : ''}

              <p style="color:#555;margin-bottom:1.5rem;line-height:1.6">
                To restore your portal access, please settle your outstanding balance and contact us at
                <a href="mailto:${adminEmail}" style="color:#000">${adminEmail}</a>.
                Access will be restored within 24 hours of payment confirmation.
              </p>

              <a href="mailto:${adminEmail}" style="display:inline-block;background:#000;color:#fff;padding:0.875rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;margin-bottom:2rem">
                Contact us to resolve →
              </a>

              <p style="color:#bbb;font-size:0.75rem">
                If you believe this is an error, please reply to this email immediately.
              </p>
            </div>
          `,
        }),
      })
    }

    // Admin notification
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PurePulse <matty@purepulse.one>',
        to: adminEmail,
        subject: `Client suspended: ${client.name} — ${fmt(totalOwed)} overdue`,
        html: `<p>Client <strong>${client.name}</strong> (${client.email}) has been suspended.<br>Reason: ${reason}<br>Overdue balance: ${fmt(totalOwed)}</p>`,
      }),
    })
  }

  return NextResponse.json({ ok: true, suspended: true, totalOwed })
}

// Unsuspend
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, suspended')
    .eq('id', id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.suspended) return NextResponse.json({ error: 'Client is not suspended' }, { status: 400 })

  await supabase.from('clients').update({
    suspended: false,
    suspended_at: null,
    suspension_reason: null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true, suspended: false })
}
