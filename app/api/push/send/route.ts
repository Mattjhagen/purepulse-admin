import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!,
  )
}

export async function POST(req: NextRequest) {
  const { title, body, url, tag, user_id } = await req.json()

  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const supabase = adminSupabase()
  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth, id')
  if (user_id) query = query.eq('user_id', user_id)

  const { data: subscriptions } = await query

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const payload = { title, body, url: url || '/dashboard', tag }
  const staleIds: string[] = []

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const alive = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      )
      if (!alive) staleIds.push(sub.id)
      return alive
    })
  )

  // Clean up expired subscriptions
  if (staleIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
  return NextResponse.json({ sent, total: subscriptions.length, stale: staleIds.length })
}
