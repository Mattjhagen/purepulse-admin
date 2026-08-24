import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim()
  if (!token) return NextResponse.json({ error: 'Interview token is required' }, { status: 400 })

  const { data: affiliate, error } = await adminSupabase()
    .from('affiliates')
    .select('id, name, email, phone')
    .eq('interview_token', token)
    .maybeSingle()

  if (error || !affiliate) {
    return NextResponse.json({ error: 'This interview link is invalid or has expired.' }, { status: 404 })
  }

  return NextResponse.json({
    affiliate_id: affiliate.id,
    name: affiliate.name,
    email: affiliate.email,
    phone: affiliate.phone ?? '',
  })
}
