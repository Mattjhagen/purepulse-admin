import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getAppSession } from '@/lib/session'

async function allowed() {
  const s = await getAppSession()
  return Boolean(s && (['admin', 'manager'].includes(s.role.toLowerCase()) || ['admin@purepulse.one', 'matty@purepulse.one', 'mattjhagen0@gmail.com'].includes(s.email.toLowerCase())))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body?.status === 'string' && ['draft', 'scheduled', 'canceled'].includes(body.status)) update.status = body.status
  if (body?.scheduled_at === null || typeof body?.scheduled_at === 'string') update.scheduled_at = body.scheduled_at
  const { error } = await adminSupabase().from('campaign_social_posts').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: 'Unable to update post.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
