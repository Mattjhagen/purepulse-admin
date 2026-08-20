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

export async function generateAffiliateAuthLink(
  supabase: SupabaseClient,
  email: string,
  opts: { affiliateId?: string; name?: string; appUrl: string; next?: string }
): Promise<PortalLink | null> {
  const cleanEmail = email.trim().toLowerCase()
  const redirectTo = `${opts.appUrl}/auth/confirm`
  const data = {
    role: 'affiliate',
    ...(opts.affiliateId ? { affiliate_id: opts.affiliateId } : {}),
    ...(opts.name ? { full_name: opts.name } : {}),
  }

  let isNewInvite = true
  let result = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: cleanEmail,
    options: { data, redirectTo },
  })

  if (result.error) {
    // Already registered or invited — fall back to a magic link for the existing account.
    result = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: { data, redirectTo },
    })
    isNewInvite = false
  }

  if (result.error && !result.data?.user) {
    // Try creating the confirmed user explicitly if both failed
    try {
      const { data: newUser } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: data,
      })
      if (newUser?.user) {
        result = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: { data, redirectTo },
        })
        isNewInvite = true
      }
    } catch (createErr) {
      console.warn('[generateAffiliateAuthLink] createUser fallback error:', createErr)
    }
  }

  if (result.error || !result.data?.user) {
    console.error('[generateAffiliateAuthLink] Error generating link:', result.error)
    return null
  }

  const tokenHash = result.data.properties.hashed_token
  const type = isNewInvite ? 'invite' : 'magiclink'
  const nextPath = opts.next ?? '/affiliates/dashboard'
  const url = `${opts.appUrl}/auth/confirm?token_hash=${tokenHash}&type=${type}&next=${encodeURIComponent(nextPath)}`

  return { url, userId: result.data.user.id, isNewInvite }
}

