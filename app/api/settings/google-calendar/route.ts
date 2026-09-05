import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { adminSupabase } from '@/lib/supabase'
import { GOOGLE_CALENDAR_SETTING_KEY, getGoogleAccessToken, loadGoogleConnection } from '@/lib/google-calendar'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const connection = await loadGoogleConnection()
    if (!connection) return NextResponse.json({ connected: false })
    await getGoogleAccessToken()
    return NextResponse.json({
      connected: true,
      email: connection.email || null,
      connectedAt: connection.connectedAt || null,
      timezone: 'America/Chicago',
      hours: '12:00 PM–7:00 PM',
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      needsReconnect: true,
      error: error instanceof Error ? error.message : 'Google Calendar connection needs attention',
    })
  }
}

export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await adminSupabase().from('system_settings').delete().eq('key', GOOGLE_CALENDAR_SETTING_KEY)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
