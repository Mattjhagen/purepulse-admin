import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getApiUser } from '@/lib/api-auth'
import { resolveAuthenticatedAffiliate } from '@/lib/affiliate-auth'
import { getConnectSandboxAccount, mapConnectSandboxStatus } from '@/lib/stripe-connect-sandbox'

export async function GET(req: NextRequest) {
  const user = await getApiUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminSupabase()
  const { affiliate } = await resolveAuthenticatedAffiliate(user, admin)
  if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })

  const { data: record, error } = await admin
    .from('affiliate_connect_sandbox_accounts')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load Connect sandbox status' }, { status: 500 })

  if (!record) {
    return NextResponse.json({
      enabled: process.env.STRIPE_CONNECT_SANDBOX_ENABLED === 'true',
      status: 'not_started',
      transfers_enabled: false,
      requirements_due: [],
      account: null,
    })
  }

  try {
    const stripeAccount = await getConnectSandboxAccount(record.stripe_account_id)
    const mapped = mapConnectSandboxStatus(stripeAccount)
    const now = new Date().toISOString()
    await admin.from('affiliate_connect_sandbox_accounts').update({
      status: mapped.status,
      transfers_enabled: mapped.transfersEnabled,
      requirements_due: mapped.requirementsDue,
      last_synced_at: now,
      updated_at: now,
    }).eq('id', record.id)

    return NextResponse.json({
      enabled: process.env.STRIPE_CONNECT_SANDBOX_ENABLED === 'true',
      status: mapped.status,
      transfers_enabled: mapped.transfersEnabled,
      requirements_due: mapped.requirementsDue,
      account: { id: record.stripe_account_id, dashboard: stripeAccount.dashboard || 'express' },
      last_synced_at: now,
    })
  } catch (error) {
    return NextResponse.json({
      enabled: process.env.STRIPE_CONNECT_SANDBOX_ENABLED === 'true',
      status: record.status,
      transfers_enabled: record.transfers_enabled,
      requirements_due: record.requirements_due || [],
      account: { id: record.stripe_account_id, dashboard: 'express' },
      last_synced_at: record.last_synced_at,
      warning: error instanceof Error ? error.message : 'Unable to sync Stripe status',
    })
  }
}
