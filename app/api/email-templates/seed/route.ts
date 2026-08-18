import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_TEMPLATES } from '../route'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST() {
  const supabase = adminSupabase()

  // Insert default templates
  const { data, error } = await supabase
    .from('email_templates')
    .insert(DEFAULT_TEMPLATES)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, templates: data })
}
