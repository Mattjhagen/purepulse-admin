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

      await supabase.from('tickets').insert({
        client_id: client.id,
        subject: subject,
        description: `Email received from ${fromName ?? fromEmail}:\n\n${ticketBody}`,
        status: 'open',
        priority: 'medium',
      })

      // 4. Also add to client_messages so it shows in their portal
      await supabase.from('client_messages').insert({
        client_id: client.id,
        sender: 'client',
        sender_name: fromName ?? fromEmail,
        body: ticketBody.slice(0, 1000),
      })
    }
  }

  return NextResponse.json({ ok: true })
}
