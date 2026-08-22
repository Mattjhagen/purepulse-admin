import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getApiUser } from '@/lib/api-auth'
import { resolveAuthenticatedAffiliate } from '@/lib/affiliate-auth'

export async function GET(req: NextRequest) {
  const user = await getApiUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminSupabase()
  const { affiliate } = await resolveAuthenticatedAffiliate(user, admin)
  if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })

  const { data: account, error } = await admin
    .from('affiliate_issuing_accounts')
    .select('card_status, card_brand, card_last4, monthly_spend_limit_cents, allocated_balance_cents, currency, environment, created_at, updated_at')
    .eq('affiliate_id', affiliate.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Unable to load card status' }, { status: 500 })

  return NextResponse.json({
    eligible: Boolean((affiliate as unknown as { issuing_approved_at?: string }).issuing_approved_at),
    provisioning_enabled: process.env.STRIPE_ISSUING_PROVISIONING_ENABLED === 'true',
    account,
  })
}

