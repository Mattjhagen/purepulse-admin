import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/require-admin'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
  const supabase = hasServiceRole ? adminSupabase() : await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const {
    scores,
    evaluation_matrix,
    admin_notes,
    recommendation,
    status,
  } = body

  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
  const supabase = hasServiceRole ? adminSupabase() : await createServerSupabaseClient()


  // Calculate overall score from scores object if present
  let overallScore = 0
  if (scores && typeof scores === 'object') {
    Object.values(scores).forEach((val) => {
      if (typeof val === 'number') overallScore += val
    })
  }

  // Derive status from recommendation if not provided
  let newStatus = status
  if (!newStatus && recommendation) {
    if (recommendation === 'strong_hire') newStatus = 'strong_hire'
    else if (recommendation === 'hire_with_training') newStatus = 'hire_with_training'
    else if (recommendation === 'keep_on_file') newStatus = 'keep_on_file'
    else if (recommendation === 'do_not_proceed') newStatus = 'rejected'
  }

  const updatePayload: Record<string, unknown> = {
    reviewed_at: new Date().toISOString(),
  }

  if (scores !== undefined) {
    updatePayload.scores = scores
    updatePayload.overall_score = overallScore
  }
  if (evaluation_matrix !== undefined) updatePayload.evaluation_matrix = evaluation_matrix
  if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes
  if (recommendation !== undefined) updatePayload.recommendation = recommendation
  if (newStatus !== undefined) updatePayload.status = newStatus

  const { data, error } = await supabase
    .from('interviews')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
