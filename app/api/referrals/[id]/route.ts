import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  const [{ data: referral }, { data: clicks }] = await Promise.all([
    supabase.from('referrals').select('*').eq('id', id).single(),
    supabase.from('referral_clicks').select('*').eq('referral_id', id).order('created_at', { ascending: false }),
  ])

  if (!referral) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
  return NextResponse.json({ referral, clicks: clicks ?? [] })
}
