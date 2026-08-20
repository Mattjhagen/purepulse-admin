import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import type { Plan } from '@/lib/types'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

// How many deliverables to generate per plan tier per run
const DELIVERABLE_COUNT: Record<Plan, number> = {
  starter:  2,
  growth:   4,
  premium:  6,
  business: 8,
}

const DELIVERABLE_TYPES_BY_PLAN: Record<Plan, string[]> = {
  starter:  ['social_post', 'webpage'],
  growth:   ['social_post', 'social_post', 'blog_post', 'seo_report'],
  premium:  ['social_post', 'social_post', 'social_post', 'blog_post', 'email', 'ad_copy'],
  business: ['social_post', 'social_post', 'social_post', 'blog_post', 'email', 'ad_copy', 'strategy_doc', 'analytics_report'],
}

const PLATFORMS_BY_TYPE: Record<string, string> = {
  social_post:      'instagram',
  blog_post:        'website',
  webpage:          'website',
  ad_copy:          'google',
  email:            'email',
  graphic_brief:    'instagram',
  video_script:     'instagram',
  seo_report:       'website',
  analytics_report: 'website',
  strategy_doc:     'website',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const supabase = adminSupabase()

  // Load campaign + brief + first milestone
  const { data: campaign, error: campaignErr } = await supabase
    .from('campaigns')
    .select(`
      id, name, plan, client_id,
      campaign_briefs(business_name, industry, location, target_audience, unique_value_prop, tone, goals, ai_summary),
      milestones(id, title, sort_order, status)
    `)
    .eq('id', campaignId)
    .single()

  if (campaignErr || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const plan = campaign.plan as Plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brief = Array.isArray(campaign.campaign_briefs) ? (campaign.campaign_briefs as any[])[0] : campaign.campaign_briefs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const milestones = (campaign.milestones as any[]) ?? []
  const activeMilestone = milestones.find((m: { status: string }) => m.status === 'in_progress') ?? milestones[0]

  const count = DELIVERABLE_COUNT[plan]
  const types = DELIVERABLE_TYPES_BY_PLAN[plan]

  // Build the prompt
  const businessContext = brief
    ? [
        brief.business_name    && `Business: ${brief.business_name}`,
        brief.industry         && `Industry: ${brief.industry}`,
        brief.location         && `Location: ${brief.location}`,
        brief.target_audience  && `Target audience: ${brief.target_audience}`,
        brief.unique_value_prop && `Unique value: ${brief.unique_value_prop}`,
        brief.tone?.length     && `Tone: ${brief.tone.join(', ')}`,
        brief.goals?.length    && `Goals: ${brief.goals.join(', ')}`,
        brief.ai_summary       && `Brand summary: ${brief.ai_summary}`,
      ].filter(Boolean).join('\n')
    : `Business name: ${campaign.name}\nPlan: ${plan}`

  const deliverableList = types.slice(0, count).map((type, i) => `${i + 1}. ${type}`).join('\n')

  const systemPrompt = `You are an expert marketing strategist and copywriter for small businesses.
You generate polished, conversion-focused marketing content. Always match the brand's tone.
Return ONLY valid JSON — no markdown, no explanation.`

  const userPrompt = `Generate ${count} marketing deliverables for this client.

CLIENT CONTEXT:
${businessContext}

DELIVERABLES TO GENERATE (in this order):
${deliverableList}

Return a JSON array where each item has:
- "title": short descriptive title (e.g. "Instagram launch post — grand opening")
- "type": the deliverable type from the list above
- "platform": best platform (instagram | facebook | linkedin | x | google | website | email)
- "ai_content": object containing relevant fields for the type:
  - For social_post: { "caption": string, "hashtags": string[], "cta": string, "visual_direction": string }
  - For blog_post: { "headline": string, "subheadline": string, "intro": string, "outline": string[], "cta": string }
  - For webpage: { "headline": string, "subheadline": string, "body": string, "cta": string }
  - For ad_copy: { "headline": string, "description": string, "cta": string, "keywords": string[] }
  - For email: { "subject": string, "preview_text": string, "headline": string, "body": string, "cta": string }
  - For seo_report: { "focus_keywords": string[], "page_title": string, "meta_description": string, "h1": string, "recommendations": string[] }
  - For analytics_report: { "summary": string, "highlights": string[], "recommendations": string[] }
  - For strategy_doc: { "executive_summary": string, "goals": string[], "channels": string[], "content_pillars": string[], "kpis": string[] }
- "ai_prompt": one sentence describing what was requested`

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let deliverables: Array<{
    title: string
    type: string
    platform: string
    ai_content: Record<string, unknown>
    ai_prompt: string
  }>

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    deliverables = JSON.parse(text)
    if (!Array.isArray(deliverables)) throw new Error('Response is not an array')
  } catch (err) {
    console.error('[campaigns/generate] AI error:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }

  // Write deliverables to Supabase
  const rows = deliverables.map(d => ({
    campaign_id:  campaignId,
    milestone_id: activeMilestone?.id ?? null,
    title:        d.title,
    type:         d.type,
    platform:     d.platform ?? PLATFORMS_BY_TYPE[d.type] ?? 'website',
    status:       'ai_generated',
    ai_prompt:    d.ai_prompt,
    ai_content:   d.ai_content,
  }))

  const { data: inserted, error: insertErr } = await supabase
    .from('deliverables')
    .insert(rows)
    .select('id, title, type, status')

  if (insertErr) {
    console.error('[campaigns/generate] insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to save deliverables' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: inserted?.length ?? 0, deliverables: inserted })
}
