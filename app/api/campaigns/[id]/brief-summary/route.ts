import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const body = await req.json()

  const {
    business_name,
    industry,
    location,
    target_audience,
    unique_value_prop,
    tone,
    competitors,
    goals,
  } = body

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Write a concise one-paragraph brand brief for a business based on the following intake form responses. This paragraph will be used to guide AI-generated marketing content — make it specific, voice-rich, and actionable.

Business: ${business_name ?? 'Unknown'}
Industry: ${industry ?? 'Unknown'}
Location: ${location ?? 'Not specified'}
Target audience: ${target_audience ?? 'Not specified'}
Unique value proposition: ${unique_value_prop ?? 'Not specified'}
Brand tone: ${Array.isArray(tone) && tone.length ? tone.join(', ') : 'Not specified'}
Goals: ${Array.isArray(goals) && goals.length ? goals.join(', ') : 'Not specified'}
Competitors: ${Array.isArray(competitors) && competitors.length ? competitors.join(', ') : 'Not specified'}

Return ONLY the paragraph — no headings, no labels, no extra text.`

  let ai_summary = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    ai_summary = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  } catch (err) {
    console.error('[brief-summary] AI error:', err)
    // Non-fatal — save brief without summary
  }

  // Upsert the campaign brief
  const supabase = adminSupabase()
  const { data: existing } = await supabase
    .from('campaign_briefs')
    .select('id')
    .eq('campaign_id', campaignId)
    .single()

  const briefPayload = {
    campaign_id: campaignId,
    business_name,
    industry,
    location,
    target_audience,
    unique_value_prop,
    tone: tone ?? [],
    competitors: competitors ?? [],
    goals: goals ?? [],
    raw_intake: body,
    ai_summary,
    updated_at: new Date().toISOString(),
  }

  let error
  if (existing?.id) {
    ;({ error } = await supabase.from('campaign_briefs').update(briefPayload).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('campaign_briefs').insert(briefPayload))
  }

  if (error) {
    console.error('[brief-summary] save error:', error)
    return NextResponse.json({ error: 'Failed to save brief' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ai_summary })
}
