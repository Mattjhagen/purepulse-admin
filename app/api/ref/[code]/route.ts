import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
)

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://purepulse.one'

  const { data: referral } = await supabase
    .from('referrals')
    .select('id, active')
    .eq('code', code.toUpperCase())
    .single()

  if (referral?.active) {
    await supabase.from('referral_clicks').insert({
      referral_id: referral.id,
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    })
  }

  // purepulse.one's root is a splash page that doesn't forward query params
  // to home.html (where the lead form + referral capture live), so land
  // referred visitors directly on home.html instead.
  return NextResponse.redirect(`${redirectTo}/home.html?ref=${code}`)
}
