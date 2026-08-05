import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formatDateTime } from '@/lib/utils'
import LeadActions from './LeadActions'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const leads = data ?? []

  const counts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    closed: leads.filter(l => l.status === 'closed').length,
  }

  const planLabel = (p: string | null) => {
    const map: Record<string, string> = { starter: 'Starter $20/mo', growth: 'Growth $50/mo', premium: 'Premium $75/mo', business: 'Business $100/mo' }
    return p ? (map[p] ?? p) : 'Not selected'
  }

  const statusClass = (s: string) => {
    const map: Record<string, string> = { new: 'badge badge-blue', contacted: 'badge badge-yellow', converted: 'badge badge-green', closed: 'badge badge-dim' }
    return map[s] ?? 'badge'
  }

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.25rem' }}>Leads</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Consultation requests from purepulse.one</p>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: '100px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>{count}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{label}</span>
          </div>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No leads yet — they appear here when someone submits the consultation form on purepulse.one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {leads.map(lead => (
            <div key={lead.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{lead.name}</span>
                    <span className={statusClass(lead.status)}>{lead.status}</span>
                  </div>
                  <a href={`mailto:${lead.email}`} style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>{lead.email}</a>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                    {planLabel(lead.plan)} · {formatDateTime(lead.created_at)}
                  </div>
                  {lead.project && (
                    <p style={{ marginTop: '0.625rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '600px' }}>
                      {lead.project}
                    </p>
                  )}
                  {lead.notes && (
                    <p style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-dim)', fontStyle: 'italic', maxWidth: '600px' }}>
                      Note: {lead.notes}
                    </p>
                  )}
                </div>
                <LeadActions id={lead.id} status={lead.status} currentNotes={lead.notes ?? ''} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
