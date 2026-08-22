import { NextRequest, NextResponse } from 'next/server'
import { resolveHandoffAdmin, originMatchesAppUrl } from '@/lib/handoff-admin'
import { processAction, type ActionsDeps } from '@/lib/handoff-actions'
import { adminSupabase } from '@/lib/supabase'

// Middleware leaves /api public; this handler self-gates:
// 401 unauthenticated, 403 not a handoff admin / bad Origin, 400 missing
// Idempotency-Key, then the core validates and persists (never executes).
export async function POST(req: NextRequest) {
  const resolution = await resolveHandoffAdmin()
  if (resolution.kind === 'none') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (resolution.kind !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!originMatchesAppUrl(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const idempotencyKey = req.headers.get('idempotency-key')
  if (!idempotencyKey || idempotencyKey.length === 0 || idempotencyKey.length > 128) {
    return NextResponse.json({ error: 'Idempotency-Key header required' }, { status: 400 })
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const result = await processAction(
    { db: adminSupabase() as unknown as ActionsDeps['db'] },
    { userId: resolution.userId, email: resolution.email },
    { rawBody, idempotencyKey },
  )

  if (result.status === 202) {
    return NextResponse.json({ commandId: result.commandId }, { status: 202 })
  }
  if (result.status === 200) {
    return NextResponse.json({ commandId: result.commandId, duplicate: true }, { status: 200 })
  }
  if (result.status === 404) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
