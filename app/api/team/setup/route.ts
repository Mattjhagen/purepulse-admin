import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = adminSupabase()

    const { data: member, error } = await supabase
      .from('team_members')
      .select('id, name, email, role, title, status, invite_token, invite_token_expires_at')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (error || !member) {
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
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Token, email, and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = adminSupabase()

    // 1. Verify invitation token
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if (member.invite_token !== token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // 2. Find or create user in Supabase Auth
    let authUserId = member.auth_user_id
    if (!authUserId) {
      const { data: userList } = await supabase.auth.admin.listUsers()
      const existing = userList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail)
      if (existing) {
        authUserId = existing.id
      }
    }

    if (authUserId) {
      // Update password & confirm email
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
        user_metadata: {
          name: member.name,
          role: member.role,
          title: member.title,
        },
      })
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
    } else {
      // Create new Supabase auth user
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: member.name,
          role: member.role,
          title: member.title,
        },
      })
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
      authUserId = newUser.user.id
    }

    // 3. Mark team member as active
    await supabase
      .from('team_members')
      .update({
        status: 'active',
        auth_user_id: authUserId,
        invite_token: null,
        invite_token_expires_at: null,
        last_login_at: now,
        updated_at: now,
      })
      .eq('id', member.id)

    return NextResponse.json({
      ok: true,
      role: member.role,
      name: member.name,
      message: 'Account password configured successfully!',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error setting up account'
    console.error('[POST /api/team/setup] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
