import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const { endpoint, p256dh, auth } = await req.json()
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const serverSupabase = await createServerSupabaseClient()
  const { data: { session } } = await serverSupabase.auth.getSession()

  const supabase = adminSupabase()
  const userAgent = req.headers.get('user-agent') ?? undefined

  await supabase.from('push_subscriptions').upsert(
    {
      endpoint,
      p256dh,
      auth,
      user_id: session?.user.id ?? null,
      user_agent: userAgent,
    },
    { onConflict: 'endpoint' },
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  const supabase = adminSupabase()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
