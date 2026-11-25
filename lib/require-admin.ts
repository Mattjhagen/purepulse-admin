import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppSession } from '@/lib/session'
import { getDbClient } from '@/lib/db'

const OWNER_EMAILS = new Set(
  (process.env.OWNER_EMAILS || 'admin@purepulse.one')
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean),
)

const MASTER_ADMIN_EMAILS = new Set([
  'matty@purepulse.one',
  'mattjhagen0@gmail.com',
  'admin@purepulse.one',
])

const ADMIN_ROLES = new Set(['owner', 'admin', 'manager'])

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && OWNER_EMAILS.has(email.toLowerCase().trim())
}

export function isMasterAdminEmail(email?: string | null): boolean {
  return !!email && MASTER_ADMIN_EMAILS.has(email.toLowerCase().trim())
}

async function teamRole(email: string, userId?: string): Promise<string | null> {
  const client = await getDbClient()
  try {
    await client.connect()
    const result = await client.query(
      `SELECT role FROM team_members
       WHERE status <> $1 AND (auth_user_id = $2 OR LOWER(email) = LOWER($3))
       ORDER BY CASE WHEN auth_user_id = $2 THEN 0 ELSE 1 END
       LIMIT 1`,
      ['inactive', userId || '', email],
    )
    return result.rows[0]?.role?.toLowerCase?.() || null
  } catch {
    return null
  } finally {
    await client.end()
  }
}

// Verifies both authentication and an agency role. A client or affiliate
// Supabase session is not an admin session.
export async function requireAdmin(): Promise<boolean> {
  const teamSession = await getAppSession()
  if (teamSession?.email) {
    if (isOwnerEmail(teamSession.email) || isMasterAdminEmail(teamSession.email)) return true
    return ADMIN_ROLES.has(teamSession.role.toLowerCase())
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return false
    if (isOwnerEmail(user.email) || isMasterAdminEmail(user.email)) return true
    return ADMIN_ROLES.has((await teamRole(user.email, user.id)) || '')
  } catch {
    return false
  }
}

// Infrastructure controls, terminal links, credential access, and owner
// account operations are intentionally narrower than ordinary administration.
export async function requireOwner(): Promise<boolean> {
  const teamSession = await getAppSession()
  if (teamSession?.email) return isOwnerEmail(teamSession.email)

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return isOwnerEmail(user?.email)
  } catch {
    return false
  }
}
