import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireOwner } from '@/lib/require-admin'

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: 'Owner authorization required.' }, { status: 403 })
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
