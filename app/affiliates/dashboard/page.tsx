import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import AffiliateDashboardClient from './DashboardClient'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export default async function AffiliateDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/affiliates/login')

  const admin = adminSupabase()

  const { data: affiliate } = await admin
    .from('affiliates')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!affiliate) redirect('/affiliates/login')

  const { data: referrals } = await admin
    .from('affiliate_referrals')
    .select('*, clients(name, email, company)')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })

  const { data: commissions } = await admin
    .from('affiliate_commissions')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('period_month', { ascending: false })
    .limit(12)

  const activeReferrals = (referrals ?? []).filter((r: { status: string }) => r.status === 'active')
  const monthlyEarnings = activeReferrals.reduce((sum: number, r: { monthly_commission: number }) => sum + Number(r.monthly_commission), 0)
  const lifetimeEarnings = (commissions ?? []).reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0)
  const freePlanEligible = activeReferrals.length >= 1

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#111' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/affiliates" style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' }}>
          PurePulse
        </Link>
        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Affiliate Dashboard</span>
        <LogoutButton />
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 'clamp(1.375rem,3.5vw,1.875rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Welcome back, {affiliate.name.split(' ')[0]}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', margin: 0 }}>
            Status:{' '}
            <span style={{ fontWeight: 700, color: affiliate.status === 'active' ? '#16a34a' : '#dc2626', textTransform: 'capitalize' }}>
              {affiliate.status}
            </span>
          </p>
        </div>

        {/* Free plan bonus banner */}
        {freePlanEligible ? (
          <div style={{ background: '#111', color: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9375rem' }}>⭐ Your vibecodes.space Business Plan is active</p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#d1d5db' }}>You have {activeReferrals.length} active referral{activeReferrals.length !== 1 ? 's' : ''} — enjoy your free $49/mo plan on vibecodes.space.</p>
            </div>
            <a href="https://vibecodes.space" target="_blank" rel="noreferrer" style={{ background: '#f59e0b', color: '#000', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', flexShrink: 0 }}>
              Go to vibecodes.space →
            </a>
          </div>
        ) : (
          <div style={{ background: '#fef9ec', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9375rem', color: '#92400e' }}>🎯 Refer 1 client this month to unlock your free Business plan</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#78350f' }}>Affiliates with at least 1 active referral per month get a free vibecodes.space Business Plan ($49/mo value).</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Active Clients', value: activeReferrals.length.toString(), sub: 'earning commission' },
            { label: 'Monthly Earnings', value: `$${monthlyEarnings.toFixed(2)}`, sub: 'recurring/month' },
            { label: 'Lifetime Paid', value: `$${lifetimeEarnings.toFixed(2)}`, sub: 'total commissions' },
            { label: 'Total Referrals', value: (referrals ?? []).length.toString(), sub: 'all time' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '20px 20px' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 6px' }}>{stat.label}</p>
              <p style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 2px' }}>{stat.value}</p>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Referral link + QR */}
        <AffiliateDashboardClient
          referralCode={affiliate.referral_code}
          affiliateName={affiliate.name}
        />

        {/* Referrals table */}
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Your Referrals</h2>
          </div>
          {(referrals ?? []).length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>No referrals yet</p>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Share your link to start earning.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Client', 'Plan', 'Status', 'Your Commission', 'Since'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(referrals ?? []).map((r: {
                    id: string
                    clients: { name: string; email: string; company?: string } | null
                    plan: string
                    status: string
                    monthly_commission: number
                    created_at: string
                  }) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                        <p style={{ margin: '0 0 1px', fontWeight: 600 }}>{r.clients?.name ?? '—'}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>{r.clients?.company ?? r.clients?.email}</p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', textTransform: 'capitalize' }}>{r.plan}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: r.status === 'active' ? '#dcfce7' : r.status === 'pending' ? '#fef9c3' : '#fee2e2',
                          color: r.status === 'active' ? '#15803d' : r.status === 'pending' ? '#854d0e' : '#dc2626',
                          textTransform: 'capitalize',
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.9375rem', fontWeight: 700 }}>
                        {r.status === 'active' ? `$${Number(r.monthly_commission).toFixed(2)}/mo` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Commission payout history */}
        {(commissions ?? []).length > 0 && (
          <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Commission History</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Month', 'Amount', 'Status', 'Paid'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(commissions ?? []).map((c: {
                    id: string
                    period_month: string
                    amount: number
                    status: string
                    paid_at: string | null
                  }) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                        {new Date(c.period_month + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.9375rem', fontWeight: 700 }}>${Number(c.amount).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: c.status === 'paid' ? '#dcfce7' : '#fef9c3',
                          color: c.status === 'paid' ? '#15803d' : '#854d0e',
                          textTransform: 'capitalize',
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: '#6b7280' }}>
                        {c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action="/api/affiliates/logout" method="POST">
      <button type="submit" style={{ fontSize: '0.8125rem', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Sign out
      </button>
    </form>
  )
}
