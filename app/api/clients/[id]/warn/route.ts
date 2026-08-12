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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  // Load overdue invoices
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, due_date')
    .eq('client_id', id)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  const invoices = overdueInvoices ?? []
  if (invoices.length === 0) return NextResponse.json({ error: 'No overdue invoices' }, { status: 400 })

  const totalOwed = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const now = new Date()
  const deadlineDate = new Date(now.getTime() + 30 * 86_400_000)
  const deadline = deadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const invoiceRows = invoices.map(i => {
    const daysOverdue = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86_400_000)
    return `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${i.invoice_number}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${fmt(i.total)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;color:#ef4444">+${daysOverdue}d</td></tr>`
  }).join('')

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://login.purepulse.one'

  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PurePulse <matty@purepulse.one>',
        to: client.email,
        subject: `⚠️ Payment overdue — action required by ${deadline}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;color:#111">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.25rem">PurePulse</h2>
            <p style="color:#666;margin-bottom:2rem;font-size:0.875rem">Account Notice</p>

            <p style="margin-bottom:1rem">Hi ${client.name},</p>
            <p style="color:#555;margin-bottom:1.5rem;line-height:1.6">
              This is a friendly reminder that your account has <strong>${invoices.length} overdue invoice${invoices.length !== 1 ? 's' : ''}</strong>
              totaling <strong>${fmt(totalOwed)}</strong>.
            </p>

            <div style="background:#fff8f0;border:1px solid #f59e0b;border-radius:8px;padding:1rem;margin-bottom:1.5rem">
              <p style="color:#b45309;font-weight:600;margin-bottom:0.5rem">⚠️ Portal access will be suspended on ${deadline} if your balance is not settled.</p>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
              <thead><tr>
                <th style="text-align:left;font-size:0.75rem;color:#999;padding-bottom:6px">Invoice</th>
                <th style="text-align:right;font-size:0.75rem;color:#999;padding-bottom:6px">Amount</th>
                <th style="text-align:right;font-size:0.75rem;color:#999;padding-bottom:6px">Overdue</th>
              </tr></thead>
              <tbody>${invoiceRows}</tbody>
              <tfoot><tr>
                <td colspan="2" style="padding-top:8px;font-weight:700">Total due</td>
                <td style="padding-top:8px;font-weight:700;text-align:right">${fmt(totalOwed)}</td>
              </tr></tfoot>
            </table>

            <a href="${portalUrl}" style="display:inline-block;background:#000;color:#fff;padding:0.875rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;margin-bottom:2rem">
              Log in & Pay →
            </a>

            <p style="color:#888;font-size:0.8125rem;line-height:1.6">
              If you have any questions or need to discuss payment arrangements, please reply to this email or contact us at
              <a href="mailto:matty@purepulse.one" style="color:#000">matty@purepulse.one</a>.
            </p>
          </div>
        `,
      }),
    })
  }

  // Record that warning was sent
  await supabase
    .from('clients')
    .update({ warning_sent_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, invoiceCount: invoices.length, totalOwed })
}
