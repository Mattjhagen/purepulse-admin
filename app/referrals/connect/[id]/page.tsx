import { adminSupabase } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

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

  let referral: { id: string; stripe_account_id: string } | null = null
  try {
    const { data } = await supabase
      .from('referrals')
      .select('id, stripe_account_id')
      .eq('id', id)
      .single()
    if (data) referral = data
  } catch {
    // ignore
  }

  if (!referral?.stripe_account_id) {
    return <StatusMessage title="Nothing to set up yet" body="This payout setup link isn't active. Ask PurePulse to send you a new one." />
  }

  try {
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(referral.stripe_account_id)
    if (account.charges_enabled && account.payouts_enabled) {
      return <StatusMessage title="Payouts active" body="Your bank account is connected and ready to receive commissions." success />
    }
  } catch {
    // ignore
  }

  return <StatusMessage title="Setup Pending" body="Please follow the payout setup link sent to your email to link your bank account." />
}
