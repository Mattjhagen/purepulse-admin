import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, code, commission_per_conversion, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      code: code.trim().toUpperCase(),
      commission_per_conversion: parseFloat(commission_per_conversion) || 50,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
