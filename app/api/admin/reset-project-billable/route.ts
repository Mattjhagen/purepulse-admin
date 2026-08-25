import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = adminSupabase()
  const projectId = '6b2a8538-a410-4423-b09c-5d2ffe12c50a'
  
  // 1. Delete legacy test usage events for this project
  await supabase
    .from('project_usage_events')
    .delete()
    .eq('project_id', projectId)

  // 2. Insert clean usage event for 1.35 hours (4860 seconds)
  await supabase
    .from('project_usage_events')
    .insert({
      project_id: projectId,
      seconds: 4860,
      cost_cents: 3375,
      description: 'Automated AI Development & Quality Verification',
      recorded_at: new Date().toISOString(),
    })

  // 3. Set billable_seconds in website_projects
  const { data, error } = await supabase
    .from('website_projects')
    .update({ billable_seconds: 4860, state: 'building' })
    .eq('id', projectId)
    .select()

  return NextResponse.json({ success: true, project: data, error: error?.message })
}
