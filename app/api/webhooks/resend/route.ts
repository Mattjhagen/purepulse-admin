import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('svix-secret') ?? req.headers.get('webhook-secret')
  if (process.env.RESEND_WEBHOOK_SECRET && secret !== process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = payload.type as string
  const data = payload.data as Record<string, unknown>
  const supabase = adminSupabase()

  if (type === 'email.received') {
    const fromEmail = (data.from as string) ?? ''
    const fromName = (data.from_name as string) ?? null
    const subject = (data.subject as string) ?? '(no subject)'
    const html = (data.html as string) ?? null
    const text = (data.text as string) ?? null
    const toEmail = Array.isArray(data.to) ? data.to[0] : (data.to as string) ?? 'matty@purepulse.one'

    // 1. Save to received_emails inbox
    await supabase.from('received_emails').insert({
      resend_id: data.email_id as string,
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      subject,
      html,
      text,
    })

    // 2. Look up client by email
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('email', fromEmail.toLowerCase().trim())
      .maybeSingle()

    if (client) {
      // 3. Create IT ticket linked to the client
      const ticketBody = text
        ? text.slice(0, 2000)
        : html
          ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
          : '(no message body)'

      const { data: ticket } = await supabase.from('tickets').insert({
        client_id: client.id,
        subject: subject,
        description: `Email received from ${fromName ?? fromEmail}:\n\n${ticketBody}`,
        status: 'open',
        priority: 'medium',
      }).select('id').single()

      // 4. Also add to client_messages so it shows in their portal
      await supabase.from('client_messages').insert({
        client_id: client.id,
        sender: 'client',
        sender_name: fromName ?? fromEmail,
        body: ticketBody.slice(0, 1000),
      })

      // 5. Notify Matty that a ticket was auto-created
      const ticketUrl = ticket?.id
        ? `https://login.purepulse.one/tickets`
        : 'https://login.purepulse.one/tickets'

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PurePulse <matty@purepulse.one>',
          to: 'matty@purepulse.one',
          subject: `🎫 New ticket from ${client.name} — ${subject}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#07070D;padding:20px 32px;border-radius:12px 12px 0 0;text-align:center">
                <span style="font-size:18px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
              </div>
              <div style="padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999">New IT Ticket</p>
                <h2 style="margin:0 0 20px;color:#07070D;font-size:18px">${subject}</h2>
                <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
                  <tr>
                    <td style="padding:8px 12px;background:#f9f9f9;font-weight:700;width:100px;font-size:13px">Client</td>
                    <td style="padding:8px 12px;font-size:13px">${client.name}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;font-weight:700;font-size:13px">Email</td>
                    <td style="padding:8px 12px;font-size:13px"><a href="mailto:${fromEmail}" style="color:#7B2FFF">${fromEmail}</a></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;background:#f9f9f9;font-weight:700;font-size:13px">Priority</td>
                    <td style="padding:8px 12px;font-size:13px">Medium</td>
                  </tr>
                </table>
                <div style="background:#f8f8ff;border-left:3px solid #7B2FFF;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px">
                  <p style="margin:0;font-size:13px;color:#555;line-height:1.6;white-space:pre-wrap">${ticketBody.slice(0, 500)}${ticketBody.length > 500 ? '…' : ''}</p>
                </div>
                <a href="${ticketUrl}" style="display:inline-block;background:#7B2FFF;color:#fff;padding:10px 24px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
                  View Ticket →
                </a>
              </div>
            </div>
          `,
        }),
      })
    }
  }

  return NextResponse.json({ ok: true })
}
