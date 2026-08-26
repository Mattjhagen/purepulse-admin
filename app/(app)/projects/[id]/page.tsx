import { requireAdmin } from '@/lib/require-admin'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'

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
    <div className="max-w-7xl mx-auto space-y-6 text-white font-sans min-w-0">
      {/* Page Header Component (Normal Flow, No Absolute Positioning) */}
      <PageHeader
        title={project.name}
        description={project.description}
        backLink={{ href: '/projects', label: 'Back to Build Projects' }}
        badge={{ label: project.status, variant: 'purple' }}
      />

      {/* Action Bar (Flex Container with Consistent Gap & Wrapping) */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={project.live_url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-purple"
        >
          🌐 Launch Live Site (GitHub Pages) ↗
        </a>
        <a
          href={project.github_repo}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          📦 Open GitHub Repo ↗
        </a>
        <a
          href="https://tty-purepulse.relayapp.pro"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          🎛️ Command Center TTY ↗
        </a>
      </div>

      {/* 4 Metric Cards (Responsive Grid with Consistent Padding & Containment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Client Contact"
          value={<span className="truncate block text-lg font-bold">{project.client_name}</span>}
          subtext={project.client_email}
          icon="👤"
        />

        <StatTile
          label="Billable Time"
          value={`⏱ ${project.billable_time.toFixed(2)} h`}
          subtext="Recorded build hours"
          icon="⏱"
        />

        <StatTile
          label="Recorded Work"
          value={`$${project.recorded_work.toFixed(2)}`}
          subtext={`Cap: $${project.spending_cap.toFixed(2)}`}
          icon="$"
        />

        <StatTile
          label={`Spending Cap (${capUsedPct}% Used)`}
          value={`$${project.spending_cap.toFixed(2)}`}
          subtext={`${capUsedPct}% of $500.00 cap`}
          icon="📊"
        />
      </div>

      {/* Manual Time Clock & QA Review Section */}
      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">
              HUMAN REVIEW & QA CLOCK
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Manual Time Clock & QA Review</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Clock in to record active human review time for quality assurance, client feedback, or manual adjustments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button type="button" className="btn btn-purple">
              ⏱️ Clock In for Human Review
            </button>
            <button type="button" className="btn btn-ghost">
              🛑 Clock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
