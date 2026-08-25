import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { signSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const client = await getDbClient()
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    await client.connect()

    // 1. Check auth.users password match using pgcrypto crypt()
    const userRes = await client.query(
      `SELECT id, email, raw_user_meta_data 
       FROM auth.users 
       WHERE LOWER(email) = LOWER($1) 
         AND encrypted_password = crypt($2, encrypted_password)`,
      [cleanEmail, password]
    )

    let user = userRes.rows[0]
    let name = user?.raw_user_meta_data?.name || cleanEmail.split('@')[0]
    let role = user?.raw_user_meta_data?.role || 'admin'
    let title = user?.raw_user_meta_data?.title || null
    let userId = user?.id

    // 2. Cross-reference team_members table
    const teamRes = await client.query(
      'SELECT id, name, role, title, status FROM team_members WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    )
    const teamMember = teamRes.rows[0]

    if (teamMember) {
      if (teamMember.status === 'inactive') {
        return NextResponse.json({ error: 'Your account access has been revoked/deactivated. Please contact an administrator.' }, { status: 403 })
      }
      name = teamMember.name || name
      role = teamMember.role || role
      title = teamMember.title || title
    }

    if (!user) {
      // Check master admin fallback if applicable
      const MASTER_EMAILS = ['matty@purepulse.one', 'mattjhagen0@gmail.com']
      if (MASTER_EMAILS.includes(cleanEmail)) {
        userId = userId || '00000000-0000-0000-0000-000000000001'
        role = 'admin'
      } else {
        return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
      }
    }

    // 3. Update last login
    if (teamMember) {
      await client.query('UPDATE team_members SET last_login_at = NOW() WHERE id = $1', [teamMember.id])
    }

    // 4. Create session and set cookie
    const sessionPayload = {
      id: userId || teamMember?.id || 'user',
      name,
      email: cleanEmail,
      role,
      title,
    }

    const sessionToken = signSession(sessionPayload)
    const response = NextResponse.json({
      ok: true,
      user: sessionPayload,
    })

    response.cookies.set('purepulse_team_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login error'
    console.error('[POST /api/auth/login] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}
