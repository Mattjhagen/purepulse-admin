import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppSession } from '@/lib/session'

const ALLOWED_TYPES = new Set(['recruitment', 'marketing', 'advertising', 'announcement', 'general'])
const ALLOWED_PLATFORMS = new Set(['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'email'])

async function authorized() {
  const appSession = await getAppSession()
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = appSession?.email || user?.email || ''
  const role = appSession?.role || user?.user_metadata?.role || ''
  const allowed = ['admin', 'manager'].includes(String(role).toLowerCase()) || ['admin@purepulse.one', 'matty@purepulse.one', 'mattjhagen0@gmail.com'].includes(email.toLowerCase())
  return allowed ? { userId: appSession?.id || user?.id || null } : null
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await adminSupabase().from('campaign_social_posts').select('*').order('scheduled_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load campaign posts' }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await authorized()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : ''
  const content = typeof body?.body === 'string' ? body.body.trim().slice(0, 10000) : ''
  const type = typeof body?.campaign_type === 'string' && ALLOWED_TYPES.has(body.campaign_type) ? body.campaign_type : 'marketing'
  const platforms = Array.isArray(body?.platforms) ? body.platforms.filter((p): p is string => typeof p === 'string' && ALLOWED_PLATFORMS.has(p)) : []
  const scheduledAt = typeof body?.scheduled_at === 'string' && body.scheduled_at ? body.scheduled_at : null
  if (!title || !content) return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 })
  if (!platforms.length) return NextResponse.json({ error: 'Choose at least one destination.' }, { status: 400 })
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) return NextResponse.json({ error: 'Invalid schedule time.' }, { status: 400 })
  const demoMode = body?.demo_mode !== false
  const attributionUrl = type === 'recruitment' ? 'https://login.purepulse.one/affiliates/apply' : null
  const admin = adminSupabase()
  let campaignId = typeof body?.campaign_id === 'string' ? body.campaign_id : null
  if (!campaignId) {
    const { data: campaign, error: campaignError } = await admin.from('campaigns').insert({ name: title, plan: 'internal', status: 'draft', goals: [type] }).select('id').single()
    if (campaignError || !campaign) return NextResponse.json({ error: 'Unable to create campaign.' }, { status: 500 })
    campaignId = campaign.id
  }
  const { data, error } = await admin.from('campaign_social_posts').insert({
    campaign_id: campaignId, title, body: content, campaign_type: type, platforms, scheduled_at: scheduledAt,
    timezone: typeof body?.timezone === 'string' ? body.timezone : 'America/Chicago',
    demo_mode: demoMode, status: scheduledAt ? 'scheduled' : 'draft', attribution_url: attributionUrl, created_by: auth.userId,
  }).select('*').single()
  if (error) return NextResponse.json({ error: 'Unable to save campaign post.' }, { status: 500 })
  return NextResponse.json({ post: data }, { status: 201 })
}
