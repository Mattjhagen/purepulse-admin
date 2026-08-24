import { NextRequest, NextResponse } from 'next/server'
import { getDbClient, setUserPasswordAndConfirm } from '@/lib/db'
import { signSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const client = getDbClient()
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    await client.connect()

    const res = await client.query(
      'SELECT id, name, email, role, title, status, invite_token, invite_token_expires_at FROM team_members WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    )

    const member = res.rows[0]

    if (!member) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (member.invite_token !== token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 403 })
    }

    if (member.invite_token_expires_at && new Date(member.invite_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation token has expired. Please ask an admin to resend your invite.' }, { status: 410 })
    }

    return NextResponse.json({
      ok: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        title: member.title,
        status: member.status,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error validating invite'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function POST(req: NextRequest) {
  const client = getDbClient()
  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Token, email, and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    await client.connect()

    // 1. Verify invitation token
    const res = await client.query(
      'SELECT * FROM team_members WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    )
    const member = res.rows[0]

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if (member.invite_token !== token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 403 })
    }

    // 2. Set password & confirm email in Supabase Auth via PostgreSQL
    const { userId } = await setUserPasswordAndConfirm({
      email: cleanEmail,
      password,
      name: member.name,
      role: member.role,
      title: member.title,
    })

    // 3. Mark team member as active in team_members
    await client.query(
      `UPDATE team_members SET
        status = 'active',
        auth_user_id = $1,
        invite_token = NULL,
        invite_token_expires_at = NULL,
        last_login_at = NOW(),
        updated_at = NOW()
      WHERE id = $2`,
      [userId, member.id]
    )

    // 4. Create and set authenticated session cookie
    const sessionPayload = {
      id: userId || member.id,
      name: member.name,
      email: cleanEmail,
      role: member.role,
      title: member.title,
    }

    const sessionToken = signSession(sessionPayload)
    const response = NextResponse.json({
      ok: true,
      role: member.role,
      name: member.name,
      message: 'Account password configured successfully!',
    })

    response.cookies.set('purepulse_team_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error setting up account'
    console.error('[POST /api/team/setup] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}
