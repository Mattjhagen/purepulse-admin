import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://purepulse.one'

export default async function RefPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )

  const { data: referral } = await supabase
    .from('referrals')
    .select('id, active')
    .eq('code', code.toUpperCase())
    .single()

  if (referral?.active) {
    await supabase.from('referral_clicks').insert({ referral_id: referral.id })
  }

  // purepulse.one's root is a splash page that doesn't forward query params
  // to home.html (where the lead form + referral capture live), so land
  // referred visitors directly on home.html instead.
  redirect(`${siteUrl}/home.html?ref=${code}`)
}
