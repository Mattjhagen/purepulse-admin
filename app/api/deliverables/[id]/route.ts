import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status        !== undefined) update.status        = body.status
  if (body.final_content !== undefined) update.final_content = body.final_content
  if (body.title         !== undefined) update.title         = body.title
  if (body.scheduled_at  !== undefined) update.scheduled_at  = body.scheduled_at   // null clears it
  if (body.published_at  !== undefined) update.published_at  = body.published_at

  const supabase = adminSupabase()
  const { error } = await supabase.from('deliverables').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
