import type { SupabaseClient } from '@supabase/supabase-js'

type PortalLink = { url: string; userId: string; isNewInvite: boolean }

// admin.generateLink's `action_link` always redirects via Supabase's legacy implicit-grant flow
// (a `#access_token=...` hash fragment), which the app's PKCE-only browser client silently
// discards. Build our own link from `hashed_token` pointed at /auth/confirm instead, which
// verifies the token server-side and sets a proper session cookie.
export async function generatePortalLink(
  supabase: SupabaseClient,
  email: string,
  opts: { clientId?: string; appUrl: string; next?: string }
): Promise<PortalLink | null> {
  const redirectTo = `${opts.appUrl}/auth/confirm`
  const data = opts.clientId ? { client_id: opts.clientId } : undefined

  let result = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data, redirectTo },
  })
  let isNewInvite = true

  if (result.error) {
    // Already registered — fall back to a magic link for the existing account.
    result = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    isNewInvite = false
  }

  if (result.error || !result.data.user) return null

  const tokenHash = result.data.properties.hashed_token
  const type = isNewInvite ? 'invite' : 'magiclink'
  const url = `${opts.appUrl}/auth/confirm?token_hash=${tokenHash}&type=${type}&next=${encodeURIComponent(opts.next ?? '/portal')}`

  return { url, userId: result.data.user.id, isNewInvite }
}
