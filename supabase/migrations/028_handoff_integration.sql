-- Server-Handoff integration: sanitized replicated workflow state surfaced in
-- PurePulse Admin (command center) and the client portal (own-project status).
--
-- Boundary (parent Projects#23 / dev task Projects#25): this is a one-way,
-- token-authenticated replication target. The localhost dashboard service is
-- never exposed; producers POST to /api/handoff/ingest with a shared secret.
-- Portal users get NO direct table access (RLS deny-all for them); they read
-- through server-side handlers that scope to their own client_id. Admins are
-- authenticated users with NO portal_users row, per migration 021 convention.

begin;

-- ── Core replicated project state ───────────────────────────────────────────

create table if not exists public.handoff_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  order_ref text unique not null,
  title text,
  current_stage text,
  stage_label_layman text,
  progress_pct int check (progress_pct between 0 and 100),
  paused bool default false,
  current_milestone text,
  next_milestone text,
  preview_status text check (preview_status in ('none', 'draft', 'staging', 'released')),
  github_repo text,
  github_issue_url text,
  pr_url text,
  pr_checks_state text check (pr_checks_state in ('pending', 'passing', 'failing')),
  security_verdict text check (security_verdict in ('pending', 'pass', 'fail')),
  security_reviewed_sha text,
  human_gate_url text,
  last_agent_update timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only pipeline timeline.
create table if not exists public.handoff_stage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.handoff_projects(id) on delete cascade,
  stage text,
  note text,
  occurred_at timestamptz
);

-- Durable TODO checklist mirrored from the dashboard.
create table if not exists public.handoff_todos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.handoff_projects(id) on delete cascade,
  content text,
  state text check (state in ('open', 'done')),
  position int
);

-- Latest per-agent status summaries (replaced wholesale on ingest).
create table if not exists public.handoff_agent_status (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.handoff_projects(id) on delete cascade,
  agent text check (agent in ('pm-t310', 'dev-r510', 'security-r410')),
  state text,
  summary text,
  updated_at timestamptz
);

-- Preview URLs by version kind; client visibility is explicit opt-in.
create table if not exists public.handoff_previews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.handoff_projects(id) on delete cascade,
  version_kind text check (version_kind in ('draft', 'staging', 'released')),
  url text not null,
  visible_to_client bool default false,
  created_at timestamptz not null default now()
);

-- Requests for input shown to the client when open and marked visible.
create table if not exists public.handoff_client_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.handoff_projects(id) on delete cascade,
  question text,
  state text check (state in ('open', 'answered')),
  visible_to_client bool default true,
  created_at timestamptz not null default now()
);

-- Outbound admin intents. Rows are queued here only; the dashboard picks them
-- up and executes. This endpoint never executes anything itself.
create table if not exists public.handoff_commands (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique not null,
  project_id uuid references public.handoff_projects(id) on delete set null,
  action text check (action in ('pause', 'resume', 'retry_request', 'escalate', 'handoff_approve')),
  requested_by uuid,
  state text check (state in ('queued', 'picked_up', 'done', 'rejected')) default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit trail of who did what via the integration.
create table if not exists public.handoff_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.handoff_projects(id) on delete set null,
  actor text,
  action text,
  target text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists handoff_audit_events_project_created_idx
  on public.handoff_audit_events (project_id, created_at);
create index if not exists handoff_stage_events_project_occurred_idx
  on public.handoff_stage_events (project_id, occurred_at);
create index if not exists handoff_todos_project_position_idx
  on public.handoff_todos (project_id, position);
create index if not exists handoff_previews_project_idx
  on public.handoff_previews (project_id);
create index if not exists handoff_client_requests_project_state_idx
  on public.handoff_client_requests (project_id, state);
create index if not exists handoff_commands_project_idx
  on public.handoff_commands (project_id);
create index if not exists handoff_agent_status_project_idx
  on public.handoff_agent_status (project_id);
create index if not exists handoff_projects_client_idx
  on public.handoff_projects (client_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- enable + deny-by-default everywhere. No policy grants anything to anonymous
-- or portal users. The single admin-convention policy set follows migration
-- 021: authenticated user with NO portal_users row. Ingest writes happen with
-- the service role server-side, which bypasses RLS.

alter table public.handoff_projects enable row level security;
alter table public.handoff_stage_events enable row level security;
alter table public.handoff_todos enable row level security;
alter table public.handoff_agent_status enable row level security;
alter table public.handoff_previews enable row level security;
alter table public.handoff_client_requests enable row level security;
alter table public.handoff_commands enable row level security;
alter table public.handoff_audit_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'handoff_projects', 'handoff_stage_events', 'handoff_todos',
    'handoff_agent_status', 'handoff_previews', 'handoff_client_requests',
    'handoff_commands', 'handoff_audit_events'
  ]
  loop
    -- Re-runnable: drop then recreate so applying twice never duplicates.
    execute format('drop policy if exists "handoff_admin_read" on public.%I', t);
    execute format(
      'create policy "handoff_admin_read" on public.%I for select using (
         auth.role() = ''authenticated''
         and not exists (select 1 from public.portal_users pu where pu.auth_user_id = auth.uid())
       )',
      t
    );

    -- Commands are the only table admins insert into (via the actions API).
    if t = 'handoff_commands' then
      execute format('drop policy if exists "handoff_admin_insert" on public.%I', t);
      execute format(
        'create policy "handoff_admin_insert" on public.%I for insert with check (
           auth.role() = ''authenticated''
           and not exists (select 1 from public.portal_users pu where pu.auth_user_id = auth.uid())
         )',
        t
      );
    end if;
  end loop;
end $$;

-- Realtime for the admin command center list.
alter publication supabase_realtime add table public.handoff_projects;

commit;
