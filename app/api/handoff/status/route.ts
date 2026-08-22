import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'
import { getPortalHandoffStatus } from '@/lib/handoff-status'

// Middleware leaves /api public; this handler self-gates. Portal users get a
// sanitized, tenant-scoped projection only; admins/anonymous get nothing here.
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  const db = adminSupabase()
  const result = await getPortalHandoffStatus(
    {
      async getPortalUser(authUserId) {
        const { data } = await db.from('portal_users').select('client_id').eq('auth_user_id', authUserId).maybeSingle()
        return (data as { client_id: string | null } | null) ?? null
      },
      async getClientProjects(clientId) {
        const { data, error } = await db
          .from('handoff_projects')
          .select('id,title,stage_label_layman,progress_pct,paused,current_milestone,next_milestone,preview_status,last_agent_update')
          .eq('client_id', clientId)
        if (error) return null
        return (data ?? []) as never
      },
      async getVisibleReleasedPreviewUrl(projectId) {
        const { data } = await db
          .from('handoff_previews')
          .select('url')
          .eq('project_id', projectId)
          .eq('visible_to_client', true)
          .eq('version_kind', 'released')
          .limit(1)
        const rows = (data ?? []) as { url: string }[]
        return rows[0]?.url ?? null
      },
      async getVisibleOpenRequests(projectId) {
        const { data } = await db
          .from('handoff_client_requests')
          .select('id,question')
          .eq('project_id', projectId)
          .eq('visible_to_client', true)
          .eq('state', 'open')
        return ((data ?? []) as { id: string; question: string }[])
      },
    },
    session ? { id: session.user.id } : null,
    req.nextUrl.searchParams.get('projectId'),
  )

  if (result.status === 200) {
    return NextResponse.json({ projects: result.projects }, { status: 200 })
  }
  if (result.status === 401) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (result.status === 404) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
