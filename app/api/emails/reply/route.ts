import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const { email_id, to, subject, body } = await req.json()

  if (!to || !subject || !body?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  const htmlBody = body
    .trim()
    .split('\n')
    .map((line: string) => `<p style="margin:0 0 12px;font-size:14px;color:#333;line-height:1.6">${line || '&nbsp;'}</p>`)
    .join('')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PurePulse <matty@purepulse.one>',
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#07070D;padding:20px 32px;border-radius:12px 12px 0 0;text-align:center">
            <span style="font-size:18px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
          </div>
          <div style="padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            ${htmlBody}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
            <p style="margin:0;font-size:12px;color:#999">PurePulse · <a href="https://portal.purepulse.one" style="color:#A066FF;text-decoration:none">Client Portal</a></p>
          </div>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  // Mark the original email as read if email_id provided
  if (email_id) {
    const supabase = adminSupabase()
    await supabase
      .from('received_emails')
      .update({ read_at: new Date().toISOString() })
      .eq('id', email_id)
      .is('read_at', null)
  }

  return NextResponse.json({ ok: true })
}
