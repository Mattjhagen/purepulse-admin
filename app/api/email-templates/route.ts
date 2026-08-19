import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_TEMPLATES } from '@/lib/email-templates'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function GET() {
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If no templates exist in database yet, auto-seed the default templates
  if (!data || data.length === 0) {
    const { data: seeded, error: seedErr } = await supabase
      .from('email_templates')
      .insert(DEFAULT_TEMPLATES)
      .select()

    if (!seedErr && seeded) {
      return NextResponse.json(seeded)
    }
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { name, subject_prefix, body } = await req.json()
  if (!name?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'name and body are required' }, { status: 400 })
  }
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ name: name.trim(), subject_prefix: subject_prefix ?? 'Re: ', body: body.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
