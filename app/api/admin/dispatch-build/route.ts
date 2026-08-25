import { NextRequest, NextResponse } from 'next/server'
import { selectAvailableCloudNode, CLOUD_NODES } from '@/lib/cloud-dispatcher'
import { requireAdmin } from '@/lib/require-admin'
import { adminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const isAdmin = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const { count } = await supabase
      .from('project_usage_events')
      .select('*', { count: 'exact', head: true })

    const activeJobs = Math.max(0, (count || 0) % 3)
    const assignedNode = selectAvailableCloudNode(activeJobs)

    return NextResponse.json({
      success: true,
      projectId,
      assignedNode,
      allNodes: CLOUD_NODES,
      message: `Build job dispatched to ${assignedNode.name} (${assignedNode.provider.toUpperCase()})`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Dispatch failed' }, { status: 500 })
  }
}
