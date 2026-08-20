import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

async function sendInviteEmail(name: string, email: string, role: string, inviterName = 'Matty') {
  if (!process.env.RESEND_API_KEY) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.purepulse.one'
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PurePulse <matty@purepulse.one>',
      to: email,
      subject: `You've been invited to PurePulse`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">
          <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem">Welcome to PurePulse 👋</h2>
          <p style="color:#555;margin-bottom:1.5rem">
            Hey ${name}, ${inviterName} has added you to the PurePulse team as a <strong>${role}</strong>.
          </p>
          <a href="${appUrl}/login" style="display:inline-block;background:#000;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:1.5rem">
            Sign in to PurePulse →
          </a>
          <p style="color:#888;font-size:0.875rem">
            Use your email address (${email}) to sign in or create an account.
          </p>
        </div>
      `,
    }),
  })
}

export async function POST(req: NextRequest) {
  const { name, email, role, title, phone, hourly_rate, notes } = await req.json()
  const supabase = adminSupabase()

  const { data: member, error } = await supabase
    .from('team_members')
    .insert({ name, email, role: role ?? 'member', title, phone, hourly_rate: hourly_rate ?? 0, notes, status: 'invited' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await sendInviteEmail(name, email, role ?? 'member')

  return NextResponse.json({ ok: true, member })
}
