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
    <div className="max-w-7xl mx-auto space-y-6 p-6 text-white font-sans">
      {/* Back Navigation Link */}
      <div>
        <Link href="/projects" className="inline-flex items-center text-xs font-bold text-zinc-400 hover:text-white transition gap-1">
          ← Back to Build Projects
        </Link>
      </div>

      {/* Main Title & Status Card — Clean Pixel Perfect Alignment */}
      <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">CLIENT PROJECT</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">{project.name}</h1>
          </div>
          <div>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ● {project.status}
            </span>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed max-w-4xl">{project.description}</p>

        {/* Action Buttons Bar — Clean Spaced Layout (No Bleeding) */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={project.live_url}
            target="_blank"
            rel="noreferrer"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl transition text-xs shadow-md flex items-center gap-2"
          >
            🌐 Launch Live Site (GitHub Pages) ↗
          </a>
          <a
            href={project.github_repo}
            target="_blank"
            rel="noreferrer"
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold px-4 py-2 rounded-xl border border-zinc-800 transition text-xs flex items-center gap-2"
          >
            📦 Open GitHub Repo ↗
          </a>
          <a
            href="https://tty-purepulse.relayapp.pro"
            target="_blank"
            rel="noreferrer"
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-xl border border-zinc-800 transition text-xs flex items-center gap-2"
          >
            🎛️ Command Center TTY ↗
          </a>
        </div>
      </div>

      {/* 4 KPI Metric Cards — Clean Uniform Dimensions (No Overflowing Fonts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">CLIENT CONTACT</p>
          <div>
            <p className="text-base font-extrabold text-white truncate">{project.client_name}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{project.client_email}</p>
          </div>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">BILLABLE TIME</p>
          <p className="text-2xl font-black text-white">⏱ {project.billable_time.toFixed(2)} h</p>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">RECORDED WORK</p>
          <p className="text-2xl font-black text-white">${project.recorded_work.toFixed(2)}</p>
        </div>

        <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">SPENDING CAP ({capUsedPct}% USED)</p>
          <p className="text-2xl font-black text-white">${project.spending_cap.toFixed(2)}</p>
        </div>
      </div>

      {/* Manual Time Clock & QA Card — Clean Balanced Buttons */}
      <div className="bg-[#0d0d10] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Manual Time Clock & QA Review</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Clock in to record active review time for quality assurance, client feedback, or manual adjustments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-md flex items-center gap-2"
            >
              ⏱️ Clock In for Human Review
            </button>
            <button
              type="button"
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold px-4 py-2.5 rounded-xl border border-zinc-800 transition text-xs"
            >
              🛑 Clock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
