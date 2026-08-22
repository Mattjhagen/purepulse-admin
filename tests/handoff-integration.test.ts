import { test, describe } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import {
  sanitizeText,
  isHttpsUrl,
  rateLimit,
  resetRateLimiterForTests,
  MAX_BODY_BYTES,
  type IngestDeps,
} from '../lib/handoff-ingest'
import { processAction } from '../lib/handoff-actions'
import { getPortalHandoffStatus, isForbiddenPortalContent } from '../lib/handoff-status'
import { PREVIEW_IFRAME_SANDBOX, previewDisplayMode } from '../lib/handoff-previews'

// ── Fake Supabase (stateful enough to observe idempotency) ───────────────────

type Row = Record<string, unknown>

function fakeDb() {
  const tables = new Map<string, Row[]>()
  const ids = new Map<string, string>()

  function ensure(t: string): Row[] {
    if (!tables.has(t)) tables.set(t, [])
    return tables.get(t)!
  }

  function db(t: string) {
    return {
      upsert(values: Row, opts?: { onConflict?: string }) {
        return {
          select() {
            return {
              async single() {
                const conflictCol = opts?.onConflict ?? 'id'
                const key = String(values[conflictCol])
                let id = ids.get(`${t}:${key}`)
                if (!id) {
                  id = randomUUID()
                  ids.set(`${t}:${key}`, id)
                  ensure(t).push({ ...values, id })
                } else {
                  const idx = ensure(t).findIndex(r => r.id === id)
                  ensure(t)[idx] = { ...ensure(t)[idx], ...values, id }
                }
                return { data: { id }, error: null }
              },
            }
          },
        }
      },
      delete() {
        return {
          async eq(col: string, val: unknown) {
            const rows = ensure(t)
            for (let i = rows.length - 1; i >= 0; i--) {
              if (rows[i][col] === val) rows.splice(i, 1)
            }
            return { error: null }
          },
        }
      },
      insert(rows: Row | Row[]) {
        const list = Array.isArray(rows) ? rows : [rows]
        // Persist immediately (real supabase inserts on await; .select() only
        // controls what comes back).
        const inserted = list.map(r => ({ ...r, id: randomUUID() }))
        ensure(t).push(...inserted)
        return {
          select() {
            return {
              async single() {
                const row = inserted[0]
                if (!row) return { data: null, error: { message: 'no rows' } }
                return { data: row, error: null }
              },
            }
          },
        }
      },
      select() {
        const rows = ensure(t)
        return {
          eq(col: string, val: unknown) {
            return {
              async maybeSingle() {
                const found = rows.find(r => r[col] === val)
                return { data: found ?? null, error: null }
              },
              async single() {
                const found = rows.find(r => r[col] === val)
                if (!found) return { data: null, error: { message: 'row not found' } }
                return { data: found, error: null }
              },
            }
          },
        }
      },
    }
  }

  return {
    from: db,
    count(t: string) { return ensure(t).length },
    rows(t: string) { return ensure(t) },
  }
}

const VALID_TOKEN = 'x'.repeat(32)

function validPayload(): string {
  return JSON.stringify({
    project: {
      order_ref: 'ORD-1',
      title: 'Northstar site build',
      current_stage: 'building',
      stage_label_layman: 'Building your website',
      progress_pct: 42,
      preview_status: 'staging',
    },
    todos: [{ content: 'Wire contact form', state: 'open', position: 0 }],
    stage_events: [{ stage: 'planning', note: 'kickoff', occurred_at: '2026-08-22T00:00:00Z' }],
    agent_status: [{ agent: 'dev-r510', state: 'working', summary: 'Implementing', updated_at: '2026-08-22T00:00:00Z' }],
    client_requests: [{ question: 'Confirm logo choice?', state: 'open', visible_to_client: true }],
  })
}

function ingestDeps(db: ReturnType<typeof fakeDb>, overrides: Partial<IngestDeps> = {}): IngestDeps {
  return {
    expectedToken: VALID_TOKEN,
    rateLimitPerMinute: 1000,
    db: db as unknown as IngestDeps['db'],
    ...overrides,
  }
}

describe('Handoff integration (Projects #25)', () => {

  describe('sanitization helpers', () => {
    test('strips control characters and collapses whitespace', () => {
      assert.strictEqual(sanitizeText('hello\u0000\u001f  \n world\t!'), 'hello world !')
      assert.strictEqual(sanitizeText('   padded   '), 'padded')
    })

    test('https validation accepts https and rejects other schemes', () => {
      assert.ok(isHttpsUrl('https://github.com/org/repo/issues/1'))
      assert.ok(!isHttpsUrl('http://github.com/org/repo'))
      assert.ok(!isHttpsUrl('ftp://example.com'))
      assert.ok(!isHttpsUrl('not a url'))
    })
  })

  describe('ingest endpoint core', () => {
    test('missing token -> 401', async () => {
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: null, rawBody: validPayload() }))
      assert.strictEqual(res.status, 401)
    })

    test('wrong token -> 401', async () => {
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: 'wrong-token-value-000000000000', rawBody: validPayload() }))
      assert.strictEqual(res.status, 401)
    })

    test('unconfigured server token -> fail closed 401 even with matching guess', async () => {
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb(), { expectedToken: undefined }), { token: VALID_TOKEN, rawBody: validPayload() }))
      assert.strictEqual(res.status, 401)
    })

    test('oversized payload -> 413', async () => {
      const big = '{"project":{"order_ref":"x","title":"' + 'a'.repeat(MAX_BODY_BYTES) + '"}}'
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: VALID_TOKEN, rawBody: big }))
      assert.strictEqual(res.status, 413)
    })

    test('unknown field -> 400 (strict allowlist)', async () => {
      const body = JSON.stringify({ project: { order_ref: 'ORD-2', sneaky_field: 'nope' } })
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: VALID_TOKEN, rawBody: body }))
      assert.strictEqual(res.status, 400)
    })

    test('bad enum -> 400', async () => {
      const body = JSON.stringify({ project: { order_ref: 'ORD-3', preview_status: 'public' } })
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: VALID_TOKEN, rawBody: body }))
      assert.strictEqual(res.status, 400)
    })

    test('progress out of range -> 400', async () => {
      const body = JSON.stringify({ project: { order_ref: 'ORD-4', progress_pct: 150 } })
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: VALID_TOKEN, rawBody: body }))
      assert.strictEqual(res.status, 400)
    })

    test('non-https url field -> 400', async () => {
      const body = JSON.stringify({ project: { order_ref: 'ORD-5', pr_url: 'http://insecure.example' } })
      const res = await import('../lib/handoff-ingest').then(m =>
        m.processIngest(ingestDeps(fakeDb()), { token: VALID_TOKEN, rawBody: body }))
      assert.strictEqual(res.status, 400)
    })

    test('control characters stripped before persist; length caps enforced', async () => {
      const db = fakeDb()
      const dirtyTitle = 'A\x00B\x07C  \t D' + 'e'.repeat(300) // > 200 cap after sanitize
      const body = JSON.stringify({ project: { order_ref: 'ORD-6', title: dirtyTitle } })
      const mod = await import('../lib/handoff-ingest')
      const res = await mod.processIngest(ingestDeps(db), { token: VALID_TOKEN, rawBody: body })
      // Sanitized length exceeds the 200 cap -> rejected.
      assert.strictEqual(res.status, 400)

      const okTitle = 'A\x00B\x07C  \t D clean'
      const res2 = await mod.processIngest(ingestDeps(db), {
        token: VALID_TOKEN,
        rawBody: JSON.stringify({ project: { order_ref: 'ORD-6', title: okTitle } }),
      })
      assert.strictEqual(res2.status, 204)
      const stored = db.rows('handoff_projects')[0]
      assert.strictEqual(stored.title, 'A B C D clean')
      assert.ok(!String(stored.title).match(/[\u0000-\u001F]/))
    })

    test('repeat POST yields identical DB state (idempotent)', async () => {
      const db = fakeDb()
      const mod = await import('../lib/handoff-ingest')
      const first = await mod.processIngest(ingestDeps(db), { token: VALID_TOKEN, rawBody: validPayload() })
      assert.strictEqual(first.status, 204)
      const countsAfterFirst = ['handoff_projects', 'handoff_todos', 'handoff_stage_events', 'handoff_agent_status', 'handoff_client_requests']
        .map(t => db.count(t))
      const projectIdAfterFirst = db.rows('handoff_projects')[0].id

      const second = await mod.processIngest(ingestDeps(db), { token: VALID_TOKEN, rawBody: validPayload() })
      assert.strictEqual(second.status, 204)
      const countsAfterSecond = ['handoff_projects', 'handoff_todos', 'handoff_stage_events', 'handoff_agent_status', 'handoff_client_requests']
        .map(t => db.count(t))
      assert.deepStrictEqual(countsAfterSecond, countsAfterFirst)
      assert.strictEqual(db.count('handoff_projects'), 1)
      assert.strictEqual(db.rows('handoff_projects')[0].id, projectIdAfterFirst)
    })

    test('rate limit returns false past fixed-window budget then resets', () => {
      resetRateLimiterForTests()
      const t0 = 1_000_000
      for (let i = 0; i < 5; i++) {
        assert.ok(rateLimit('k', 5, t0))
      }
      assert.ok(!rateLimit('k', 5, t0 + 1000))
      assert.ok(rateLimit('k', 5, t0 + 60_001)) // new window
    })
  })

  describe('actions endpoint core', () => {
    const ADMIN = { userId: 'admin-1', email: 'owner@example.com' }

    async function actionDb() {
      const db = fakeDb()
      await db.from('handoff_projects').upsert({ order_ref: 'ORD-A' }, { onConflict: 'order_ref' }).select().single()
      return db
    }

    function deps(db: ReturnType<typeof fakeDb>) {
      return { db: db as unknown as never }
    }

    function bodyFor(db: ReturnType<typeof fakeDb>, action = 'pause'): string {
      const projectId = db.rows('handoff_projects')[0].id as string
      return JSON.stringify({ action, projectId })
    }

    test('accepted action -> 202, one command, exactly one audit event', async () => {
      const db = await actionDb()
      const res = await processAction(deps(db), ADMIN, { rawBody: bodyFor(db), idempotencyKey: 'key-1' })
      assert.strictEqual(res.status, 202)
      const commandId = (res as { commandId: string }).commandId
      assert.strictEqual(db.count('handoff_commands'), 1)
      assert.strictEqual(db.count('handoff_audit_events'), 1)
      assert.strictEqual((db.rows('handoff_commands')[0].id as string), commandId)
      const audit = db.rows('handoff_audit_events')[0]
      assert.strictEqual(audit.actor, 'owner@example.com')
      assert.deepStrictEqual(audit.metadata, { action: 'pause', commandId })
      assert.strictEqual(db.rows('handoff_commands')[0].state, 'queued')
      assert.strictEqual(audit.project_id, db.rows('handoff_projects')[0].id)
    })

    test('duplicate Idempotency-Key creates no second command or audit event', async () => {
      const db = await actionDb()
      await processAction(deps(db), ADMIN, { rawBody: bodyFor(db), idempotencyKey: 'key-dup' })
      const res = await processAction(deps(db), ADMIN, { rawBody: bodyFor(db), idempotencyKey: 'key-dup' })
      assert.strictEqual(res.status, 200)
      assert.strictEqual((res as { duplicate?: boolean }).duplicate, true)
      assert.strictEqual(db.count('handoff_commands'), 1)
      assert.strictEqual(db.count('handoff_audit_events'), 1)
    })

    test('unknown project -> 404', async () => {
      const db = await actionDb()
      const res = await processAction(deps(db), ADMIN, {
        rawBody: JSON.stringify({ action: 'resume', projectId: randomUUID() }),
        idempotencyKey: 'key-x',
      })
      assert.strictEqual(res.status, 404)
    })

    test('bad action enum -> 400', async () => {
      const db = await actionDb()
      const res = await processAction(deps(db), ADMIN, {
        rawBody: JSON.stringify({ action: 'self_destruct', projectId: db.rows('handoff_projects')[0].id }),
        idempotencyKey: 'key-y',
      })
      assert.strictEqual(res.status, 400)
    })
  })

  describe('route gating matrix (auth/CSRF mapping)', () => {
    // The route wrapper maps resolution kinds to codes; assert the mapping
    // logic constants hold by exercising resolve-style discrimination here.
    test('unauthenticated vs portal-user vs not-allowlisted produce distinct kinds', async () => {
      const { adminGateCode } = await import('../lib/handoff-actions')
      assert.strictEqual(adminGateCode({ kind: 'none' }), 401)
      assert.strictEqual(adminGateCode({ kind: 'portal-user' }), 403)
      assert.strictEqual(adminGateCode({ kind: 'not-allowlisted', email: 'x@y.z' }), 403)
      assert.strictEqual(adminGateCode({ kind: 'admin', userId: 'u', email: 'a@b.c' }), 0)
    })
  })

  describe('portal status (tenant isolation + sanitization)', () => {
    const projectA = {
      id: 'proj-a', title: 'Client A build', stage_label_layman: 'Polishing pages',
      progress_pct: 80, paused: false, current_milestone: 'Content pass',
      next_milestone: 'Launch review', preview_status: 'released', last_agent_update: '2026-08-22T01:00:00Z',
    }

    function statusDeps(opts: { portalUser?: Row | null; projects?: Row[] }) {
      return {
        async getPortalUser(): Promise<{ client_id: string | null } | null> {
          return (opts.portalUser as { client_id: string | null } | null) ?? null
        },
        async getClientProjects(clientId: string): Promise<import('../lib/handoff-status').PortalProjectRow[] | null> {
          return clientId === 'client-a' ? ([projectA] as import('../lib/handoff-status').PortalProjectRow[]) : []
        },
        async getVisibleReleasedPreviewUrl(projectId: string) {
          return projectId === 'proj-a' ? 'https://preview.example/site' : null
        },
        async getVisibleOpenRequests() {
          return [{ id: 'r1', question: 'Which domain spelling do you prefer?' }]
        },
      }
    }

    test('no session -> 401', async () => {
      const res = await getPortalHandoffStatus(statusDeps({}), null)
      assert.strictEqual(res.status, 401)
    })

    test('no portal_users mapping -> 403', async () => {
      const res = await getPortalHandoffStatus(statusDeps({}), { id: 'u9' })
      assert.strictEqual(res.status, 403)
    })

    test('own project returned with sanitized projection only', async () => {
      const res = await getPortalHandoffStatus(
        statusDeps({ portalUser: { client_id: 'client-a' } }),
        { id: 'u1' },
      )
      assert.strictEqual(res.status, 200)
      const projects = (res as { projects: Record<string, unknown>[] }).projects
      assert.strictEqual(projects.length, 1)
      const keys = Object.keys(projects[0]).sort()
      // No producer internals: prompts, commands, hosts, github links, findings, logs.
      for (const forbidden of ['github_issue_url', 'pr_url', 'human_gate_url', 'security_verdict', 'order_ref']) {
        assert.ok(!keys.includes(forbidden), `projection must not include ${forbidden}`)
      }
      assert.strictEqual(projects[0].released_preview_url, 'https://preview.example/site')
      assert.strictEqual(projects[0].stage_label_layman, 'Polishing pages')
    })

    test('tenant isolation: portal user B requesting project of client A -> 404', async () => {
      const res = await getPortalHandoffStatus(
        statusDeps({ portalUser: { client_id: 'client-b' } }),
        { id: 'u2' },
        'proj-a',
      )
      assert.strictEqual(res.status, 404)
    })

    test('forbidden content detector flags prompt/command/log-like strings', () => {
      assert.ok(isForbiddenPortalContent('Run this prompt to continue'))
      assert.ok(isForbiddenPortalContent('check the logs'))
      assert.ok(isForbiddenPortalContent('see https://github.com/x/y'))
      assert.ok(!isForbiddenPortalContent('Your homepage copy is ready for review'))
    })
  })

  describe('previews render policy (AC 7)', () => {
    test('sandbox attribute grants neither scripts nor same-origin', () => {
      assert.strictEqual(typeof PREVIEW_IFRAME_SANDBOX, 'string')
      assert.ok(!PREVIEW_IFRAME_SANDBOX.toLowerCase().includes('allow-scripts'))
      assert.ok(!PREVIEW_IFRAME_SANDBOX.toLowerCase().includes('allow-same-origin'))
    })

    test('only released versions render inline; others are external-tab links', () => {
      assert.strictEqual(previewDisplayMode('released'), 'iframe')
      assert.strictEqual(previewDisplayMode('draft'), 'external')
      assert.strictEqual(previewDisplayMode('staging'), 'external')
    })
  })
})
