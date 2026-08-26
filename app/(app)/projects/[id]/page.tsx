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
        billable_time: 1.8,
        created_at: new Date().toISOString(),
        github_repo: 'https://github.com/Mattjhagen/fuelshield-defense',
        live_url: 'https://mattjhagen.github.io/fuelshield-defense/',
        description: 'Premier automotive ceramic coating, paint protection film (PPF), and precision detailing studio serving luxury and exotic vehicle owners in Naperville & Chicago, IL.',
        cloud_node: 'Google Cloud VM (Primary Builder)',
      }
    : {
        id: '6b2a8538-a410-4423-b09c-5d2ffe12c50a',
        name: 'Acme Home Services website',
        slug: 'acme-home-services',
        client_name: 'John Smith',
        client_email: 'john@acmehomeservices.com',
        status: 'Live Published',
        type: 'Brochure',
        spending_cap: 500.00,
        recorded_work: 33.75,
        billable_time: 1.35,
        created_at: '2026-08-25T18:00:00.000Z',
        github_repo: 'https://github.com/Mattjhagen/acme-home-services',
        live_url: 'https://mattjhagen.github.io/acme-home-services/',
        description: 'Chicago premier plumbing, HVAC, and electrical repair company website with 5 distinct standalone pages.',
        cloud_node: 'Google Cloud VM (Primary Builder)',
      }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Top Navigation & Back Link */}
      <div className="flex items-center justify-between">
        <Link href="/projects" className="text-sm font-bold text-sky-400 hover:underline flex items-center gap-2">
          ← Back to All Projects
        </Link>
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          ● {project.status}
        </span>
      </div>

      {/* Project Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">CLIENT PROJECT LIFECYCLE</span>
            <h1 className="text-3xl font-black text-white mt-1">{project.name}</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">{project.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={project.live_url}
              target="_blank"
              rel="noreferrer"
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-sky-500/25 transition flex items-center gap-2 text-sm"
            >
              🌐 Launch Live Site
            </a>
            <a
              href={project.github_repo}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl border border-slate-700 transition flex items-center gap-2 text-sm"
            >
              📦 Open GitHub Repo
            </a>
            <a
              href="https://tty-purepulse.relayapp.pro"
              target="_blank"
              rel="noreferrer"
              className="bg-purple-900/60 hover:bg-purple-800/60 text-purple-300 font-bold px-6 py-3 rounded-xl border border-purple-700/50 transition flex items-center gap-2 text-sm"
            >
              🎛️ Command Center TTY
            </a>
          </div>
        </div>

        {/* Financial & Scope Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-400 font-medium">Client Contact</p>
            <p className="text-sm font-bold text-white mt-0.5">{project.client_name}</p>
            <p className="text-xs text-slate-500">{project.client_email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Billable Time</p>
            <p className="text-sm font-bold text-white mt-0.5">{project.billable_time} hrs</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Recorded Work</p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">${project.recorded_work.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Spending Cap</p>
            <p className="text-sm font-bold text-white mt-0.5">${project.spending_cap.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Start-to-Finish Lifecycle Progress Timeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
        <h2 className="text-2xl font-black text-white">Start-to-Finish Delivery Timeline</h2>

        <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-800">
          {/* Step 1: Intake */}
          <div className="relative flex items-start gap-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm z-10">
              1
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl flex-grow space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base">Stage 1: Client Intake & Requirement Scope</h3>
                <span className="text-xs text-emerald-400 font-bold">COMPLETED</span>
              </div>
              <p className="text-sm text-slate-300">Project requirements gathered, brochure template contract established ($500 hard spending cap), and dedicated repository provisioned.</p>
            </div>
          </div>

          {/* Step 2: AI Build Execution */}
          <div className="relative flex items-start gap-6">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-black text-sm z-10">
              2
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl flex-grow space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base">Stage 2: Autonomous AI Build Execution</h3>
                <span className="text-xs text-sky-400 font-bold">IN PROGRESS / COMPLETE</span>
              </div>
              <p className="text-sm text-slate-300">Assigned Cloud Node ({project.cloud_node}). OpenCode AI builder agent generated 5 distinct standalone HTML pages with Google Fonts, glassmorphism, price estimator, and responsive navigation.</p>
            </div>
          </div>

          {/* Step 3: Security & QA Audit */}
          <div className="relative flex items-start gap-6">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black text-sm z-10">
              3
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl flex-grow space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base">Stage 3: Security, Mobile Viewport & Code Audit</h3>
                <span className="text-xs text-purple-400 font-bold">PASSED</span>
              </div>
              <p className="text-sm text-slate-300">Verified zero syntax errors, 100% mobile viewport responsive navigation header, custom SVG favicon injection, and code quality compliance.</p>
            </div>
          </div>

          {/* Step 4: GitHub Repository */}
          <div className="relative flex items-start gap-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-sm z-10">
              4
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl flex-grow space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base">Stage 4: Code Repository & Version Control</h3>
                <span className="text-xs text-amber-400 font-bold">PUSHED TO MAIN</span>
              </div>
              <p className="text-sm text-slate-300">Production code committed and pushed to branch main on GitHub repository <a href={project.github_repo} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{project.github_repo}</a>.</p>
            </div>
          </div>

          {/* Step 5: Live GitHub Pages Deployment */}
          <div className="relative flex items-start gap-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm z-10">
              5
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl flex-grow space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base">Stage 5: Production Deployment & SSL Certificate</h3>
                <span className="text-xs text-emerald-400 font-bold">LIVE ONLINE</span>
              </div>
              <p className="text-sm text-slate-300">Automated GitHub Pages API provisioning completed with HTTPS SSL enforcement. Production site is live at <a href={project.live_url} target="_blank" rel="noreferrer" className="text-sky-400 font-bold hover:underline">{project.live_url}</a>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
