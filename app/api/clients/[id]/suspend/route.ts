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
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
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
  const rawAmount = body.amountDue !== undefined && body.amountDue !== '' ? Number(String(body.amountDue).replace(/[^0-9.]/g, '')) : NaN
  const finalTotalOwed = !isNaN(rawAmount) && rawAmount >= 0 ? rawAmount : (totalOwed > 0 ? totalOwed : 1000)
  const invoiceRef = body.invoiceRef?.trim() || (invoices[0]?.invoice_number ?? 'CONTRACT-UNFULFILLED')

  const isTest = body.isTest === true

  // If this is a test send, do NOT update database status
  if (!isTest) {
    await supabase.from('clients').update({
      suspended: true,
      suspended_at: now.toISOString(),
      suspension_reason: reason,
      updated_at: now.toISOString(),
    }).eq('id', id)
  }

  let emailSent = false
  let emailError: string | null = null

  if (process.env.RESEND_API_KEY && shouldSendEmail) {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'matty@purepulse.one'
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'PurePulse <matty@purepulse.one>'

    const emailData: SuspensionEmailData = {
      clientName: client.name,
      clientEmail: client.email,
      companyName: client.company,
      websiteDomain: customWebsiteDomain,
      invoiceNumber: invoiceRef,
      totalOwed: finalTotalOwed,
      maxDaysOverdue: maxDaysOverdue > 0 ? maxDaysOverdue : 15,
      suspensionDate,
      terminationDate,
      reason,
      paymentUrl,
      portalUrl,
      invoices: !isNaN(rawAmount) ? [{
        invoiceNumber: invoiceRef,
        total: finalTotalOwed,
        dueDate: now.toISOString(),
        daysOverdue: maxDaysOverdue > 0 ? maxDaysOverdue : 15,
        paymentLink: paymentUrl,
      }] : (invoiceSummaries.length > 0 ? invoiceSummaries : [{
        invoiceNumber: invoiceRef,
        total: finalTotalOwed,
        dueDate: now.toISOString(),
        daysOverdue: maxDaysOverdue > 0 ? maxDaysOverdue : 15,
        paymentLink: paymentUrl,
      }]),
      customNote: body.customNote?.trim(),
    }

    const htmlContent = renderSuspensionEmailHtml(emailData)
    const textContent = renderSuspensionEmailText(emailData)

    if (isTest) {
      // Send test email directly to admin inbox
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: adminEmail,
            reply_to: adminEmail,
            subject: `[TEST PREVIEW] URGENT: Website Services Suspended — ${customWebsiteDomain}`,
            html: htmlContent,
            text: textContent,
          }),
        })
        if (res.ok) emailSent = true
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Failed sending test email'
      }

      return NextResponse.json({
        ok: true,
        isTest: true,
        emailSent,
        emailError,
      })
    }

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

    // 2. Send Notification to PurePulse Admin (includes full copy of client email)
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
            <div style="font-family:sans-serif;background-color:#07070D;padding:24px;color:#F4F4FF;">
              <div style="max-width:600px;margin:0 auto;background:#0E0E18;border:1px solid rgba(239,68,68,0.4);border-radius:12px;padding:20px;margin-bottom:20px;">
                <h2 style="color:#ef4444;margin:0 0 10px 0;font-size:18px;">🛑 Client Suspended Alert (Admin Record)</h2>
                <p style="margin:4px 0;font-size:14px;"><strong>Client:</strong> ${client.name} (${client.email})</p>
                <p style="margin:4px 0;font-size:14px;"><strong>Target Domain:</strong> ${customWebsiteDomain}</p>
                <p style="margin:4px 0;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
                <p style="margin:4px 0;font-size:14px;"><strong>Overdue Balance:</strong> ${formatMoney(totalOwed)}</p>
                <p style="margin:4px 0;font-size:14px;"><strong>Data Retention Cutoff:</strong> ${terminationDate} (${terminationDays} days)</p>
                <p style="margin:4px 0;font-size:14px;color:#22c55e;"><strong>Client Email Delivered:</strong> ${emailSent ? 'Yes (sent to ' + client.email + ')' : 'No / Skipped'}</p>
              </div>
              <p style="font-size:12px;color:#888;text-align:center;margin-bottom:16px;">⬇️ Below is an exact copy of the suspension notice sent to the client ⬇️</p>
            </div>
            ${htmlContent}
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
