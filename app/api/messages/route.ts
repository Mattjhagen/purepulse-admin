import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PurePulse <matty@purepulse.one>',
      to,
      subject,
      html,
    }),
  })
}

export async function POST(req: NextRequest) {
  const { client_id, sender, sender_name, body } = await req.json()

  if (!client_id || !sender || !body?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = adminSupabase()

  const { data: message, error } = await supabase
    .from('client_messages')
    .insert({ client_id, sender, sender_name, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: client } = await supabase
    .from('clients')
    .select('name, email')
    .eq('id', client_id)
    .single()

  if (client) {
    if (sender === 'client') {
      await sendEmail(
        'matty@purepulse.one',
        `💬 New message from ${client.name}`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#07070D;padding:20px 32px;border-radius:12px 12px 0 0;text-align:center">
              <span style="font-size:18px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
            </div>
            <div style="padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999">Client Message</p>
              <p style="margin:0 0 20px;font-size:16px;color:#07070D"><strong>${client.name}</strong> sent you a message:</p>
              <div style="background:#f8f8ff;border-left:3px solid #A066FF;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px">
                <p style="margin:0;font-size:14px;color:#333;line-height:1.6">${body.trim()}</p>
              </div>
              <a href="https://login.purepulse.one/messages" style="display:inline-block;background:#7B2FFF;color:#fff;padding:10px 24px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
                Reply in Messages →
              </a>
            </div>
          </div>
        `
      )
    } else if (sender === 'admin' && client.email) {
      await sendEmail(
        client.email,
        `💬 New message from PurePulse`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#07070D;padding:20px 32px;border-radius:12px 12px 0 0;text-align:center">
              <span style="font-size:18px;font-weight:800;color:#F4F4FF">Pure<span style="color:#A066FF">Pulse</span></span>
            </div>
            <div style="padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999">New Message</p>
              <p style="margin:0 0 20px;font-size:16px;color:#07070D">Your PurePulse team sent you a message:</p>
              <div style="background:#f8f8ff;border-left:3px solid #A066FF;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px">
                <p style="margin:0;font-size:14px;color:#333;line-height:1.6">${body.trim()}</p>
              </div>
              <a href="https://portal.purepulse.one" style="display:inline-block;background:#7B2FFF;color:#fff;padding:10px 24px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">
                View in Portal →
              </a>
            </div>
          </div>
        `
      )
    }
  }

  return NextResponse.json({ ok: true, message })
}
