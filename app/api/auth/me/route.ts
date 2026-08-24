import { NextResponse } from 'next/server'
import { getAppSession } from '@/lib/session'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getDbClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Try team session
    const teamSession = await getAppSession()
    if (teamSession) {
      const rawName = teamSession.name || teamSession.email.split('@')[0]
      const firstName = rawName.split(' ')[0]
      const capitalized = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''
      return NextResponse.json({
        user: {
          id: teamSession.id,
          name: capitalized || teamSession.name,
          fullName: teamSession.name,
          email: teamSession.email,
          role: teamSession.role,
          title: teamSession.title,
        },
      })
    }

    // 2. Try Supabase session
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const email = user.email?.toLowerCase().trim() || ''
      const client = getDbClient()
      let memberName = ''
      let memberRole = 'admin'
      let memberTitle: string | null = null

      try {
        await client.connect()
        const res = await client.query('SELECT name, role, title FROM team_members WHERE LOWER(email) = LOWER($1)', [email])
        const m = res.rows[0]
        if (m) {
          memberName = m.name
          memberRole = m.role || memberRole
          memberTitle = m.title || null
        }
      } catch {} finally {
        await client.end()
      }

      const rawName = memberName || user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]
      const firstName = rawName.split(' ')[0]
      const capitalized = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

      return NextResponse.json({
        user: {
          id: user.id,
          name: capitalized,
          fullName: memberName || rawName,
          email,
          role: memberRole,
          title: memberTitle,
        },
      })
    }
  } catch (err) {
    console.warn('GET /api/auth/me error:', err)
  }

  return NextResponse.json({ user: null })
}
