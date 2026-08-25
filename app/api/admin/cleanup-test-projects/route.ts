import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = adminSupabase()
  const keepId = '6b2a8538-a410-4423-b09c-5d2ffe12c50a' // Acme Home Services Website

  const { data: projects, error } = await supabase
    .from('website_projects')
    .select('id, name')

  if (error) {
    return NextResponse.json({ ok: false, error })
  }

  const deleted = []
  for (const p of projects || []) {
    if (p.id !== keepId) {
      await supabase.from('website_projects').delete().eq('id', p.id)
      deleted.push(p)
    }
  }

  return NextResponse.json({ ok: true, deleted, remaining: keepId })
}
