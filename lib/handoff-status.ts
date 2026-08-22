// Portal-side read path: maps a portal session -> portal_users.client_id ->
// that client's own handoff_projects rows only. RLS denies portal users any
// direct handoff_* access by design, so reads happen server-side after the
// tenant mapping is verified. Cross-tenant ids return not-found. The
// projection deliberately excludes producer internals: prompts, process
// commands, hosts, private GitHub links, findings, logs, other customers,
// telemetry.

export type PortalProjectRow = {
  id: string
  title: string | null
  stage_label_layman: string | null
  progress_pct: number | null
  paused: boolean
  current_milestone: string | null
  next_milestone: string | null
  preview_status: string | null
  last_agent_update: string | null
}

export type PortalProjectStatus = PortalProjectRow & {
  released_preview_url: string | null
  open_requests: { id: string; question: string }[]
}

export type StatusResult =
  | { status: 200; projects: PortalProjectStatus[] }
  | { status: 401 }
  | { status: 403 }
  | { status: 404 }

export type PortalStatusDeps = {
  getPortalUser: (authUserId: string) => Promise<{ client_id: string | null } | null>
  getClientProjects: (clientId: string) => Promise<PortalProjectRow[] | null>
  getVisibleReleasedPreviewUrl: (projectId: string) => Promise<string | null>
  getVisibleOpenRequests: (projectId: string) => Promise<{ id: string; question: string }[]>
}

export async function getPortalHandoffStatus(
  deps: PortalStatusDeps,
  sessionUser: { id: string } | null,
  requestedProjectId?: string | null,
): Promise<StatusResult> {
  if (!sessionUser) return { status: 401 }

  const pu = await deps.getPortalUser(sessionUser.id)
  const clientId = pu?.client_id
  if (!clientId) return { status: 403 }

  if (requestedProjectId) {
    // Tenant isolation: an id belonging to another client is not-found.
    const projects = await deps.getClientProjects(clientId)
    if (!projects || !projects.some(p => p.id === requestedProjectId)) {
      return { status: 404 }
    }
  }

  const rows = await deps.getClientProjects(clientId)
  if (!rows) return { status: 403 }

  const out: PortalProjectStatus[] = []
  for (const row of rows) {
    const releasedUrl = row.preview_status === 'released'
      ? await deps.getVisibleReleasedPreviewUrl(row.id)
      : null
    out.push({
      ...row,
      released_preview_url: releasedUrl,
      open_requests: await deps.getVisibleOpenRequests(row.id),
    })
  }

  return { status: 200, projects: out }
}

export function isForbiddenPortalContent(text: string): boolean {
  const forbidden = [
    /prompt/i,
    /command/i,
    /\bhost\b/i,
    /github\.com\//i,
    /finding/i,
    /\blog(s)?\b/i,
    /telemetry/i,
    /api[_-]?key/i,
    /token/i,
  ]
  return forbidden.some(re => re.test(text))
}
