import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: {
    payout_method?: string
    payout_details?: {
      bank_name?: string
      account_holder_name?: string
      routing_number?: string
      account_number_last4?: string
      paypal_email?: string
      venmo_handle?: string
      notes?: string
    }
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { payout_method = 'stripe', payout_details = {} } = body
  const admin = adminSupabase()

  const { error } = await admin
    .from('affiliates')
    .update({
      payout_method,
      payout_details,
      updated_at: new Date().toISOString(),
    })
    .eq('auth_user_id', session.user.id)

  if (error) {
    console.error('[api/affiliates/payout-settings] Update error:', error)
    return NextResponse.json({ error: 'Failed to update payout settings.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
