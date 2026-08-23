import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, client_id, description, hourly_rate } = body

    if (!client_id || !action) {
      return NextResponse.json({ error: 'action and client_id are required' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const rate = hourly_rate || 25.00

    if (action === 'start') {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          client_id,
          clock_in: new Date().toISOString(),
          hourly_rate: rate,
          description: description || 'Automated Build Pass (/hr)',
          status: 'running',
        })
        .select('id')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, action: 'started', time_entry_id: data.id })
    }

    if (action === 'stop') {
      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('client_id', client_id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single()

      if (!activeEntry) {
        return NextResponse.json({ ok: true, message: 'No active clock to stop' })
      }

      const clockOut = new Date().toISOString()
      const startMs = new Date(activeEntry.clock_in).getTime()
      const endMs = new Date(clockOut).getTime()
      const hours = Math.max(0.25, (endMs - startMs) / 3600000)
      const totalAmount = Math.round(hours * activeEntry.hourly_rate * 100) / 100

      await supabase
        .from('time_entries')
        .update({
          clock_out: clockOut,
          status: 'completed',
          updated_at: clockOut,
        })
        .eq('id', activeEntry.id)

      return NextResponse.json({
        success: true,
        action: 'stopped',
        hours: Math.round(hours * 100) / 100,
        hourly_rate: activeEntry.hourly_rate,
        total_amount: totalAmount,
      })
    }

    return NextResponse.json({ error: 'Invalid action (must be start or stop)' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
