import { NextResponse } from 'next/server'
import { cleanupTestAffiliates } from '@/lib/cleanup-test-affiliates'

export async function GET() {
  try {
    const results = await cleanupTestAffiliates()
    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clean up test affiliates'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
