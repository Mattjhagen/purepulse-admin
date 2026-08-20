import { redirect } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://purepulse.one'

export default async function RefPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ src?: string; source?: string; utm_source?: string }>
}) {
  const { code } = await params
  const query = await searchParams
  const rawCode = (code || '').trim().toUpperCase()
  const source = query.src || query.source || query.utm_source || 'direct'

  const supabase = adminSupabase()

  try {
    // 1. Check in affiliates table
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, referral_code, status, clicks')
      .eq('referral_code', rawCode)
      .single()

    if (affiliate && affiliate.status === 'active') {
      try {
        await supabase.from('affiliate_clicks').insert({
          affiliate_id: affiliate.id,
          referral_code: affiliate.referral_code,
          source: source.slice(0, 50),
        })

        await supabase
          .from('affiliates')
          .update({ clicks: (affiliate.clicks || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', affiliate.id)
      } catch {
        // ignore
      }

      redirect(`${siteUrl}/home.html?ref=${rawCode}&src=${encodeURIComponent(source)}`)
    }

    // 2. Fallback to referrals table
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, active, clicks')
      .eq('code', rawCode)
      .single()

    if (referral?.active) {
      try {
        await supabase.from('referral_clicks').insert({
          referral_id: referral.id,
        })

        await supabase
          .from('referrals')
          .update({ clicks: (referral.clicks || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', referral.id)
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  // Redirect referred visitors to PurePulse home with code
  redirect(`${siteUrl}/home.html?ref=${rawCode}`)
}
