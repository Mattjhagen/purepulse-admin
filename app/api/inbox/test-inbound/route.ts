import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const supabase = adminSupabase()

  const fromName = body.fromName || 'Schmidt Construction'
  const fromEmail = body.fromEmail || 'mikiel@schmidt-construction.com'
  const subject = body.subject || 'Question regarding website maintenance & portal'
  const text = body.text || 'Hi Matty,\n\nI had a quick question regarding our website updates and monthly deliverables. Please let me know when you have a few minutes to connect.\n\nThanks,\nMikiel Herrera'
  const html = body.html || `<p>Hi Matty,</p><p>I had a quick question regarding our website updates and monthly deliverables. Please let me know when you have a few minutes to connect.</p><p>Thanks,<br><strong>Mikiel Herrera</strong><br>Schmidt Construction</p>`

  const { data, error } = await supabase.from('received_emails').insert({
    resend_id: `test_${Date.now()}`,
    from_email: fromEmail,
    from_name: fromName,
    to_email: 'matty@purepulse.one',
    subject,
    text,
    html,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: data })
}
