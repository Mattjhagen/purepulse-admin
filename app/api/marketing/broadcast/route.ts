import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  const { subject, html, recipients } = await req.json()

  if (!subject?.trim() || !html?.trim() || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'subject, html, and recipients are required' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = adminSupabase()

  // Fetch emails from clients and/or leads
  let emails: { name: string; email: string }[] = []

  if (recipients.includes('clients')) {
    const { data } = await supabase.from('clients').select('name, email').not('email', 'is', null)
    if (data) emails.push(...data.map((r: { name: string; email: string }) => ({ name: r.name, email: r.email })))
  }

  if (recipients.includes('leads')) {
    const { data } = await supabase.from('leads').select('name, email').not('email', 'is', null)
    if (data) emails.push(...data.map((r: { name: string; email: string }) => ({ name: r.name, email: r.email })))
  }

  // Deduplicate by email
  const seen = new Set<string>()
  emails = emails.filter(e => {
    const key = e.email.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (emails.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // Send via Resend batch (one per recipient with personalized name)
  const results: { email: string; ok: boolean; id?: string; error?: string }[] = []

  for (const recipient of emails) {
    const personalizedHtml = html.replace(/\{\{name\}\}/g, recipient.name.split(' ')[0])

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PurePulse <matty@purepulse.one>',
        to: recipient.email,
        subject,
        html: personalizedHtml,
      }),
    })

    const json = await res.json() as { id?: string; message?: string; name?: string }
    results.push({ email: recipient.email, ok: res.ok, id: json.id, error: !res.ok ? (json.message ?? json.name) : undefined })
  }

  const sent = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  return NextResponse.json({ sent, failed, results })
}

export async function GET() {
  const supabase = adminSupabase()

  const [clientsRes, leadsRes] = await Promise.all([
    supabase.from('clients').select('id, name, email').not('email', 'is', null),
    supabase.from('leads').select('id, name, email').not('email', 'is', null),
  ])

  return NextResponse.json({
    clients: clientsRes.data ?? [],
    leads: leadsRes.data ?? [],
  })
}
