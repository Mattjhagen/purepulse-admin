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

  // Handle inbound email event
  if (type === 'email.received') {
    const data = payload.data as Record<string, unknown>
    const supabase = adminSupabase()

    await supabase.from('received_emails').insert({
      resend_id: data.email_id as string,
      from_email: (data.from as string) ?? '',
      from_name: (data.from_name as string) ?? null,
      to_email: Array.isArray(data.to) ? data.to[0] : (data.to as string) ?? 'matty@purepulse.one',
      subject: (data.subject as string) ?? '(no subject)',
      html: (data.html as string) ?? null,
      text: (data.text as string) ?? null,
    })
  }

  return NextResponse.json({ ok: true })
}
