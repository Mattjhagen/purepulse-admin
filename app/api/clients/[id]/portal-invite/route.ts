import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: client, error: clientErr } = await supabase.from('clients').select('id, email').eq('id', clientId).single()
  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }

  let authUserId: string | null = null
  let invited = false

  const { data: invite, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(client.email, {
    data: { client_id: client.id },
    redirectTo: `${appUrl}/portal`,
  })

  if (!inviteErr && invite.user) {
    authUserId = invite.user.id
    invited = true
  } else {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listErr) {
      return NextResponse.json({ error: inviteErr?.message ?? listErr.message }, { status: 500 })
    }
    const existing = list.users.find(u => u.email?.toLowerCase() === client.email.toLowerCase())
    if (!existing) {
      return NextResponse.json({ error: inviteErr?.message ?? 'Could not invite or find an existing account for this email.' }, { status: 500 })
    }
    authUserId = existing.id
  }

  const { error: linkErr } = await supabase.from('portal_users').upsert(
    { auth_user_id: authUserId, client_id: client.id, email: client.email },
    { onConflict: 'auth_user_id' }
  )
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, invited })
}
