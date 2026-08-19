import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const rawCode = (code || '').trim().toUpperCase()
  const searchParams = req.nextUrl.searchParams
  const source = searchParams.get('src') || searchParams.get('source') || searchParams.get('utm_source') || 'direct'
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://purepulse.one'

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const supabase = adminSupabase()

  try {
    // 1. Check in modern affiliates table
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, referral_code, status, clicks')
      .eq('referral_code', rawCode)
      .single()

    if (affiliate && affiliate.status === 'active') {
      // Record click with source attribution
      await supabase.from('affiliate_clicks').insert({
        affiliate_id: affiliate.id,
        referral_code: affiliate.referral_code,
        source: source.slice(0, 50),
        ip,
        user_agent: userAgent?.slice(0, 255),
      })

      // Increment click counter
      await supabase
        .from('affiliates')
        .update({ clicks: (affiliate.clicks || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', affiliate.id)

      return NextResponse.redirect(`${redirectTo}/home.html?ref=${rawCode}&src=${encodeURIComponent(source)}`)
    }

    // 2. Fallback to legacy referrals table
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, active, clicks')
      .eq('code', rawCode)
      .single()

    if (referral?.active) {
      await supabase.from('referral_clicks').insert({
        referral_id: referral.id,
        ip,
        user_agent: userAgent?.slice(0, 255),
      })

      await supabase
        .from('referrals')
        .update({ clicks: (referral.clicks || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', referral.id)
    }
  } catch (err) {
    console.error('[api/ref/[code]] Click tracking error:', err)
  }

  // Redirect referred visitors to PurePulse home with code
  return NextResponse.redirect(`${redirectTo}/home.html?ref=${rawCode}`)
}
