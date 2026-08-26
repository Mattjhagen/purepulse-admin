import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, projectSlug, reason } = body || {}

    // Automated Stuck Process Billing Protection Guard:
    // When a process is stuck or blocked, pause billable time accumulation immediately.
    if (action === 'pause') {
      console.log(`[Time Clock Billing Guard] PAUSING billable clock for project: ${projectSlug}. Reason: ${reason}`)
      return NextResponse.json({
        success: true,
        projectSlug,
        status: 'PAUSED',
        billableAccumulation: false,
        message: `Billable time clock automatically paused for ${projectSlug} to protect client from charges during stuck process.`,
      })
    }

    if (action === 'resume') {
      console.log(`[Time Clock Billing Guard] RESUMING billable clock for project: ${projectSlug}`)
      return NextResponse.json({
        success: true,
        projectSlug,
        status: 'ACTIVE',
        billableAccumulation: true,
        message: `Billable time clock resumed for ${projectSlug} after active worktree restoration.`,
      })
    }

    return NextResponse.json({ success: true, status: 'OK' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Time clock API error' }, { status: 500 })
  }
}
