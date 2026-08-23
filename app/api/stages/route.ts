import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) {
    return NextResponse.json({ error: 'client_id query parameter is required' }, { status: 400 })
  }

  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('project_stages')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ stages: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { client_id, name, status, sort_order, note } = body

    if (!client_id || !name) {
      return NextResponse.json({ error: 'client_id and name are required' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const payload: Record<string, unknown> = {
      client_id,
      name,
      status: status || 'pending',
      updated_at: new Date().toISOString(),
    }

    if (sort_order !== undefined) payload.sort_order = sort_order
    if (note !== undefined) payload.note = note
    if (status === 'complete') {
      payload.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('project_stages')
      .upsert(payload, { onConflict: 'client_id,sort_order' })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, stage: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
