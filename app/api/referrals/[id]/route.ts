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

  // 1. Try fetching from referrals table
  const [{ data: referral }, { data: clicks }] = await Promise.all([
    supabase.from('referrals').select('*').eq('id', id).maybeSingle(),
    supabase.from('referral_clicks').select('*').eq('referral_id', id).order('created_at', { ascending: false }),
  ])

  if (referral) {
    return NextResponse.json({ referral, clicks: clicks ?? [] })
  }

  // 2. Fallback: check affiliates table
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!affiliate) {
    return NextResponse.json({ error: 'Referrer or affiliate not found' }, { status: 404 })
  }

  const [{ data: affRefs }, { data: affComms }] = await Promise.all([
    supabase.from('affiliate_referrals').select('*, clients(name, email, company)').eq('affiliate_id', id),
    supabase.from('affiliate_commissions').select('*').eq('affiliate_id', id),
  ])

  const totalEarned = (affComms ?? []).reduce((s, c) => s + Number(c.amount || 0), 0)
  const totalPaid = (affComms ?? []).filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0)

  const mappedReferral = {
    id: affiliate.id,
    name: affiliate.name,
    email: affiliate.email,
    phone: affiliate.phone,
    code: affiliate.referral_code,
    clicks: 0,
    conversions: (affRefs ?? []).length,
    commission_per_conversion: 50,
    total_earned: totalEarned,
    total_paid: totalPaid,
    notes: affiliate.notes || null,
    active: affiliate.status === 'active',
    created_at: affiliate.created_at,
    updated_at: affiliate.updated_at,
    stripe_account_id: affiliate.stripe_account_id ?? null,
    stripe_payouts_enabled: affiliate.stripe_payouts_enabled ?? false,
  }

  const mappedClicks = (affRefs ?? []).map(r => ({
    id: r.id,
    referral_id: affiliate.id,
    converted: true,
    converted_at: r.created_at,
    client_name: r.clients?.name || r.clients?.company || 'Referred Client',
    plan: r.plan,
    created_at: r.created_at,
  }))

  return NextResponse.json({ referral: mappedReferral, clicks: mappedClicks })
}
