import { requireAdmin } from '@/lib/require-admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import {
  Check,
  CircleDollarSign,
  Clock3,
  Code2,
  ExternalLink,
  GitBranch,
  Headphones,
  Mail,
  Pause,
  Play,
  ScanSearch,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react'

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
    <div className="projects-shell text-white font-sans">
      {/* Page Header Component (Normal Flow, No Absolute Positioning) */}
      <PageHeader
        title={project.name}
        description={project.description}
        backLink={{ href: '/projects', label: 'Back to Build Projects' }}
        badge={{ label: project.status, variant: 'purple' }}
      />

      {/* Action Bar (Flex Container with Consistent Gap & Wrapping) */}
      <div className="project-detail-actions">
        <a
          href={project.live_url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-purple"
        >
          <ExternalLink size={16} aria-hidden="true" /> Launch live site
        </a>
        <a
          href={project.github_repo}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          <GitBranch size={16} aria-hidden="true" /> Open GitHub repo
        </a>
        <a
          href="https://tty-purepulse.relayapp.pro"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          <Headphones size={16} aria-hidden="true" /> Command Center TTY
        </a>
      </div>

      {/* 4 Metric Cards (Responsive Grid with Consistent Padding & Containment) */}
      <div className="project-detail-stats">
        <StatTile
          label="Client Contact"
          value={<span className="project-contact-name">{project.client_name}</span>}
          subtext={project.client_email}
          icon={<UserRound size={17} />}
        />

        <StatTile
          label="Billable Time"
          value={`${project.billable_time.toFixed(2)} h`}
          subtext="Recorded build hours"
          icon={<Clock3 size={17} />}
        />

        <StatTile
          label="Recorded Work"
          value={`$${project.recorded_work.toFixed(2)}`}
          subtext={`Cap: $${project.spending_cap.toFixed(2)}`}
          icon={<CircleDollarSign size={17} />}
        />

        <StatTile
          label={`Spending Cap (${capUsedPct}% Used)`}
          value={`$${project.spending_cap.toFixed(2)}`}
          subtext={`${capUsedPct}% of $${project.spending_cap.toFixed(2)} cap`}
          icon={<WalletCards size={17} />}
        />
      </div>

      <section className="card project-pipeline-card" aria-labelledby="pipeline-title">
        <div className="project-section-heading">
          <div>
            <p className="section-eyebrow">Current workflow</p>
            <h2 id="pipeline-title">Build pipeline</h2>
          </div>
          <span className="project-updated">Active now</span>
        </div>

        <ol className="project-pipeline" aria-label="Project build pipeline">
          <li className="is-complete"><span><Check size={15} /></span><div><strong>Intake</strong><small>Brief received</small></div></li>
          <li className="is-complete"><span><Check size={15} /></span><div><strong>Project plan</strong><small>Scope prepared</small></div></li>
          <li className="is-active"><span><Code2 size={15} /></span><div><strong>Development</strong><small>Build in progress</small></div></li>
          <li><span><ShieldCheck size={15} /></span><div><strong>Security review</strong><small>Waiting</small></div></li>
          <li><span><ScanSearch size={15} /></span><div><strong>Human review</strong><small>Waiting</small></div></li>
        </ol>
      </section>

      {/* Manual Time Clock & QA Review Section */}
      <section className="card project-review-card">
          <div className="project-review-copy">
            <span className="section-eyebrow">Human review &amp; QA clock</span>
            <h2>Manual review time</h2>
            <p>
              Clock in to record active human review time for quality assurance, client feedback, or manual adjustments.
            </p>
            <a href={`mailto:${project.client_email}`} className="project-contact-link"><Mail size={14} /> {project.client_email}</a>
          </div>

          <div className="project-review-actions">
            <button type="button" className="btn btn-purple">
              <Play size={15} fill="currentColor" /> Clock in
            </button>
            <button type="button" className="btn btn-ghost">
              <Pause size={15} fill="currentColor" /> Clock out
            </button>
          </div>
      </section>
    </div>
  )
}
