import type { Plan } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// Milestone templates per plan tier — ordered phases for the first 12 months.
// Higher tiers include all lower-tier milestones plus extras.
const MILESTONE_TEMPLATES: Record<Plan, Array<{ title: string; description: string; daysFromNow: number }>> = {
  starter: [
    { title: 'Kickoff & discovery',        description: 'Intro call to align on goals, gather assets, and confirm site structure.',  daysFromNow: 3  },
    { title: 'Website build',              description: 'Design and develop your site. First draft delivered for review.',            daysFromNow: 21 },
    { title: 'Revisions & launch',         description: 'Up to 2 rounds of feedback, then domain connection and go-live.',           daysFromNow: 35 },
    { title: 'Month 1 check-in',           description: 'Review traffic baseline and confirm any content updates.',                   daysFromNow: 60 },
  ],
  growth: [
    { title: 'Kickoff & discovery',        description: 'Intro call to align on goals, gather assets, and confirm site structure.',  daysFromNow: 3  },
    { title: 'Website build',              description: 'Design and develop your site. First draft delivered for review.',            daysFromNow: 21 },
    { title: 'Revisions & launch',         description: 'Up to 2 rounds of feedback, then domain connection and go-live.',           daysFromNow: 35 },
    { title: 'SEO foundation',             description: 'Keyword research, on-page optimization, Google Search Console setup.',      daysFromNow: 42 },
    { title: 'Month 1 check-in',           description: 'Review traffic baseline, first analytics report, plan content updates.',    daysFromNow: 60 },
    { title: 'Ongoing monthly review',     description: 'Monthly report: traffic, rankings, site performance, and next actions.',    daysFromNow: 90 },
  ],
  premium: [
    { title: 'Kickoff & discovery',        description: 'Deep-dive strategy session: brand voice, audience, competitor landscape.',  daysFromNow: 3  },
    { title: 'Website build',              description: 'Custom design and development. First draft delivered for review.',           daysFromNow: 21 },
    { title: 'Revisions & launch',         description: 'Up to 3 rounds of feedback, then domain connection and go-live.',           daysFromNow: 35 },
    { title: 'SEO foundation',             description: 'Keyword research, on-page optimization, Google Search Console setup.',      daysFromNow: 42 },
    { title: 'Content & social launch',    description: 'First batch of AI-drafted social posts and blog content for review.',       daysFromNow: 50 },
    { title: 'Month 1 check-in',           description: 'Analytics report, social performance review, content calendar preview.',    daysFromNow: 60 },
    { title: 'Quarterly design refresh',   description: 'Visual refresh pass — updated hero, seasonal copy, new photos if needed.', daysFromNow: 120 },
    { title: 'Ongoing monthly review',     description: 'Monthly: analytics, SEO rankings, content approval, performance actions.', daysFromNow: 90 },
  ],
  business: [
    { title: 'Kickoff & strategy session', description: 'Full brand strategy: positioning, voice, audience, 90-day content plan.',  daysFromNow: 3  },
    { title: 'Website build',              description: 'Custom design and development. First draft delivered for review.',           daysFromNow: 21 },
    { title: 'Revisions & launch',         description: 'Up to 3 rounds of feedback, then domain connection and go-live.',           daysFromNow: 35 },
    { title: 'SEO & local search',         description: 'Full SEO audit, keyword map, Google Business Profile, citations.',         daysFromNow: 42 },
    { title: 'Content & social launch',    description: 'First batch of AI-drafted social posts and blog content for review.',       daysFromNow: 50 },
    { title: 'Month 1 check-in',           description: 'Analytics report, social review, ad copy drafts, next-month plan.',        daysFromNow: 60 },
    { title: '2 hrs custom work',          description: 'Scheduled block for custom development, design, or copy — your call.',     daysFromNow: 75 },
    { title: 'Quarterly planning call',    description: 'Review Q1 results, set Q2 goals, update content strategy.',                daysFromNow: 120 },
    { title: 'Ongoing monthly review',     description: 'Monthly: analytics, SEO, content, performance reviews, custom work block.', daysFromNow: 90 },
  ],
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function bootstrapCampaign(
  supabase: SupabaseClient,
  contractId: string,
  clientId: string,
  clientName: string,
  plan: Plan,
): Promise<string | null> {
  const templates = MILESTONE_TEMPLATES[plan]

  const { data: campaign, error: campaignErr } = await supabase
    .from('campaigns')
    .insert({
      contract_id: contractId,
      client_id: clientId,
      name: `${clientName} — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Campaign`,
      plan,
      status: 'active',
    })
    .select('id')
    .single()

  if (campaignErr || !campaign) {
    console.error('[campaign-bootstrap] failed to create campaign:', campaignErr)
    return null
  }

  const milestoneRows = templates.map((t, i) => ({
    campaign_id: campaign.id,
    title: t.title,
    description: t.description,
    sort_order: i,
    due_date: addDays(t.daysFromNow),
    status: i === 0 ? 'in_progress' : 'pending',
  }))

  const { error: msErr } = await supabase.from('milestones').insert(milestoneRows)
  if (msErr) console.error('[campaign-bootstrap] failed to insert milestones:', msErr)

  return campaign.id
}
