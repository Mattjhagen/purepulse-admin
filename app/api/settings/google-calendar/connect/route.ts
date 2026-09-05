import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { createGoogleOAuthState, googleAuthorizationUrl } from '@/lib/google-calendar'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const state = createGoogleOAuthState()
    const response = NextResponse.redirect(googleAuthorizationUrl(state))
    response.cookies.set('google_calendar_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/settings/google-calendar/callback',
      maxAge: 10 * 60,
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Calendar setup is incomplete'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
