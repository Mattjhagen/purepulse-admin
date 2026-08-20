import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = adminSupabase()
  const { data, error } = await supabase.from('clients').insert(body).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}
