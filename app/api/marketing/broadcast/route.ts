import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const { subject, html, recipients, isTest } = await req.json()

  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'subject and html are required' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'PurePulse <matty@purepulse.one>'
  const adminEmail = process.env.ADMIN_EMAIL ?? 'matty@purepulse.one'

  // Handle single test email send to admin
  if (isTest) {
    const personalizedHtml = html.replace(/\{\{name\}\}/g, 'Matty')
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
          subject: `[TEST CAMPAIGN] ${subject}`,
          html: personalizedHtml,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        return NextResponse.json({ error: json.message ?? 'Failed to send test email' }, { status: 400 })
      }

      return NextResponse.json({ ok: true, isTest: true, sent: 1, failed: 0 })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
    }
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'recipients list is required' }, { status: 400 })
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

  if (recipients.includes('affiliates')) {
    const { data } = await supabase.from('affiliates').select('name, email').not('email', 'is', null)
    if (data) {
      const testSet = new Set([
        'admin@p3lending.space', 'purepulseone@gmail.com', 'pounce-woolens63@icloud.com',
        'pacmacmobile@gmail.com', 'testing@purepulse.one', 'demo@purepulse.one',
        'test@purepulse.one', 'mattjhagen@ymail.com', 'matty@purepulse.one',
        'referrals@purepulse.one', 'matty@purpulse.one'
      ])
      const valid = data.filter((r: { email: string }) => !testSet.has(r.email.toLowerCase().trim()))
      emails.push(...valid.map((r: { name: string; email: string }) => ({ name: r.name, email: r.email })))
    }
  }

  // Deduplicate by email address
  const seen = new Set<string>()
  emails = emails.filter(e => {
    if (!e.email) return false
    const key = e.email.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (emails.length === 0) {
    return NextResponse.json({ error: 'No valid recipient email addresses found' }, { status: 400 })
  }

  // Use Resend Batch API (up to 100 emails per batch call)
  // This executes in 1 single HTTP request and completely avoids the 10 req/sec rate limit!
  const BATCH_SIZE = 100
  const results: { email: string; ok: boolean; id?: string; error?: string }[] = []

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE)

    const batchPayload = chunk.map(recipient => {
      const firstName = (recipient.name?.trim() || 'there').split(' ')[0]
      const personalizedHtml = html.replace(/\{\{name\}\}/g, firstName)
      return {
        from: fromEmail,
        to: recipient.email.trim(),
        reply_to: adminEmail,
        subject,
        html: personalizedHtml,
      }
    })

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      })

      const json = await res.json() as { data?: { id: string }[]; message?: string; name?: string }

      if (res.ok && json.data && Array.isArray(json.data)) {
        json.data.forEach((item, idx) => {
          results.push({ email: chunk[idx].email, ok: true, id: item.id })
        })
      } else {
        // Batch failed, record error for this chunk
        const errMsg = json.message ?? json.name ?? 'Resend batch dispatch failed'
        chunk.forEach(r => {
          results.push({ email: r.email, ok: false, error: errMsg })
        })
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error during batch send'
      chunk.forEach(r => {
        results.push({ email: r.email, ok: false, error: errMsg })
      })
    }

    // Delay between chunks if there are multiple batches
    if (i + BATCH_SIZE < emails.length) {
      await sleep(600)
    }
  }

  const sent = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  return NextResponse.json({ sent, failed, results })
}

export async function GET() {
  const supabase = adminSupabase()

  const [clientsRes, leadsRes, affiliatesRes] = await Promise.all([
    supabase.from('clients').select('id, name, email').not('email', 'is', null),
    supabase.from('leads').select('id, name, email').not('email', 'is', null),
    supabase.from('affiliates').select('id, name, email').not('email', 'is', null),
  ])

  const testSet = new Set([
    'admin@p3lending.space', 'purepulseone@gmail.com', 'pounce-woolens63@icloud.com',
    'pacmacmobile@gmail.com', 'testing@purepulse.one', 'demo@purepulse.one',
    'test@purepulse.one', 'mattjhagen@ymail.com', 'matty@purepulse.one',
    'referrals@purepulse.one', 'matty@purpulse.one'
  ])

  const validAffiliates = (affiliatesRes.data ?? []).filter(
    (a: { email?: string }) => !a.email || !testSet.has(a.email.toLowerCase().trim())
  )

  return NextResponse.json({
    clients: clientsRes.data ?? [],
    leads: leadsRes.data ?? [],
    affiliates: validAffiliates,
  })
}
