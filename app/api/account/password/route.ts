import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'
import { getAppSession } from '@/lib/session'
import { isTrustedAccountOrigin, validatePasswordChangeInput } from '@/lib/account-security'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Cloudflare terminates HTTPS before forwarding to the private HTTP service,
  // so the internal request host is not a trustworthy public-origin signal.
  // Validate the browser Origin against the explicit production allowlist.
  if (!isTrustedAccountOrigin(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
  const validationError = validatePasswordChangeInput(currentPassword, newPassword, confirmPassword)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const appSession = await getAppSession()
  const serverClient = await createServerSupabaseClient()
  const { data: { user: cookieUser } } = await serverClient.auth.getUser()
  const email = (cookieUser?.email || appSession?.email || '').toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const admin = adminSupabase()
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (users.error) return NextResponse.json({ error: 'Unable to verify the account.' }, { status: 503 })
  const target = users.data.users.find((candidate) => candidate.email?.toLowerCase() === email)
  if (!target) return NextResponse.json({ error: 'Authenticated account was not found.' }, { status: 401 })
  if (cookieUser && cookieUser.id !== target.id) return NextResponse.json({ error: 'Authenticated account mismatch.' }, { status: 403 })

  const verifier = createSupabaseClient(
    process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_PUBLIC_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const verified = await verifier.auth.signInWithPassword({ email, password: currentPassword })
  if (verified.error || verified.data.user?.id !== target.id) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
  }

  const updated = await admin.auth.admin.updateUserById(target.id, { password: newPassword })
  if (updated.error) return NextResponse.json({ error: 'Password could not be updated.' }, { status: 502 })

  // Keep the verification session usable only for this request and revoke all
  // other Supabase refresh-token sessions. The current browser is redirected
  // to sign in again after the change.
  if (verified.data.session?.access_token) {
    await admin.auth.admin.signOut(verified.data.session.access_token, 'others')
  }

  // Legacy team-login cookies are stateless HMAC tokens. Incrementing this
  // per-user version invalidates every previously issued team session.
  const { error: sessionVersionError } = await admin.rpc('bump_team_session_version', { p_auth_user_id: target.id })
  if (sessionVersionError) return NextResponse.json({ error: 'Password changed, but sessions could not be revoked. Contact an administrator.' }, { status: 503 })

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('purepulse_team_session')
  return response
}
