import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase'
import { ArrowLeft, CalendarDays, Clock3, DollarSign, ExternalLink, FileCheck2, History, UserRound } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATE_LABELS: Record<string, string> = {
  awaiting_contract: 'Awaiting contract', awaiting_payment: 'Awaiting payment', queued: 'Queued',
  planning: 'Planning', building: 'Building', testing: 'Testing', client_review: 'Client review',
  changes_requested: 'Changes requested', approved: 'Approved', invoicing: 'Invoicing', paid: 'Paid',
  deploying: 'Deploying', live: 'Live', paused_cap_reached: 'Cap reached', payment_failed: 'Payment failed',
  blocked_client: 'Waiting on client', suspended: 'Suspended', cancelled: 'Cancelled', failed: 'Failed', archived: 'Archived',
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function date(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined })
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()
  let { data: rawProject } = await supabase
    .from('website_projects')
    .select('*,clients(*),project_briefs(*),contracts(*)')
    .eq('id', id)
    .maybeSingle()

  if (!rawProject) {
    const { data: fallbackProject } = await supabase
      .from('website_projects')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!fallbackProject) notFound()
    rawProject = fallbackProject
  }
  const project = rawProject as any
  const client = Array.isArray(project.clients) ? project.clients[0] : project.clients
  const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs
  const contract = Array.isArray(project.contracts) ? project.contracts[0] : project.contracts

  const [{ data: jobs }, { data: usage }, { data: audit }] = await Promise.all([
    supabase.from('pipeline_jobs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('project_usage_events').select('*').eq('project_id', id).order('recorded_at', { ascending: false }),
    supabase.from('project_audit_events').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(25),
  ])

  const costCents = Math.round(Number(project.billable_seconds) * Number(project.hourly_rate_cents) / 3600)
  const capPercent = Math.min(100, project.spending_cap_cents ? costCents / project.spending_cap_cents * 100 : 0)
  const attention = ['paused_cap_reached', 'payment_failed', 'failed', 'suspended'].includes(project.state)

  return (
    <>
      <Link href="/projects" style={back}><ArrowLeft size={14} /> Build Projects</Link>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1>{project.name}</h1>
            <p>{client?.company || client?.name} · {client?.email}</p>
          </div>
          <span style={{ ...statusBadge, color: attention ? '#f59e0b' : '#cbd5e1' }}>{STATE_LABELS[project.state] ?? project.state}</span>
        </div>
      </div>

      <div style={statsGrid}>
        <Metric icon={<Clock3 size={15} />} label="Billable time" value={`${(Number(project.billable_seconds) / 3600).toFixed(2)} h`} />
        <Metric icon={<DollarSign size={15} />} label="Recorded cost" value={money(costCents)} />
        <Metric icon={<DollarSign size={15} />} label="Hard cap" value={money(project.spending_cap_cents)} />
        <Metric icon={<CalendarDays size={15} />} label="Launch target" value={date(brief?.desired_launch_date)} />
      </div>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong>Budget usage</strong><span>{capPercent.toFixed(0)}%</span></div>
        <div style={{ height: 9, background: '#262626', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${capPercent}%`, height: '100%', background: capPercent >= 80 ? '#f59e0b' : '#6366f1' }} /></div>
        <p style={muted}>{money(project.spending_cap_cents - costCents)} remaining at {money(project.hourly_rate_cents)}/hour</p>
      </section>

      <div style={twoColumn}>
        <section className="card">
          <h2 style={sectionTitle}><FileCheck2 size={17} /> Website brief</h2>
          <Detail label="Website type" value={brief?.website_type?.replaceAll('_', ' ')} />
          <Detail label="Business" value={brief?.business_summary} />
          <Detail label="Audience" value={brief?.target_audience} />
          <Detail label="Pages" value={brief?.pages?.join(', ') || 'Not specified'} />
          <Detail label="Features" value={brief?.features?.join(', ') || 'Not specified'} />
          <Detail label="Style" value={brief?.style_notes || 'Not specified'} />
          <Detail label="Content" value={brief?.content_status?.replaceAll('_', ' ')} />
          <Detail label="Examples" value={brief?.example_sites?.join(', ') || 'None'} />
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <section className="card">
            <h2 style={sectionTitle}><UserRound size={17} /> Client</h2>
            <Detail label="Name" value={client?.name} />
            <Detail label="Company" value={client?.company || '—'} />
            <Detail label="Email" value={client?.email} />
            <Detail label="Phone" value={client?.phone || '—'} />
            {client?.id && <Link className="btn btn-ghost btn-sm" href={`/clients/${client.id}`}>Open client <ExternalLink size={13} /></Link>}
          </section>

          <section className="card">
            <h2 style={sectionTitle}><FileCheck2 size={17} /> Contract & payment</h2>
            <Detail label="Contract" value={contract?.status || 'Not created'} />
            <Detail label="Payment" value={contract?.payment_status || 'Unpaid'} />
            <Detail label="Signed" value={date(contract?.signed_at)} />
            {contract?.id && <Link className="btn btn-ghost btn-sm" href={`/contracts/${contract.id}`}>Open contract <ExternalLink size={13} /></Link>}
          </section>
        </div>
      </div>

      <div style={{ ...twoColumn, marginTop: '1rem' }}>
        <section className="card">
          <h2 style={sectionTitle}><Clock3 size={17} /> Pipeline jobs</h2>
          {!jobs?.length ? <p style={muted}>No build jobs have started.</p> : jobs.map(job => <Timeline key={job.id} title={job.task} meta={`${job.stage} · ${job.status}`} when={job.created_at} />)}
        </section>
        <section className="card">
          <h2 style={sectionTitle}><History size={17} /> Audit history</h2>
          {!audit?.length ? <p style={muted}>No audit events recorded.</p> : audit.map(event => <Timeline key={event.id} title={event.action.replaceAll('_', ' ')} meta={`${event.actor_type}${event.actor_id ? ` · ${event.actor_id}` : ''}`} when={event.created_at} />)}
        </section>
      </div>

      {!!usage?.length && <p style={{ ...muted, marginTop: '1rem' }}>{usage.length} usage event{usage.length === 1 ? '' : 's'} recorded for this project.</p>}
    </>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="stat-tile"><div style={{ color: '#818cf8', marginBottom: 8 }}>{icon}</div><div className="stat-value" style={{ fontSize: '1.45rem' }}>{value}</div><div className="stat-label">{label}</div></div>
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div style={{ marginBottom: 15 }}><div style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div><div style={{ lineHeight: 1.55, textTransform: label === 'Website type' || label === 'Content' ? 'capitalize' : undefined }}>{value || '—'}</div></div>
}

function Timeline({ title, meta, when }: { title: string; meta: string; when: string }) {
  return <div style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}><div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{title}</div><div style={muted}>{meta} · {date(when)}</div></div>
}

const back: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.82rem', marginBottom: '1rem' }
const statusBadge: React.CSSProperties = { display: 'inline-flex', padding: '7px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', fontSize: '0.8rem', whiteSpace: 'nowrap' }
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }
const twoColumn: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', alignItems: 'start' }
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', margin: '0 0 1.25rem' }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 7 }
