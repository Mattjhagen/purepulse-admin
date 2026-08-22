import { createServerSupabaseClient } from '@/lib/supabase-server'

export type HandoffAdmin = {
  userId: string
  email: string
}

export type AdminResolution =
  | { kind: 'none' }
  | { kind: 'not-allowlisted'; email: string }
  | { kind: 'portal-user' }
  | { kind: 'admin'; userId: string; email: string }

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.toLowerCase().trim())
    .filter(Boolean)
}

// Granular resolution so handlers can answer 401 (no session) differently
// from 403 (session exists but not a handoff admin).
export async function resolveHandoffAdmin(
  supabase?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<AdminResolution> {
  const client = supabase ?? await createServerSupabaseClient()
  const { data: { session } } = await client.auth.getSession()
  if (!session) return { kind: 'none' }

  const email = session.user.email?.toLowerCase().trim()
  if (!email) return { kind: 'none' }

  if (!adminAllowlist().includes(email)) return { kind: 'not-allowlisted', email }

  const { data: portalUser } = await client
    .from('portal_users')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()
  if (portalUser) return { kind: 'portal-user' }

  return { kind: 'admin', userId: session.user.id, email }
}

// Stronger than lib/require-admin.ts, which verifies session presence only.
// A handoff admin must additionally have NO portal_users row (the existing
// admin convention, migration 021) AND an email on the ADMIN_EMAILS env
// allowlist. Middleware leaves /api public, so every handler self-gates.
export async function requireHandoffAdmin(): Promise<HandoffAdmin | null> {
  const result = await resolveHandoffAdmin()
  if (result.kind === 'admin') return { userId: result.userId, email: result.email }
  return null
}

// CSRF defense for cookie-authenticated mutations: the browser attaches
// SameSite cookies cross-site, so require Origin to match the app URL.
export function originMatchesAppUrl(origin: string | null): boolean {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  if (!appUrl || !origin) return false
  return origin.replace(/\/$/, '') === appUrl
}
