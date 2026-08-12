import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePortalLink } from '@/lib/portal-auth-link'
import { sendPortalInviteEmail } from '@/lib/portal-invite-email'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: client, error: clientErr } = await supabase.from('clients').select('id, name, email').eq('id', clientId).single()
  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }

  const link = await generatePortalLink(supabase, client.email, { clientId: client.id, appUrl })
  if (!link) {
    return NextResponse.json({ error: 'Could not invite or find an existing account for this email.' }, { status: 500 })
  }

  const { error: linkErr } = await supabase.from('portal_users').upsert(
    { auth_user_id: link.userId, client_id: client.id, email: client.email },
    { onConflict: 'auth_user_id' }
  )
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  if (link.isNewInvite) {
    await sendPortalInviteEmail({ email: client.email, name: client.name, url: link.url })
  }

  return NextResponse.json({ ok: true, invited: link.isNewInvite })
}
