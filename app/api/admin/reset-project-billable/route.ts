import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = adminSupabase()
  const projectId = '6b2a8538-a410-4423-b09c-5d2ffe12c50a'
  
  // Set billable_seconds to 4860 (1.35 hours @ $25/hr = $33.75)
  const { data, error } = await supabase
    .from('website_projects')
    .update({ billable_seconds: 4860, state: 'building' })
    .eq('id', projectId)
    .select()

  return NextResponse.json({ success: true, project: data, error: error?.message })
}
