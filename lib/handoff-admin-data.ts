import { adminSupabase } from '@/lib/supabase'

// Admin-side server reads for the /handoff pages. Admin-convention users have
// RLS SELECT, but these pages run server-side with the service-role client so
// rendering does not depend on cookie forwarding to PostgREST.

export type HandoffProjectRow = {
  id: string
  order_ref: string
  client_id: string | null
  title: string | null
  current_stage: string | null
  stage_label_layman: string | null
  progress_pct: number | null
  paused: boolean
  current_milestone: string | null
  next_milestone: string | null
  preview_status: string | null
  github_repo: string | null
  github_issue_url: string | null
  pr_url: string | null
  pr_checks_state: string | null
  security_verdict: string | null
  security_reviewed_sha: string | null
  human_gate_url: string | null
  last_agent_update: string | null
  updated_at: string
}

export type HandoffAgentStatus = {
  id: string
  project_id: string | null
  agent: 'pm-t310' | 'dev-r510' | 'security-r410'
  state: string | null
  summary: string | null
  updated_at: string | null
}

export type HandoffTodo = { id: string; project_id: string; content: string; state: 'open' | 'done'; position: number | null }
export type HandoffStageEvent = { id: string; project_id: string; stage: string | null; note: string | null; occurred_at: string | null }
export type HandoffPreview = { id: string; project_id: string; version_kind: 'draft' | 'staging' | 'released'; url: string; visible_to_client: boolean; created_at: string }
export type HandoffAuditEvent = { id: string; project_id: string | null; actor: string | null; action: string | null; target: string | null; metadata: Record<string, unknown> | null; created_at: string }

const PROJECT_COLS = 'id,order_ref,client_id,title,current_stage,stage_label_layman,progress_pct,paused,current_milestone,next_milestone,preview_status,github_repo,github_issue_url,pr_url,pr_checks_state,security_verdict,security_reviewed_sha,human_gate_url,last_agent_update,updated_at'

export async function listHandoffProjects(): Promise<HandoffProjectRow[]> {
  const db = adminSupabase()
  const { data, error } = await db.from('handoff_projects').select(PROJECT_COLS).order('updated_at', { ascending: false })
  if (error) return []
  return (data ?? []) as HandoffProjectRow[]
}

export type ProjectDetail = {
  project: HandoffProjectRow
  todos: HandoffTodo[]
  stageEvents: HandoffStageEvent[]
  agentStatus: HandoffAgentStatus[]
  previews: HandoffPreview[]
  auditEvents: HandoffAuditEvent[]
}

export async function getHandoffProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const db = adminSupabase()
  const { data: project, error } = await db.from('handoff_projects').select(PROJECT_COLS).eq('id', projectId).maybeSingle()
  if (error || !project) return null

  const [{ data: todos }, { data: events }, { data: agents }, { data: previews }, { data: audits }] = await Promise.all([
    db.from('handoff_todos').select('id,project_id,content,state,position').eq('project_id', projectId).order('position'),
    db.from('handoff_stage_events').select('id,project_id,stage,note,occurred_at').eq('project_id', projectId).order('occurred_at'),
    db.from('handoff_agent_status').select('id,project_id,agent,state,summary,updated_at').eq('project_id', projectId),
    db.from('handoff_previews').select('id,project_id,version_kind,url,visible_to_client,created_at').eq('project_id', projectId),
    db.from('handoff_audit_events').select('id,project_id,actor,action,target,metadata,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
  ])

  return {
    project: project as HandoffProjectRow,
    todos: (todos ?? []) as HandoffTodo[],
    stageEvents: (events ?? []) as HandoffStageEvent[],
    agentStatus: ((agents ?? []) as HandoffAgentStatus[]).filter(a => !a.project_id || a.project_id === projectId),
    previews: (previews ?? []) as HandoffPreview[],
    auditEvents: (audits ?? []) as HandoffAuditEvent[],
  }
}

export const STALE_MS = 15 * 60 * 1000

export function isStale(lastAgentUpdate: string | null, now = Date.now()): boolean {
  if (!lastAgentUpdate) return true
  const ts = Date.parse(lastAgentUpdate)
  return Number.isNaN(ts) || now - ts > STALE_MS
}
