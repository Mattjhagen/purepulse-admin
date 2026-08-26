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
      {/* Top Title Bar — Uniform with /marketing, /leads, /clients, /team */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <Link href="/projects" className="text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1 mb-1">
            ← Back to Build Projects
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-3xl">{project.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/60">
            ● {project.status}
          </span>
        </div>
      </div>

      {/* Action Buttons Bar — Uniform White Oval & Dark Pill Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={project.live_url}
          target="_blank"
          rel="noreferrer"
          className="bg-white text-zinc-950 font-bold px-6 py-2.5 rounded-full hover:bg-zinc-200 transition text-sm flex items-center gap-2 shadow-md"
        >
          🌐 Launch Live Site (GitHub Pages) ↗
        </a>
        <a
          href={project.github_repo}
          target="_blank"
          rel="noreferrer"
          className="bg-[#0d0d10] hover:bg-zinc-800 text-white font-bold px-6 py-2.5 rounded-full border border-zinc-800 transition text-sm flex items-center gap-2"
        >
          📦 Open GitHub Repo ↗
        </a>
        <a
          href="https://tty-purepulse.relayapp.pro"
          target="_blank"
          rel="noreferrer"
          className="bg-[#0d0d10] hover:bg-zinc-800 text-zinc-300 font-bold px-6 py-2.5 rounded-full border border-zinc-800 transition text-sm flex items-center gap-2"
        >
          🎛️ Command Center TTY ↗
        </a>
      </div>

      {/* 4 KPI Cards — Uniform with /clients and /team */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-32">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">CLIENT CONTACT</p>
          <div>
            <p className="text-xl font-extrabold text-white">{project.client_name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{project.client_email}</p>
          </div>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-32">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">BILLABLE TIME</p>
          <p className="text-3xl font-black text-white">⏱ {project.billable_time.toFixed(2)} h</p>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-32">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">RECORDED WORK</p>
          <p className="text-3xl font-black text-emerald-400">${project.recorded_work.toFixed(2)}</p>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-32">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">SPENDING CAP ({capUsedPct}% USED)</p>
          <p className="text-3xl font-black text-sky-400">${project.spending_cap.toFixed(2)}</p>
        </div>
      </div>

      {/* Manual Human Review Clock In / Clock Out Card — Uniform Dark Container */}
      <div className="bg-[#0d0d10] border border-zinc-800/80 p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">HUMAN REVIEW & QA CLOCK</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">Manual Time Clock & QA Review</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">Clock in to log active human review time, inspect code, conduct QA checks, or approve client handoff.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-full hover:bg-zinc-200 transition text-sm flex items-center gap-2 shadow-md"
            >
              ⏱️ Clock In for Human Review
            </button>
            <button
              type="button"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-6 py-3 rounded-full border border-zinc-700/80 transition text-sm"
            >
              🛑 Clock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
