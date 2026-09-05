import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import {
  exchangeGoogleCode,
  getConnectedGoogleEmail,
  saveGoogleConnection,
  verifyGoogleOAuthState,
} from '@/lib/google-calendar'

function settingsRedirect(req: NextRequest, result: string) {
  const url = new URL('/settings', req.nextUrl.origin)
  url.searchParams.set('calendar', result)
  const response = NextResponse.redirect(url)
  response.cookies.delete('google_calendar_oauth_state')
  return response
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return settingsRedirect(req, 'unauthorized')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') || ''
  const savedState = req.cookies.get('google_calendar_oauth_state')?.value || ''
  if (!code || !state || state !== savedState || !verifyGoogleOAuthState(state)) {
    return settingsRedirect(req, 'invalid-state')
  }

  try {
    const tokens = await exchangeGoogleCode(code)
    if (!tokens.refresh_token) return settingsRedirect(req, 'missing-refresh-token')
    const email = await getConnectedGoogleEmail(tokens.access_token)
    await saveGoogleConnection(tokens.refresh_token, email)
    return settingsRedirect(req, 'connected')
  } catch (error) {
    console.error('[google-calendar/callback]', error)
    return settingsRedirect(req, 'error')
  }
}
