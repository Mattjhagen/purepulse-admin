import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

export default async function CampaignsPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('campaigns')
    .select(`
      id, name, plan, status, created_at,
      clients(name),
      milestones(id, status, title),
      deliverables(id, status)
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns = (data ?? []) as any[]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} />
            Campaigns
          </h1>
          <p>Review AI-generated content and manage each client&apos;s marketing campaign.</p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No campaigns yet</p>
          <p style={{ fontSize: '0.875rem' }}>Campaigns are created automatically when a client completes their deposit payment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {campaigns.map(c => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const deliverables = (c.deliverables ?? []) as any[]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const milestones   = (c.milestones   ?? []) as any[]

            const needsReview  = deliverables.filter((d: { status: string }) => d.status === 'ai_generated').length
            const withClient   = deliverables.filter((d: { status: string }) => d.status === 'in_review').length
            const revisions    = deliverables.filter((d: { status: string }) => d.status === 'revision_requested').length
            const approved     = deliverables.filter((d: { status: string }) => d.status === 'approved').length
            const activeMilestone = milestones.find((m: { status: string }) => m.status === 'in_progress')

            const planColors: Record<string, string> = {
              starter: '#6b7280', growth: '#3b82f6', premium: '#8b5cf6', business: '#f59e0b',
            }

            return (
              <Link key={c.id} href={`/campaigns/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}>
                  {/* Plan color strip */}
                  <div style={{
                    width: 4, alignSelf: 'stretch', borderRadius: 2,
                    background: planColors[c.plan as string] ?? '#6b7280', flexShrink: 0,
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {(c.clients as { name: string } | null)?.name ?? 'Unknown Client'}
                      </span>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 700, padding: '1px 8px',
                        borderRadius: 20, textTransform: 'capitalize',
                        background: planColors[c.plan as string] + '22',
                        color: planColors[c.plan as string] ?? '#6b7280',
                        border: `1px solid ${planColors[c.plan as string] ?? '#6b7280'}44`,
                      }}>
                        {c.plan as string}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>{c.name as string}</p>
                    {!!activeMilestone && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        📍 {activeMilestone.title as string}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {revisions > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#2a0a0a', color: '#f87171', border: '1px solid #f8717144' }}>
                        {revisions} revision{revisions > 1 ? 's' : ''}
                      </span>
                    )}
                    {needsReview > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#1e1b4b', color: '#818cf8', border: '1px solid #818cf844' }}>
                        {needsReview} to review
                      </span>
                    )}
                    {withClient > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#2a1f05', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                        {withClient} with client
                      </span>
                    )}
                    {approved > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#022c1e', color: '#34d399', border: '1px solid #34d39944' }}>
                        {approved} approved
                      </span>
                    )}
                    {deliverables.length === 0 && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No content yet</span>
                    )}
                  </div>

                  <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
