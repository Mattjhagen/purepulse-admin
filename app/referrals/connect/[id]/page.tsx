import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function StatusMessage({ title, body, success }: { title: string; body: string; success?: boolean }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080608', color: '#fff', padding: '2rem', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: success ? '#22c55e' : '#fff' }}>{title}</div>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, fontSize: '0.9375rem' }}>{body}</p>
      </div>
    </div>
  )
}

export default async function ReferralConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'

  const { data: referral } = await supabase
    .from('referrals')
    .select('id, stripe_account_id')
    .eq('id', id)
    .single()

  if (!referral?.stripe_account_id) {
    return <StatusMessage title="Nothing to set up yet" body="This payout setup link isn't active. Ask PurePulse to send you a new one." />
  }

  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(referral.stripe_account_id)

  if (account.payouts_enabled) {
    await supabase.from('referrals').update({
      stripe_payouts_enabled: true,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return <StatusMessage title="You're all set!" body="Your payout details are confirmed. PurePulse can now pay your referral commissions directly to your bank account." success />
  }

  const link = await stripe.accountLinks.create({
    account: referral.stripe_account_id,
    refresh_url: `${appUrl}/referrals/connect/${id}`,
    return_url: `${appUrl}/referrals/connect/${id}`,
    type: 'account_onboarding',
  })

  redirect(link.url)
}
