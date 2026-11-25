import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getDbClient } from '@/lib/db'

const SESSION_COOKIE = 'purepulse_team_session'
const SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_DB_PASS || ''

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  title?: string | null
  sessionVersion?: number
}

export function signSession(user: SessionUser): string {
  if (!SECRET) throw new Error('SESSION_SECRET is not configured')
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifySession(token: string): SessionUser | null {
  try {
    if (!SECRET) return null
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null

    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
    if (signature !== expectedSig) return null

    const json = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(json) as SessionUser
  } catch {
    return null
  }
}

export async function getAppSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    const session = verifySession(token)
    if (!session) return null

    // Legacy team sessions are stateless cookies. Check the persisted version
    // so a password change can invalidate every previously issued cookie.
    const client = await getDbClient()
    try {
      await client.connect()
      const result = await client.query(
        'SELECT session_version FROM team_members WHERE (auth_user_id = $1 OR LOWER(email) = LOWER($2)) AND status <> $3 LIMIT 1',
        [session.id, session.email, 'inactive']
      )
      const currentVersion = result.rows[0]?.session_version
      if (currentVersion !== undefined && Number(currentVersion) !== Number(session.sessionVersion ?? 1)) return null
      return session
    } catch {
      // Preserve existing behavior if the compatibility database is unavailable.
      return session
    } finally {
      await client.end()
    }
  } catch {
    return null
  }
}
