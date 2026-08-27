import { NextRequest, NextResponse } from 'next/server'
import { selectAvailableCloudNode, CLOUD_NODES } from '@/lib/cloud-dispatcher'
import { requireAdmin } from '@/lib/require-admin'
import { adminSupabase } from '@/lib/supabase'
import { ensureGitHubRepository } from '@/lib/github-deployment'

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
    const { data: project, error: projectError } = await supabase
      .from('website_projects')
      .select('id,name,slug,state,github_repo')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) throw projectError
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const repository = await ensureGitHubRepository({
      name: project.slug || project.name,
      description: `PurePulse website build: ${project.name}`,
    })

    const { error: updateError } = await supabase
      .from('website_projects')
      .update({
        slug: repository.name,
        github_repo: repository.html_url,
        repository_provisioned_at: new Date().toISOString(),
      })
      .eq('id', project.id)
    if (updateError) throw updateError

    const { count } = await supabase
      .from('pipeline_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['queued', 'active'])

    const activeJobs = Math.max(0, (count || 0) % 3)
    const assignedNode = selectAvailableCloudNode(activeJobs)

    const { data: job, error: jobError } = await supabase
      .from('pipeline_jobs')
      .insert({
        project_id: project.id,
        stage: 'planning',
        status: 'queued',
        worker: `${assignedNode.provider}:${assignedNode.name}`,
        task: 'Create the website from the approved project brief and publish the build to the provisioned GitHub repository.',
        output_url: repository.html_url,
      })
      .select('id')
      .single()
    if (jobError) throw jobError

    return NextResponse.json({
      success: true,
      projectId,
      jobId: job.id,
      repositoryUrl: repository.html_url,
      assignedNode,
      allNodes: CLOUD_NODES,
      message: `Repository provisioned and build queued for ${assignedNode.name} (${assignedNode.provider.toUpperCase()})`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dispatch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
