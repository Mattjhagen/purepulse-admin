import { requireAdmin } from '@/lib/require-admin'
import { adminSupabase } from '@/lib/supabase'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  DollarSign,
  FolderKanban,
  Gauge,
  Mail,
  Plus,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BuildProject {
  id: string
  name: string
  slug: string
  client_name: string
  client_email: string
  status: string
  type: string
  spending_cap: number
  recorded_work: number
  billable_time: number
  created_at: string
  github_repo: string | null
  live_url: string | null
}

export default async function ProjectsPage() {
  await requireAdmin()

  let dbProjects: BuildProject[] = []
  try {
    const supabase = adminSupabase()
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      dbProjects = data as BuildProject[]
    }
  } catch (err) {
    console.error('Failed to fetch projects from DB:', err)
  }

  const defaultProjects = [
    {
      id: 'fuelshield-defense-001',
      name: 'FuelShield Defense Studio',
      slug: 'fuelshield-defense',
      client_name: 'Marcus Sterling',
      client_email: 'marcus@fuelshield.xyz',
      status: 'Building',
      type: 'Brochure',
      spending_cap: 500.00,
      recorded_work: 45.00,
      billable_time: 1.80,
      created_at: new Date().toISOString(),
      github_repo: null,
      live_url: null,
    },
    {
      id: '6b2a8538-a410-4423-b09c-5d2ffe12c50a',
      name: 'Acme Home Services website',
      slug: 'acme-home-services',
      client_name: 'John Smith',
      client_email: 'john@acmehomeservices.com',
      status: 'Building',
      type: 'Brochure',
      spending_cap: 500.00,
      recorded_work: 33.75,
      billable_time: 1.35,
      created_at: '2026-08-25T18:00:00.000Z',
      github_repo: 'https://github.com/Mattjhagen/acme-home-services',
      live_url: 'https://mattjhagen.github.io/acme-home-services/',
    },
  ]

  const projectMap = new Map<string, BuildProject>()
  defaultProjects.forEach(p => projectMap.set(p.id, p))
  dbProjects.forEach(p => projectMap.set(p.id || p.name, { ...projectMap.get(p.id), ...p }))
  
  const projects = Array.from(projectMap.values())

  const totalRecordedWork = projects.reduce((acc, p) => acc + (Number(p.recorded_work) || 0), 0)

  return (
    <div className="projects-shell text-white font-sans">
      <PageHeader
        title="Build Projects"
        description="Control client scopes, pipeline stages, billable time, and hard spending caps."
        action={
          <Link href="/intake" className="btn btn-primary">
            <Plus size={16} aria-hidden="true" /> New client intake
          </Link>
        }
      />

      <div className="project-stats">
        <StatTile label="Active Builds" value={projects.length} subtext="Projects in progress" icon={<FolderKanban size={17} />} />
        <StatTile label="Needs Attention" value={0} subtext="No blockers reported" icon={<AlertTriangle size={17} />} />
        <StatTile label="Live Sites" value={0} subtext="Published projects" icon={<CheckCircle2 size={17} />} />
        <StatTile label="Recorded Work" value={`$${totalRecordedWork.toFixed(2)}`} subtext="Across active builds" icon={<DollarSign size={17} />} />
      </div>

      <section className="project-directory" aria-labelledby="project-directory-title">
        <div className="project-directory-heading">
          <div>
            <p className="section-eyebrow">Project directory</p>
            <h2 id="project-directory-title">Active client builds</h2>
          </div>
          <p>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
        </div>

        <div className="table-wrap project-desktop-table">
        <table className="project-table">
          <thead>
            <tr>
              <th>PROJECT</th>
              <th>TYPE / AFFILIATE</th>
              <th>STATUS</th>
              <th>BILLABLE TIME</th>
              <th>COST / CAP</th>
              <th>CAP USED</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const cap = Number(p.spending_cap) || 500
              const work = Number(p.recorded_work) || 0
              const capUsedPct = Math.min(100, Math.round((work / cap) * 100))
              const detailUrl = `/projects/${p.id}`

              return (
                <tr key={p.id}>
                  <td style={{ minWidth: 240 }}>
                    <Link href={detailUrl} className="project-name-link">
                      <p>{p.name}</p>
                      <span>{p.slug}</span>
                    </Link>
                  </td>
                  <td>
                    <p className="project-table-primary">{p.type || 'Brochure'}</p>
                    <p className="project-table-secondary project-table-accent">Direct intake</p>
                  </td>
                  <td>
                    <span className="badge badge-purple">{p.status}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    ⏱ {Number(p.billable_time || 0).toFixed(2)} h
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <p style={{ fontWeight: 700 }}>${work.toFixed(2)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ ${cap.toFixed(2)}</p>
                  </td>
                  <td style={{ width: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${capUsedPct}%`, height: '100%', background: '#9333ea', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{capUsedPct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link href={detailUrl} className="btn btn-ghost btn-sm">
                      Open project <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        <div className="project-mobile-list" aria-label="Build projects">
        {projects.map((p) => {
          const cap = Number(p.spending_cap) || 500
          const work = Number(p.recorded_work) || 0
          const capUsedPct = Math.min(100, Math.round((work / cap) * 100))
          const detailUrl = `/projects/${p.id}`

          return (
            <article className="card project-list-card" key={p.id}>
              <div className="project-list-card-header">
                <div className="project-card-identity">
                  <span className="project-card-icon"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
                  <div className="min-w-0">
                  <Link href={detailUrl} className="project-name-link">
                    <h3>{p.name}</h3>
                  </Link>
                  <p className="project-card-email">
                    <Mail size={13} aria-hidden="true" /> {p.client_email}
                  </p>
                  </div>
                </div>
                <span className="badge badge-purple">{p.status}</span>
              </div>

              <div className="project-list-card-metrics">
                <div><span><BriefcaseBusiness size={14} /> Type</span><strong>{p.type || 'Brochure'}</strong></div>
                <div><span><Clock3 size={14} /> Billable time</span><strong>{Number(p.billable_time || 0).toFixed(2)} h</strong></div>
                <div><span><DollarSign size={14} /> Cost / cap</span><strong>${work.toFixed(2)} <small>/ ${cap.toFixed(2)}</small></strong></div>
              </div>

              <div className="project-cap-row">
                <div className="project-cap-label"><span><Gauge size={14} /> Spending cap</span><strong>{capUsedPct}% used</strong></div>
                <div className="project-cap-track" role="progressbar" aria-label={`${p.name} spending cap used`} aria-valuenow={capUsedPct} aria-valuemin={0} aria-valuemax={100}>
                  <div style={{ width: `${capUsedPct}%` }} />
                </div>
              </div>

              <Link href={detailUrl} className="btn btn-ghost btn-sm">View project <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </article>
          )
        })}
        </div>
      </section>
    </div>
  )
}
