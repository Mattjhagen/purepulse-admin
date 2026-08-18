import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  inferClientDomain,
  renderSuspensionEmailHtml,
  renderSuspensionEmailText,
  OverdueInvoiceSummary,
  SuspensionEmailData
} from '@/lib/suspension-email'
import { formatMoney } from '@/lib/utils'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

// ─── GET: Preview Suspension Data & Email ─────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Load all overdue/pending invoices
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, due_date, created_at, stripe_payment_link')
    .eq('client_id', id)
    .in('status', ['overdue', 'sent'])
    .order('due_date', { ascending: true })

  const invoices = overdueInvoices ?? []
  const totalOwed = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const now = new Date()

  const invoiceSummaries: OverdueInvoiceSummary[] = invoices.map(i => {
    const dueDate = new Date(i.due_date ?? i.created_at ?? now)
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000))
    return {
      invoiceNumber: i.invoice_number,
      total: i.total ?? 0,
      dueDate: dueDate.toISOString(),
      daysOverdue,
      paymentLink: i.stripe_payment_link,
    }
  })

  const maxDaysOverdue = invoiceSummaries.reduce((max, i) => Math.max(max, i.daysOverdue), 0)
  const websiteDomain = inferClientDomain(client)
  const suspensionDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const terminationDate = new Date(Date.now() + 14 * 86_400_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://login.purepulse.one/portal'
  const defaultPaymentUrl = invoices.find(i => i.stripe_payment_link)?.stripe_payment_link || portalUrl

  const emailData: SuspensionEmailData = {
    clientName: client.name,
    clientEmail: client.email,
    companyName: client.company,
    websiteDomain,
    invoiceNumber: invoices[0]?.invoice_number ?? 'INV-DELINQUENT',
    totalOwed: totalOwed > 0 ? totalOwed : (client.hourly_rate ?? 150),
    maxDaysOverdue: maxDaysOverdue > 0 ? maxDaysOverdue : 15,
    suspensionDate,
    terminationDate,
    reason: client.suspension_reason ?? 'Overdue balance & contractual non-fulfillment',
    paymentUrl: defaultPaymentUrl,
    portalUrl,
    invoices: invoiceSummaries,
  }

  const html = renderSuspensionEmailHtml(emailData)

  return NextResponse.json({
    client,
    emailData,
    invoices: invoiceSummaries,
    totalOwed: emailData.totalOwed,
    html,
  })
}

// ─── POST: Execute Suspension & Send Email ────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()
  const body = await req.json().catch(() => ({}))

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
    .select('id, invoice_number, total, due_date, created_at, stripe_payment_link')
    .eq('client_id', id)
    .in('status', ['overdue', 'sent'])
    .order('due_date', { ascending: true })

  const invoices = overdueInvoices ?? []
  const totalOwed = invoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const now = new Date()

  const invoiceSummaries: OverdueInvoiceSummary[] = invoices.map(i => {
    const dueDate = new Date(i.due_date ?? i.created_at ?? now)
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000))
    return {
      invoiceNumber: i.invoice_number,
      total: i.total ?? 0,
      dueDate: dueDate.toISOString(),
      daysOverdue,
      paymentLink: i.stripe_payment_link,
    }
  })

  const maxDaysOverdue = invoiceSummaries.reduce((max, i) => Math.max(max, i.daysOverdue), 0)
  const reason: string = body.reason?.trim() || 'Overdue balance & contractual non-fulfillment'
  const customWebsiteDomain: string = body.websiteDomain?.trim() || inferClientDomain(client)
  const terminationDays = Number(body.terminationDays) || 14
  const suspensionDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const terminationDate = new Date(Date.now() + terminationDays * 86_400_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://login.purepulse.one/portal'
  const paymentUrl = body.paymentUrl?.trim() || invoices.find(i => i.stripe_payment_link)?.stripe_payment_link || portalUrl
  const shouldSendEmail = body.sendEmail !== false

  // Suspend the client record in Supabase
  await supabase.from('clients').update({
    suspended: true,
    suspended_at: now.toISOString(),
    suspension_reason: reason,
    updated_at: now.toISOString(),
  }).eq('id', id)

  let emailSent = false
  let emailError: string | null = null

  if (process.env.RESEND_API_KEY && shouldSendEmail) {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'matty@purepulse.one'
    const fromEmail = 'PurePulse Billing <billing@purepulse.one>'

    const emailData: SuspensionEmailData = {
      clientName: client.name,
      clientEmail: client.email,
      companyName: client.company,
      websiteDomain: customWebsiteDomain,
      invoiceNumber: invoices[0]?.invoice_number ?? 'INV-DELINQUENT',
      totalOwed: totalOwed > 0 ? totalOwed : (client.hourly_rate ?? 150),
      maxDaysOverdue: maxDaysOverdue > 0 ? maxDaysOverdue : 15,
      suspensionDate,
      terminationDate,
      reason,
      paymentUrl,
      portalUrl,
      invoices: invoiceSummaries,
      customNote: body.customNote?.trim(),
    }

    const htmlContent = renderSuspensionEmailHtml(emailData)
    const textContent = renderSuspensionEmailText(emailData)

    // 1. Send Suspension Email to Client
    if (client.email) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: client.email,
            reply_to: adminEmail,
            subject: `URGENT: Website Services Suspended — ${customWebsiteDomain}`,
            html: htmlContent,
            text: textContent,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          emailError = errData.message ?? 'Failed sending client email via Resend'
        } else {
          emailSent = true
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Unknown email error'
      }
    }

    // 2. Send Notification to PurePulse Admin
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: adminEmail,
          subject: `[ADMIN NOTICE] Client Suspended: ${client.name} (${customWebsiteDomain}) — ${formatMoney(totalOwed)} overdue`,
          html: `
            <div style="font-family:sans-serif;padding:20px;color:#111">
              <h2 style="color:#ef4444;margin-bottom:8px">Client Suspended</h2>
              <p><strong>Client:</strong> ${client.name} (${client.email})</p>
              <p><strong>Website / Domain:</strong> ${customWebsiteDomain}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Overdue Balance:</strong> ${formatMoney(totalOwed)}</p>
              <p><strong>Data Retention Cutoff:</strong> ${terminationDate} (${terminationDays} days)</p>
              <p><strong>Client Email Sent:</strong> ${emailSent ? 'Yes' : 'No / Skipped'}</p>
              <hr style="margin:16px 0;border:0;border-top:1px solid #eee">
              <p style="font-size:12px;color:#888">PurePulse Admin Automation System</p>
            </div>
          `,
        }),
      })
    } catch {
      // Non-blocking admin notification error
    }
  }

  return NextResponse.json({
    ok: true,
    suspended: true,
    totalOwed,
    websiteDomain: customWebsiteDomain,
    emailSent,
    emailError,
  })
}

// ─── DELETE: Unsuspend Client ─────────────────────────────────────────────────

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
