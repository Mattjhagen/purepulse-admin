import { requireAdmin } from '@/lib/require-admin'
import { adminSupabase } from '@/lib/supabase'
import Link from 'next/link'

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
  const activeBuildsCount = projects.filter(p => p.status === 'Building' || p.status === 'in_progress').length || projects.length
  const liveSitesCount = projects.filter(p => p.status === 'Live Published' || p.live_url).length

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6 text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Build Projects</h1>
          <p className="text-sm text-zinc-400 mt-1">Control client scopes, pipeline stages, billable time, and hard spending caps.</p>
        </div>
        <Link href="/intake" className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-full hover:bg-zinc-200 transition text-sm shadow-md">
          New client intake
        </Link>
      </div>

      {/* KPI Cards - Original Dark Black Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-36">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-purple-400 text-lg">
            📂
          </div>
          <div>
            <p className="text-4xl font-black text-white tracking-tight">{projects.length}</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">ACTIVE BUILDS</p>
          </div>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-36">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-amber-400 text-lg">
            ⚠️
          </div>
          <div>
            <p className="text-4xl font-black text-white tracking-tight">0</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">NEEDS ATTENTION</p>
          </div>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-36">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-emerald-400 text-lg">
            ✓
          </div>
          <div>
            <p className="text-4xl font-black text-white tracking-tight">0</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">LIVE SITES</p>
          </div>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-36">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-sky-400 text-lg">
            $
          </div>
          <div>
            <p className="text-4xl font-black text-white tracking-tight">${totalRecordedWork.toFixed(2)}</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">RECORDED WORK</p>
          </div>
        </div>
      </div>

      {/* Projects Table Container - Original Dark Black Design */}
      <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400 bg-zinc-900/30">
                <th className="py-4 px-6 font-bold">PROJECT</th>
                <th className="py-4 px-6 font-bold">TYPE / AFFILIATE</th>
                <th className="py-4 px-6 font-bold">STATUS</th>
                <th className="py-4 px-6 font-bold">BILLABLE TIME</th>
                <th className="py-4 px-6 font-bold">COST / CAP</th>
                <th className="py-4 px-6 font-bold">CAP USED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {projects.map((p) => {
                const cap = Number(p.spending_cap) || 500
                const work = Number(p.recorded_work) || 0
                const capUsedPct = Math.min(100, Math.round((work / cap) * 100))
                const detailUrl = `/projects/${p.id}`

                return (
                  <tr key={p.id} className="hover:bg-zinc-900/40 transition group">
                    <td className="py-5 px-6">
                      <Link href={detailUrl} className="block group-hover:text-purple-400 transition">
                        <p className="font-bold text-white text-base leading-tight">{p.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">{p.slug} · {p.client_email}</p>
                      </Link>
                    </td>
                    <td className="py-5 px-6">
                      <p className="font-medium text-zinc-200">{p.type || 'Brochure'}</p>
                      <p className="text-xs text-sky-400 mt-0.5 font-medium flex items-center gap-1">
                        👤 Referred by: <span className="font-bold">Direct Intake</span>
                      </p>
                    </td>
                    <td className="py-5 px-6">
                      <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-5 px-6 font-medium text-zinc-300">
                      ⏱ {Number(p.billable_time || 0).toFixed(2)} h
                    </td>
                    <td className="py-5 px-6">
                      <p className="font-bold text-white text-base">${work.toFixed(2)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">/ ${cap.toFixed(2)}</p>
                    </td>
                    <td className="py-5 px-6 w-48">
                      <div className="flex items-center gap-3">
                        <div className="flex-grow h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${capUsedPct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-zinc-400">{capUsedPct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
