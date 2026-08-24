import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await adminSupabase()
    .from('marketing_email_templates')
    .select('id, name, category, subject, preview, body, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  const preview = String(body.preview ?? '').trim()
  const emailBody = String(body.body ?? '').trim()
  const category = body.category === 'clients' ? 'clients' : 'affiliates'

  if (!name || !subject || !emailBody) {
    return NextResponse.json({ error: 'Name, subject, and email body are required.' }, { status: 400 })
  }
  if (name.length > 120 || subject.length > 250 || preview.length > 300 || emailBody.length > 100_000) {
    return NextResponse.json({ error: 'One or more template fields are too long.' }, { status: 400 })
  }

  const { data, error } = await adminSupabase()
    .from('marketing_email_templates')
    .insert({ name, category, subject, preview, body: emailBody })
    .select('id, name, category, subject, preview, body, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Template id is required.' }, { status: 400 })

  const { error } = await adminSupabase().from('marketing_email_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
