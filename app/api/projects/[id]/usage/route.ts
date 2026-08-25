import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { duration_seconds = 60, activity = 'AI Agent Execution', node_id = 'cloud-dev' } = body

    const supabase = adminSupabase()

    // 1. Fetch project details
    const { data: project, error: projErr } = await supabase
      .from('website_projects')
      .select('id, billable_seconds, hourly_rate_cents, spending_cap_cents, state')
      .eq('id', id)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const secondsToAdd = Math.max(1, Number(duration_seconds) || 60)
    const newBillableSeconds = Number(project.billable_seconds || 0) + secondsToAdd
    const hourlyRateCents = Number(project.hourly_rate_cents || 2500)
    const costCents = Math.round((secondsToAdd * hourlyRateCents) / 3600)
    const totalCostCents = Math.round((newBillableSeconds * hourlyRateCents) / 3600)
    const hardCapCents = Number(project.spending_cap_cents || 50000)

    let newState = project.state
    if (totalCostCents >= hardCapCents && project.state !== 'paused_cap_reached') {
      newState = 'paused_cap_reached'
    }

    // 2. Update website_projects billable_seconds & state
    await supabase
      .from('website_projects')
      .update({
        billable_seconds: newBillableSeconds,
        state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    // 3. Record usage event in project_usage_events
    try {
      await supabase.from('project_usage_events').insert({
        id: crypto.randomUUID(),
        project_id: id,
        seconds: secondsToAdd,
        hourly_rate_cents: hourlyRateCents,
        cost_cents: costCents,
        node_id,
        notes: activity,
        recorded_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[api/projects/usage] usage insert warning:', e)
    }

    return NextResponse.json({
      success: true,
      project_id: id,
      billable_seconds: newBillableSeconds,
      billable_hours: (newBillableSeconds / 3600).toFixed(2),
      recorded_cost_cents: totalCostCents,
      recorded_cost: (totalCostCents / 100).toFixed(2),
      spending_cap: (hardCapCents / 100).toFixed(2),
      state: newState,
    })
  } catch (err) {
    console.error('[api/projects/usage] Exception:', err)
    return NextResponse.json({ error: 'Failed recording usage' }, { status: 500 })
  }
}
