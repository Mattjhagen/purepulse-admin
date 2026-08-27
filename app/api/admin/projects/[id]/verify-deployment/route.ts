import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { verifyGitHubPages } from '@/lib/github-deployment'
import { adminSupabase } from '@/lib/supabase'

function repositoryCoordinates(url: string) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return null
  const [owner, repo] = parsed.pathname.split('/').filter(Boolean)
  return owner && repo ? { owner, repo: repo.replace(/\.git$/, '') } : null
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const supabase = adminSupabase()
  const { data: project, error } = await supabase
    .from('website_projects')
    .select('id,github_repo')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!project?.github_repo) {
    return NextResponse.json({ error: 'The project does not have a provisioned repository' }, { status: 409 })
  }

  const coordinates = repositoryCoordinates(project.github_repo)
  if (!coordinates) return NextResponse.json({ error: 'The stored repository URL is invalid' }, { status: 409 })

  const pages = await verifyGitHubPages(coordinates)
  if (!pages?.url) {
    return NextResponse.json({ error: 'GitHub Pages is not enabled or has not finished publishing' }, { status: 409 })
  }

  const { error: updateError } = await supabase
    .from('website_projects')
    .update({
      live_url: pages.url,
      pages_verified_at: new Date().toISOString(),
      state: pages.status === 'built' ? 'live' : 'deploying',
    })
    .eq('id', project.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true, liveUrl: pages.url, status: pages.status })
}
