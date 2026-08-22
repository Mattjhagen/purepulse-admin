import { z } from 'zod'

export const ACTION_VALUES = ['pause', 'resume', 'retry_request', 'escalate', 'handoff_approve'] as const

const actionSchema = z.object({
  action: z.enum(ACTION_VALUES),
  projectId: z.string().uuid(),
}).strict()

export type ActionBody = z.infer<typeof actionSchema>

// HTTP gate code for an admin resolution: 401 unauthenticated, 403 forbidden,
// 0 = proceed. Kept here (zod-only module) so it stays unit-testable without
// pulling next/headers.
export type AdminResolution =
  | { kind: 'none' }
  | { kind: 'not-allowlisted'; email: string }
  | { kind: 'portal-user' }
  | { kind: 'admin'; userId: string; email: string }

export function adminGateCode(r: AdminResolution): 401 | 403 | 0 {
  if (r.kind === 'none') return 401
  if (r.kind === 'admin') return 0
  return 403
}

export type ActionsAdmin = { userId: string; email: string }

export type ActionsDeps = {
  db: {
    from: (table: string) => {
      select: (cols?: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
        }
      }
      insert: (row: Record<string, unknown>) => {
        select: () => { single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> }
      }
    }
  }
}

export type ActionsResult =
  | { status: 202; commandId: string }
  | { status: 200; commandId: string; duplicate: true }
  | { status: 400 | 404 }

// Preconditions (auth, CSRF, idempotency-key presence) are enforced by the
// route wrapper; this core only handles validation, persistence, audit.
export async function processAction(
  deps: ActionsDeps,
  admin: ActionsAdmin,
  input: { rawBody: string; idempotencyKey: string },
): Promise<ActionsResult> {
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(input.rawBody)
  } catch {
    return { status: 400 }
  }
  const body = actionSchema.safeParse(parsedJson)
  if (!body.success) return { status: 400 }

  // Duplicate key: return the original result without inserting again.
  const existing = await deps.db.from('handoff_commands').select('id,state').eq('idempotency_key', input.idempotencyKey).maybeSingle()
  if (existing.error) return { status: 400 }
  if (existing.data?.id) {
    return { status: 200, commandId: String(existing.data.id), duplicate: true }
  }

  const project = await deps.db.from('handoff_projects').select('id').eq('id', body.data.projectId).maybeSingle()
  if (project.error) return { status: 400 }
  if (!project.data) return { status: 404 }

  const inserted = await deps.db.from('handoff_commands').insert({
    idempotency_key: input.idempotencyKey,
    project_id: body.data.projectId,
    action: body.data.action,
    requested_by: admin.userId,
    state: 'queued',
  }).select().single()
  if (inserted.error || !inserted.data) return { status: 400 }
  const commandId = String(inserted.data.id)

  await deps.db.from('handoff_audit_events').insert({
    project_id: body.data.projectId,
    actor: admin.email,
    action: 'command_enqueued',
    target: `handoff_command:${commandId}`,
    metadata: { action: body.data.action, commandId },
  })

  return { status: 202, commandId }
}
