import { timingSafeEqual } from 'node:crypto'
import { createHash } from 'node:crypto'
import { z } from 'zod'

// ── Sanitization ─────────────────────────────────────────────────────────────

// Strip control characters (C0, DEL, C1) and collapse whitespace runs.
export function sanitizeText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !!url.hostname
  } catch {
    return false
  }
}

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

function deepSanitize(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeText(value)
  if (Array.isArray(value)) return value.map(deepSanitize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepSanitize(v)
    }
    return out
  }
  return value
}

// ── Schema (strict allowlist) ────────────────────────────────────────────────

const tsSchema = z.string().max(40).refine(s => ISO_TS.test(s), 'invalid timestamp')
const httpsUrl = z.string().max(2000).refine(isHttpsUrl, 'must be an https URL')

const todoSchema = z.object({
  content: z.string().min(1).max(500),
  state: z.enum(['open', 'done']).default('open'),
  position: z.number().int().min(0).max(100000).optional(),
}).strict()

const stageEventSchema = z.object({
  stage: z.string().max(100),
  note: z.string().max(500).optional(),
  occurred_at: tsSchema,
}).strict()

const agentStatusSchema = z.object({
  agent: z.enum(['pm-t310', 'dev-r510', 'security-r410']),
  state: z.string().max(50),
  summary: z.string().max(300).optional(),
  updated_at: tsSchema.optional(),
}).strict()

const previewSchema = z.object({
  version_kind: z.enum(['draft', 'staging', 'released']),
  url: httpsUrl,
  visible_to_client: z.boolean().default(false),
}).strict()

const clientRequestSchema = z.object({
  question: z.string().min(1).max(500),
  state: z.enum(['open', 'answered']).default('open'),
  visible_to_client: z.boolean().default(true),
}).strict()

const projectSchema = z.object({
  order_ref: z.string().min(1).max(120),
  client_id: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  current_stage: z.string().max(100).optional(),
  stage_label_layman: z.string().max(100).optional(),
  progress_pct: z.number().int().min(0).max(100).optional(),
  paused: z.boolean().optional(),
  current_milestone: z.string().max(200).optional(),
  next_milestone: z.string().max(200).optional(),
  preview_status: z.enum(['none', 'draft', 'staging', 'released']).optional(),
  github_repo: z.string().max(200).optional(),
  github_issue_url: httpsUrl.optional(),
  pr_url: httpsUrl.optional(),
  pr_checks_state: z.enum(['pending', 'passing', 'failing']).optional(),
  security_verdict: z.enum(['pending', 'pass', 'fail']).optional(),
  security_reviewed_sha: z.string().max(64).optional(),
  human_gate_url: httpsUrl.optional(),
  last_agent_update: tsSchema.optional(),
}).strict()

export const ingestSchema = z.object({
  project: projectSchema,
  todos: z.array(todoSchema).max(100).default([]),
  stage_events: z.array(stageEventSchema).max(100).default([]),
  agent_status: z.array(agentStatusSchema).max(3).default([]),
  previews: z.array(previewSchema).max(20).default([]),
  client_requests: z.array(clientRequestSchema).max(20).default([]),
}).strict()

export type IngestPayload = z.infer<typeof ingestSchema>

// ── Rate limiting (fixed window per token, in-memory) ────────────────────────

type Window = { start: number; count: number }
const windows = new Map<string, Window>()
const WINDOW_MS = 60_000

export function resetRateLimiterForTests() {
  windows.clear()
}

export function rateLimit(key: string, limit: number, now = Date.now()): boolean {
  const w = windows.get(key)
  if (!w || now - w.start >= WINDOW_MS) {
    windows.set(key, { start: now, count: 1 })
    return true
  }
  if (w.count >= limit) return false
  w.count += 1
  return true
}

// ── Token comparison (constant time) ────────────────────────────────────────

function tokenMatches(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

// ── Core handler ─────────────────────────────────────────────────────────────

export type IngestDeps = {
  expectedToken: string | undefined
  rateLimitPerMinute: number
  db: {
    from: (table: string) => {
      upsert: (values: Record<string, unknown>, opts?: { onConflict?: string }) => {
        select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      delete: () => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> }
      insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>
    }
  }
  now?: () => number
}

export type IngestResult = { status: 204 | 400 | 401 | 413 | 429 }

export const MAX_BODY_BYTES = 256 * 1024

export async function processIngest(
  deps: IngestDeps,
  input: { token?: string | null; rawBody: string },
): Promise<IngestResult> {
  const { expectedToken } = deps
  // Fail closed when the server has no token configured.
  if (!expectedToken || expectedToken.length < 32) return { status: 401 }

  if (!tokenMatches(input.token, expectedToken)) return { status: 401 }

  if (!rateLimit(
    createHash('sha256').update(expectedToken).digest('hex'),
    deps.rateLimitPerMinute,
    deps.now?.() ?? Date.now(),
  )) return { status: 429 }

  if (Buffer.byteLength(input.rawBody, 'utf8') > MAX_BODY_BYTES) return { status: 413 }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(input.rawBody)
  } catch {
    return { status: 400 }
  }

  const result = ingestSchema.safeParse(deepSanitize(parsedJson))
  if (!result.success) return { status: 400 }
  const payload = result.data

  const p = payload.project
  const projectRow: Record<string, unknown> = {
    order_ref: p.order_ref,
    title: p.title ?? null,
    current_stage: p.current_stage ?? null,
    stage_label_layman: p.stage_label_layman ?? null,
    progress_pct: p.progress_pct ?? null,
    paused: p.paused ?? false,
    current_milestone: p.current_milestone ?? null,
    next_milestone: p.next_milestone ?? null,
    preview_status: p.preview_status ?? 'none',
    github_repo: p.github_repo ?? null,
    github_issue_url: p.github_issue_url ?? null,
    pr_url: p.pr_url ?? null,
    pr_checks_state: p.pr_checks_state ?? null,
    security_verdict: p.security_verdict ?? 'pending',
    security_reviewed_sha: p.security_reviewed_sha ?? null,
    human_gate_url: p.human_gate_url ?? null,
    last_agent_update: p.last_agent_update ?? null,
    updated_at: new Date().toISOString(),
  }
  if (p.client_id !== undefined) projectRow.client_id = p.client_id

  const upsertRes = await deps.db.from('handoff_projects').upsert(projectRow, { onConflict: 'order_ref' }).select().single()
  if (upsertRes.error || !upsertRes.data) return { status: 400 }
  const projectId = upsertRes.data.id

  // Replace children wholesale for the project: repeat calls converge on the
  // same state (idempotent), no duplicate rows.
  const children: [string, Record<string, unknown>[]][] = [
    ['handoff_todos', payload.todos.map((t, i) => ({
      project_id: projectId,
      content: t.content,
      state: t.state,
      position: t.position ?? i,
    }))],
    ['handoff_stage_events', payload.stage_events.map(e => ({
      project_id: projectId,
      stage: e.stage,
      note: e.note ?? null,
      occurred_at: e.occurred_at,
    }))],
    ['handoff_agent_status', payload.agent_status.map(a => ({
      project_id: projectId,
      agent: a.agent,
      state: a.state,
      summary: a.summary ?? null,
      updated_at: a.updated_at ?? new Date().toISOString(),
    }))],
    ['handoff_previews', payload.previews.map(pr => ({
      project_id: projectId,
      version_kind: pr.version_kind,
      url: pr.url,
      visible_to_client: pr.visible_to_client,
    }))],
    ['handoff_client_requests', payload.client_requests.map(cr => ({
      project_id: projectId,
      question: cr.question,
      state: cr.state,
      visible_to_client: cr.visible_to_client,
    }))],
  ]

  for (const [table, rows] of children) {
    const del = await deps.db.from(table).delete().eq('project_id', projectId)
    if (del.error) return { status: 400 }
    if (rows.length > 0) {
      const ins = await deps.db.from(table).insert(rows)
      if (ins.error) return { status: 400 }
    }
  }

  return { status: 204 }
}
