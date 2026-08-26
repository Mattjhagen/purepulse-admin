import { requireAdmin } from '@/lib/require-admin'
import { adminSupabase } from '@/lib/supabase'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectsPage() {
  await requireAdmin()

  let dbProjects: any[] = []
  try {
    const supabase = adminSupabase()
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      dbProjects = data
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
      github_repo: 'https://github.com/Mattjhagen/fuelshield-defense',
      live_url: 'https://mattjhagen.github.io/fuelshield-defense/',
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

  const projectMap = new Map<string, any>()
  defaultProjects.forEach(p => projectMap.set(p.id, p))
  dbProjects.forEach(p => projectMap.set(p.id || p.name, { ...projectMap.get(p.id), ...p }))
  
  const projects = Array.from(projectMap.values())

  const totalRecordedWork = projects.reduce((acc, p) => acc + (Number(p.recorded_work) || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white font-sans min-w-0">
      <PageHeader
        title="Build Projects"
        description="Control client scopes, pipeline stages, billable time, and hard spending caps."
        action={
          <Link href="/intake" className="btn btn-primary">
            + New client intake
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Active Builds" value={projects.length} icon="📂" />
        <StatTile label="Needs Attention" value={0} icon="⚠️" />
        <StatTile label="Live Sites" value={0} icon="✓" />
        <StatTile label="Recorded Work" value={`$${totalRecordedWork.toFixed(2)}`} icon="$" />
      </div>

      <div className="table-wrap">
        <table>
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
                    <Link href={detailUrl} className="block hover:text-purple-400 transition">
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{p.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.slug} · {p.client_email}</p>
                    </Link>
                  </td>
                  <td>
                    <p style={{ fontWeight: 500 }}>{p.type || 'Brochure'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: 2 }}>Direct Intake</p>
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
                      View & Take Action →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
