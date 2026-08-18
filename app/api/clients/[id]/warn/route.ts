import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { inferClientDomain } from '@/lib/suspension-email'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
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
    .select('id, invoice_number, total, due_date, created_at, stripe_payment_link')
    .eq('client_id', id)
    .in('status', ['overdue', 'sent'])
    .order('due_date', { ascending: true })

  const invoices = overdueInvoices ?? []
  if (invoices.length === 0) return NextResponse.json({ error: 'No overdue invoices found' }, { status: 400 })

  const totalOwed = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const now = new Date()
  const deadlineDate = new Date(now.getTime() + 14 * 86_400_000)
  const deadline = deadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const websiteDomain = inferClientDomain(client)
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://login.purepulse.one/portal'
  const paymentUrl = invoices.find(i => i.stripe_payment_link)?.stripe_payment_link || portalUrl

  const invoiceRows = invoices.map(i => {
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(i.due_date ?? i.created_at).getTime()) / 86_400_000))
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid rgba(244,244,255,0.08);font-family:monospace;color:#FFFFFF">${i.invoice_number}</td>
      <td style="padding:8px 0;border-bottom:1px solid rgba(244,244,255,0.08);text-align:center;color:#FFB020">+${daysOverdue}d overdue</td>
      <td style="padding:8px 0;border-bottom:1px solid rgba(244,244,255,0.08);text-align:right;font-weight:700;color:#F4F4FF">${fmt(i.total)}</td>
    </tr>`
  }).join('')

  if (process.env.RESEND_API_KEY) {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'matty@purepulse.one'
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'PurePulse <contracts@login.purepulse.one>'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: client.email,
        reply_to: adminEmail,
        subject: `⚠️ Payment Reminder: Past Due Invoices for ${websiteDomain}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background-color:#07070D;font-family:'Inter',sans-serif;color:#F4F4FF;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background-color:#07070D;">
              <tr>
                <td align="center">
                  <table width="100%" style="max-width:580px;background-color:#0E0E18;border:1px solid rgba(123,47,255,0.25);border-radius:16px;overflow:hidden;padding:32px;">
                    <tr>
                      <td>
                        <div style="font-size:22px;font-weight:800;color:#FFFFFF;margin-bottom:20px;">
                          Pure<span style="color:#A066FF">Pulse</span>
                        </div>
                        <div style="background:rgba(255,176,32,0.1);border:1px solid rgba(255,176,32,0.3);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
                          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#FFB020;margin-bottom:2px;">Payment Reminder</div>
                          <div style="font-size:15px;font-weight:700;color:#FFFFFF;">Upcoming Service Suspension Notice</div>
                        </div>
                        <p style="font-size:15px;line-height:1.6;color:rgba(244,244,255,0.85);margin-bottom:14px;">
                          Hello ${client.name},
                        </p>
                        <p style="font-size:14px;line-height:1.6;color:rgba(244,244,255,0.7);margin-bottom:20px;">
                          This is a friendly reminder that your account for <strong style="color:#FFF;">${websiteDomain}</strong> has <strong>${invoices.length} past-due invoice${invoices.length !== 1 ? 's' : ''}</strong> totaling <strong style="color:#FF6B6B;">${fmt(totalOwed)}</strong>.
                        </p>
                        <p style="font-size:13.5px;line-height:1.6;color:rgba(244,244,255,0.65);margin-bottom:20px;">
                          To maintain active web hosting, SSL routing, and uninterrupted monthly maintenance, please settle your balance prior to <strong style="color:#FFF;">${deadline}</strong>.
                        </p>
                        <table width="100%" style="margin-bottom:24px;border-collapse:collapse;">
                          <thead>
                            <tr>
                              <th align="left" style="font-size:11px;color:rgba(244,244,255,0.45);padding-bottom:6px;">Invoice</th>
                              <th align="center" style="font-size:11px;color:rgba(244,244,255,0.45);padding-bottom:6px;">Status</th>
                              <th align="right" style="font-size:11px;color:rgba(244,244,255,0.45);padding-bottom:6px;">Amount</th>
                            </tr>
                          </thead>
                          <tbody>${invoiceRows}</tbody>
                          <tfoot>
                            <tr>
                              <td colspan="2" style="padding-top:12px;font-weight:700;color:#FFF;">Total Due</td>
                              <td align="right" style="padding-top:12px;font-weight:800;color:#FF6B6B;font-size:16px;">${fmt(totalOwed)}</td>
                            </tr>
                          </tfoot>
                        </table>
                        <div style="text-align:center;margin-bottom:24px;">
                          <a href="${paymentUrl}" style="display:inline-block;background:#7B2FFF;color:#FFF;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14.5px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">
                            Pay ${fmt(totalOwed)} Now →
                          </a>
                        </div>
                        <p style="font-size:12.5px;color:rgba(244,244,255,0.45);line-height:1.5;margin:0;">
                          Questions? Reply directly to this email or contact us at <a href="mailto:billing@purepulse.one" style="color:#00D4FF;">billing@purepulse.one</a>.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    })
  }

  // Record warning timestamp
  await supabase
    .from('clients')
    .update({ warning_sent_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, invoiceCount: invoices.length, totalOwed })
}
