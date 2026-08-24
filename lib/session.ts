import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'purepulse_team_session'
const SECRET = process.env.SUPABASE_DB_PASS || 'purepulse-secret-key-2026-auth'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  title?: string | null
}

export function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifySession(token: string): SessionUser | null {
  try {
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
    return verifySession(token)
  } catch {
    return null
  }
}
