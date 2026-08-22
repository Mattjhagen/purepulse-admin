import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getApiUser } from '@/lib/api-auth'
import { resolveAuthenticatedAffiliate } from '@/lib/affiliate-auth'
import {
  assertConnectSandboxEnabled,
  createConnectSandboxAccount,
  createConnectSandboxOnboardingLink,
} from '@/lib/stripe-connect-sandbox'

export async function POST(req: NextRequest) {
  try {
    assertConnectSandboxEnabled()
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Connect sandbox disabled' }, { status: 503 })
  }

  const user = await getApiUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminSupabase()
  const { affiliate } = await resolveAuthenticatedAffiliate(user, admin)
  if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
  if (affiliate.status !== 'active') return NextResponse.json({ error: 'Affiliate is not active' }, { status: 403 })

  try {
    const { data: existing } = await admin
      .from('affiliate_connect_sandbox_accounts')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .maybeSingle()

    let accountId = existing?.stripe_account_id as string | undefined
    if (!accountId) {
      const account = await createConnectSandboxAccount({
        affiliateId: affiliate.id,
        email: affiliate.email,
        name: affiliate.name,
        country: 'US',
      })
      accountId = account.id
      const { error } = await admin.from('affiliate_connect_sandbox_accounts').insert({
        affiliate_id: affiliate.id,
        stripe_account_id: accountId,
        status: 'onboarding_required',
        environment: 'test',
      })
      if (error) throw new Error('Unable to save sandbox connected account')
    }

    const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one'
    const returnBase = `${appUrl}/api/affiliates/connect-sandbox/return`
    const link = await createConnectSandboxOnboardingLink({
      accountId,
      returnUrl: `${returnBase}?result=complete`,
      refreshUrl: `${returnBase}?result=refresh`,
    })

    return NextResponse.json({ url: link.url, expires_at: link.expires_at, account_id: accountId })
  } catch (error) {
    console.error('[connect sandbox onboard] failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start sandbox onboarding' }, { status: 502 })
  }
}
