import { NextRequest, NextResponse } from 'next/server'
import { processIngest, type IngestDeps } from '@/lib/handoff-ingest'
import { adminSupabase } from '@/lib/supabase'

// Middleware leaves /api public; this handler self-gates with a bearer token.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const result = await processIngest(
    {
      expectedToken: process.env.HANDOFF_INGEST_TOKEN,
      rateLimitPerMinute: Number(process.env.HANDOFF_INGEST_RATE_LIMIT || '120'),
      db: adminSupabase() as unknown as IngestDeps['db'],
    },
    { token, rawBody },
  )

  return new NextResponse(null, { status: result.status })
}
