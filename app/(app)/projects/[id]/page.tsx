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

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 text-white font-sans">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <Link href="/projects" className="text-sm font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1">
          ← Back to Build Projects
        </Link>
        <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/60">
          ● {project.status}
        </span>
      </div>

      {/* Main Project Card — Original Clean Black Design */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{project.name}</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{project.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cap Used:</span>
            <span className="text-sm font-extrabold text-purple-400">
              {Math.min(100, Math.round((project.recorded_work / project.spending_cap) * 100))}%
            </span>
          </div>
        </div>

        {/* Quick Action Links Bar */}
        <div className="flex flex-wrap gap-3 py-2">
          <a
            href={project.live_url}
            target="_blank"
            rel="noreferrer"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm shadow-md flex items-center gap-2"
          >
            🌐 Launch Live Site (GitHub Pages)
          </a>
          <a
            href={project.github_repo}
            target="_blank"
            rel="noreferrer"
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-2.5 rounded-xl border border-zinc-700 transition text-sm flex items-center gap-2"
          >
            📦 Open GitHub Repo
          </a>
          <a
            href="https://tty-purepulse.relayapp.pro"
            target="_blank"
            rel="noreferrer"
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold px-5 py-2.5 rounded-xl border border-zinc-800 transition text-sm flex items-center gap-2"
          >
            🎛️ Command Center TTY
          </a>
        </div>

        {/* Financial & Scope Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CLIENT CONTACT</p>
            <p className="text-sm font-extrabold text-white mt-1">{project.client_name}</p>
            <p className="text-xs text-zinc-500">{project.client_email}</p>
          </div>
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">BILLABLE TIME</p>
            <p className="text-sm font-extrabold text-white mt-1">⏱ {project.billable_time.toFixed(2)} h</p>
          </div>
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">RECORDED WORK</p>
            <p className="text-sm font-extrabold text-emerald-400 mt-1">${project.recorded_work.toFixed(2)}</p>
          </div>
          <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">SPENDING CAP</p>
            <p className="text-sm font-extrabold text-white mt-1">${project.spending_cap.toFixed(2)}</p>
          </div>
        </div>

        {/* Manual Human Review Clock In / Clock Out Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Manual Human Review Time Clock</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Clock in to record active review time for quality assurance, client feedback, or manual adjustments.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition text-sm flex items-center gap-2"
              >
                ⏱️ Clock In (Human Review)
              </button>
              <button
                type="button"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-5 py-2.5 rounded-xl border border-zinc-700 transition text-sm"
              >
                🛑 Clock Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
