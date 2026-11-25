import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireOwner } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!(await requireOwner())) return NextResponse.json({ error: 'Owner authorization required.' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const supabase = adminSupabase()

  const fromName = body.fromName || 'Schmidt Construction'
  const fromEmail = body.fromEmail || 'mikiel@schmidt-construction.com'
  const subject = body.subject || 'Question regarding website maintenance & portal'
  const text = body.text || 'Hi Matty,\n\nI had a quick question regarding our website updates and monthly deliverables. Please let me know when you have a few minutes to connect.\n\nThanks,\nMikiel Herrera'
  const html = body.html || `<p>Hi Matty,</p><p>I had a quick question regarding our website updates and monthly deliverables. Please let me know when you have a few minutes to connect.</p><p>Thanks,<br><strong>Mikiel Herrera</strong><br>Schmidt Construction</p>`

  let emailRecord: any = null
  try {
    const { data, error } = await supabase.from('received_emails').insert({
      resend_id: `test_${Date.now()}`,
      from_email: fromEmail,
      from_name: fromName,
      to_email: 'matty@purepulse.one',
      subject,
      text,
      html,
    }).select().single()

    if (data) emailRecord = data
  } catch (err) {
    console.warn('[test-inbound] DB insert notice (fallback enabled):', err)
  }

  if (!emailRecord) {
    emailRecord = {
      id: `email_${Date.now()}`,
      from_email: fromEmail,
      from_name: fromName,
      subject,
      created_at: new Date().toISOString(),
    }
  }

  return NextResponse.json({ ok: true, email: emailRecord })
}
