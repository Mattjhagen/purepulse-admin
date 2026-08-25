import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getICloudBusySlots } from '@/lib/icloud-calendar'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminSupabase()
  const { data } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'apple_icloud_calendar')
    .maybeSingle()

  const config = data?.value || {
    appleId: process.env.APPLE_ICLOUD_ID || 'matty@purepulse.one',
    appPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD || '',
    caldavUrl: '',
    timezone: 'America/Chicago',
  }

  // Mask password for security when returning to UI
  const maskedPassword = config.appPassword ? '••••-••••-••••-' + config.appPassword.slice(-4) : ''

  return NextResponse.json({
    appleId: config.appleId,
    appPassword: maskedPassword,
    hasPassword: !!config.appPassword,
    caldavUrl: config.caldavUrl || '',
    timezone: config.timezone || 'America/Chicago',
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { appleId, appPassword, caldavUrl, timezone } = await req.json()

    if (!appleId?.trim()) {
      return NextResponse.json({ error: 'Apple ID email is required' }, { status: 400 })
    }

    const supabase = adminSupabase()

    // Fetch existing settings if password wasn't modified
    const { data: existing } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'apple_icloud_calendar')
      .maybeSingle()

    let finalPassword = appPassword?.trim()
    if (finalPassword && finalPassword.startsWith('••••')) {
      finalPassword = existing?.value?.appPassword || process.env.APPLE_APP_SPECIFIC_PASSWORD || ''
    }

    const payload = {
      appleId: appleId.trim(),
      appPassword: finalPassword || '',
      caldavUrl: caldavUrl?.trim() || '',
      timezone: timezone || 'America/Chicago',
      updated_at: new Date().toISOString(),
    }

    // Save to system_settings table
    const { error: upsertErr } = await supabase
      .from('system_settings')
      .upsert({ key: 'apple_icloud_calendar', value: payload }, { onConflict: 'key' })

    if (upsertErr) {
      console.warn('[settings/calendar] Upsert warning:', upsertErr.message)
    }

    // Test connection if password is provided
    let testSuccess = false
    if (payload.appleId && payload.appPassword) {
      try {
        const busy = await getICloudBusySlots(payload, new Date().toISOString(), new Date(Date.now() + 86400000).toISOString())
        testSuccess = true
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Apple iCloud Calendar credentials saved successfully!',
      testSuccess,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed saving settings' }, { status: 500 })
  }
}
