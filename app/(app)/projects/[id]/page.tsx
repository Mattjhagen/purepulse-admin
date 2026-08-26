import { requireAdmin } from '@/lib/require-admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProjectDetailProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  await requireAdmin()
  const { id } = await params

  const isFuelShield = id.includes('fuelshield') || id === 'mock-fuelshield-001'

  const project = isFuelShield
    ? {
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
        description: 'Premier automotive ceramic coating, paint protection film (PPF), and precision detailing studio serving luxury and exotic vehicle owners in Naperville & Chicago, IL.',
      }
    : {
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
        description: 'Chicago premier plumbing, HVAC, and electrical repair company website with 5 distinct standalone pages.',
      }

  const capUsedPct = Math.min(100, Math.round((project.recorded_work / project.spending_cap) * 100))

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6 md:p-8 text-white font-sans">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/80 pb-4">
        <Link href="/projects" className="text-sm font-semibold text-zinc-400 hover:text-white transition flex items-center gap-2">
          ← Back to Build Projects
        </Link>
        <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm">
          ● {project.status}
        </span>
      </div>

      {/* Main Title & Action Bar */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{project.name}</h1>
        <p className="text-base text-zinc-400 max-w-3xl leading-relaxed">{project.description}</p>
        
        {/* Quick Action Links Bar */}
        <div className="flex flex-wrap gap-4 pt-2">
          <a
            href={project.live_url}
            target="_blank"
            rel="noreferrer"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-950/50 transition text-sm flex items-center gap-2"
          >
            🌐 Launch Live Site (GitHub Pages) ↗
          </a>
          <a
            href={project.github_repo}
            target="_blank"
            rel="noreferrer"
            className="bg-[#121215] hover:bg-zinc-800 text-white font-bold px-6 py-3 rounded-xl border border-zinc-800 transition text-sm flex items-center gap-2"
          >
            📦 Open GitHub Repo ↗
          </a>
          <a
            href="https://tty-purepulse.relayapp.pro"
            target="_blank"
            rel="noreferrer"
            className="bg-[#121215] hover:bg-zinc-800 text-zinc-300 font-bold px-6 py-3 rounded-xl border border-zinc-800 transition text-sm flex items-center gap-2"
          >
            🎛️ Command Center TTY ↗
          </a>
        </div>
      </div>

      {/* 4 Spacious KPI Cards Matching Interviews Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0c10] border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">CLIENT CONTACT</p>
          <p className="text-xl font-extrabold text-white">{project.client_name}</p>
          <p className="text-xs text-zinc-500">{project.client_email}</p>
        </div>

        <div className="bg-[#0b0c10] border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">BILLABLE TIME</p>
          <p className="text-3xl font-black text-white">⏱ {project.billable_time.toFixed(2)} h</p>
        </div>

        <div className="bg-[#0b0c10] border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">RECORDED WORK</p>
          <p className="text-3xl font-black text-emerald-400">${project.recorded_work.toFixed(2)}</p>
        </div>

        <div className="bg-[#0b0c10] border border-zinc-800 p-6 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">SPENDING CAP ({capUsedPct}% Used)</p>
          <p className="text-3xl font-black text-sky-400">${project.spending_cap.toFixed(2)}</p>
        </div>
      </div>

      {/* Manual Human Review Clock In / Clock Out Card Matching Interviews Tab */}
      <div className="bg-[#0b0c10] border border-zinc-800 p-8 rounded-2xl space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">HUMAN REVIEW & QA CLOCK</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">Manual Time Clock & QA Review</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">Clock in to log active human review time, inspect code, conduct QA checks, or approve client handoff.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition text-sm flex items-center gap-2"
            >
              ⏱️ Clock In for Human Review
            </button>
            <button
              type="button"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-6 py-3.5 rounded-xl border border-zinc-700 transition text-sm"
            >
              🛑 Clock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
