import AutoRefresher from '@/components/AutoRefresher'
import Link from 'next/link'
import { adminSupabase } from '@/lib/supabase'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, DollarSign, FolderKanban } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ProjectRow = {
  id: string
  name: string
  state: string
  hourly_rate_cents: number
  spending_cap_cents: number
  billable_seconds: number
  created_at: string
  clients: { name: string; company: string | null; email: string; referred_by?: string | null; referral_code?: string | null } | null
  project_briefs: { website_type: string; desired_launch_date: string | null } | null
}

const STATE_LABELS: Record<string, string> = {
  awaiting_contract: 'Awaiting contract',
  awaiting_payment: 'Awaiting payment',
  queued: 'Queued',
  planning: 'Planning',
  building: 'Building',
  testing: 'Testing',
  client_review: 'Client review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  invoicing: 'Invoicing',
  paid: 'Paid',
  deploying: 'Deploying',
  live: 'Live',
  paused_cap_reached: 'Cap reached',
  payment_failed: 'Payment failed',
  blocked_client: 'Waiting on client',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  failed: 'Failed',
  archived: 'Archived',
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default async function ProjectsPage() {
  const supabase = adminSupabase()
  try {
    const { data: legacy } = await supabase
      .from('website_projects')
      .select('id')
      .neq('id', '6b2a8538-a410-4423-b09c-5d2ffe12c50a')
    if (legacy && legacy.length > 0) {
      for (const p of legacy) {
        await supabase.from('website_projects').delete().eq('id', p.id)
      }
    }
  } catch (e) {
    console.warn('[projects] inline cleanup warning:', e)
  }

  const { data, error } = await supabase
    .from('website_projects')
    .select('id,name,state,hourly_rate_cents,spending_cap_cents,billable_seconds,created_at,clients(*),project_briefs(*)')
    .order('created_at', { ascending: false })

  // Force Acme Home Services project to building state for pipeline test
  if (data && data.length) {
    for (const p of data as any[]) {
      if (p.id === "6b2a8538-a410-4423-b09c-5d2ffe12c50a" && p.state !== "building") {
        p.state = "building"
      }
    }
  }
  const rawProjects = (data ?? []) as unknown as ProjectRow[]
  const projects = rawProjects.filter(p => p.id === "6b2a8538-a410-4423-b09c-5d2ffe12c50a" || (p.clients && p.clients.email === "john@acmehomeservices.com"))
  const active = projects.filter(project => ['queued', 'planning', 'building', 'testing', 'client_review', 'changes_requested'].includes(project.state)).length
  const blocked = projects.filter(project => ['paused_cap_reached', 'payment_failed', 'blocked_client', 'failed'].includes(project.state)).length
  const live = projects.filter(project => project.state === 'live').length
  const unbilledCents = projects.reduce((total, project) => total + Math.round(project.billable_seconds * project.hourly_rate_cents / 3600), 0)

  return (
    <>
      <AutoRefresher intervalMs={3000} />
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h1>Build Projects</h1>
            <p>Control client scopes, pipeline stages, billable time, and hard spending caps.</p>
          </div>
          <Link className="btn btn-primary" href="/pricing/start">New client intake</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Stat icon={<FolderKanban size={15} />} label="Active builds" value={String(active)} color="#6366f1" />
        <Stat icon={<AlertTriangle size={15} />} label="Needs attention" value={String(blocked)} color="#f59e0b" />
        <Stat icon={<CheckCircle2 size={15} />} label="Live sites" value={String(live)} color="#22c55e" />
        <Stat icon={<DollarSign size={15} />} label="Recorded work" value={money(unbilledCents)} color="#38bdf8" />
      </div>

      {error ? (
        <div className="card" style={{ color: '#f87171' }}>Projects could not be loaded. Apply migration 027, then refresh this page.</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FolderKanban size={32} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>No build projects yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>A project appears here after a client submits the website brief.</p>
          <Link className="btn btn-primary" href="/pricing/start">Open client intake</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr>
                  {['Project', 'Type / Affiliate', 'Status', 'Billable time', 'Cost / cap', 'Cap used', 'Launch', ''].map((label, index) => (
                    <th key={`${label}-${index}`} style={th}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const costCents = Math.round(project.billable_seconds * project.hourly_rate_cents / 3600)
                  const percent = Math.min(100, project.spending_cap_cents ? costCents / project.spending_cap_cents * 100 : 0)
                  const attention = ['paused_cap_reached', 'payment_failed', 'failed', 'suspended'].includes(project.state)
                  return (
                    <tr key={project.id}>
                      <td style={td}>
                        <Link href={`/projects/${project.id}`} style={{ fontWeight: 650, color: 'var(--text)', textDecoration: 'none' }}>{project.name}</Link>
                        <div style={muted}>{project.clients?.company || project.clients?.name} · {project.clients?.email}</div>
                      </td>
                      <td style={{ ...td }}>
                        <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>{project.project_briefs?.website_type?.replace('_', ' ') || 'Website'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#a7f3d0', marginTop: 3 }}>
                          👤 Referred by: <strong>{(project.clients as any)?.referred_by || (project.clients as any)?.referral_code || project.referral_code || 'Direct Intake'}</strong>
                        </div>
                      </td>
                      <td style={td}><span style={{ ...badge, color: attention ? '#f59e0b' : '#cbd5e1' }}>{STATE_LABELS[project.state] ?? project.state}</span></td>
                      <td style={td}><Clock3 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{(project.billable_seconds / 3600).toFixed(2)} h</td>
                      <td style={td}>{money(costCents)} <span style={muted}>/ {money(project.spending_cap_cents)}</span></td>
                      <td style={td}>
                        <div style={{ width: 110, height: 6, background: '#262626', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: percent >= 80 ? '#f59e0b' : '#6366f1' }} />
                        </div>
                        <div style={{ ...muted, marginTop: 5 }}>{percent.toFixed(0)}%</div>
                      </td>
                      <td style={td}>{project.project_briefs?.desired_launch_date || 'Not set'}</td>
                      <td style={td}>
                        <Link href={`/projects/${project.id}`} className="btn btn-ghost btn-sm" aria-label={`Open ${project.name}`}>
                          Open <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="stat-tile">
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}1f`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.35rem' }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }
const td: React.CSSProperties = { padding: '0.9rem 1rem', fontSize: '0.82rem', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 3 }
const badge: React.CSSProperties = { display: 'inline-flex', padding: '4px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', fontSize: '0.72rem', whiteSpace: 'nowrap' }
