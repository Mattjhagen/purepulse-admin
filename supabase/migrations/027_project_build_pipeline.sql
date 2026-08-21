-- Affiliate-referred website intake, build pipeline, and auditable $25/hour billing.

begin;

create table if not exists public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  version integer not null default 1,
  website_type text not null,
  business_summary text not null,
  target_audience text not null,
  pages text[] not null default '{}',
  features text[] not null default '{}',
  style_notes text,
  example_sites text[] not null default '{}',
  content_status text not null default 'needs_help'
    check (content_status in ('ready', 'partial', 'needs_help')),
  desired_launch_date date,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, version)
);

create table if not exists public.website_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  brief_id uuid not null references public.project_briefs(id) on delete restrict,
  referral_code text,
  name text not null,
  state text not null default 'awaiting_contract'
    check (state in (
      'awaiting_contract', 'awaiting_payment', 'queued', 'planning', 'building',
      'testing', 'client_review', 'changes_requested', 'approved', 'invoicing',
      'paid', 'deploying', 'live', 'paused_cap_reached', 'payment_failed',
      'blocked_client', 'suspended', 'cancelled', 'failed', 'archived'
    )),
  hourly_rate_cents integer not null default 2500 check (hourly_rate_cents > 0),
  spending_cap_cents integer not null check (spending_cap_cents >= 2500),
  estimated_min_hours numeric(8,2),
  estimated_max_hours numeric(8,2),
  billable_seconds bigint not null default 0 check (billable_seconds >= 0),
  contract_id uuid references public.contracts(id) on delete set null,
  stripe_customer_id text,
  payment_method_ready boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pipeline_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_projects(id) on delete cascade,
  stage text not null,
  status text not null default 'queued'
    check (status in ('queued', 'active', 'paused', 'completed', 'failed', 'cancelled')),
  worker text,
  task text not null,
  output_url text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_projects(id) on delete cascade,
  job_id uuid references public.pipeline_jobs(id) on delete set null,
  duration_seconds integer not null check (duration_seconds > 0),
  billable boolean not null default true,
  reason text not null,
  idempotency_key text not null unique,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.project_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_projects(id) on delete cascade,
  actor_type text not null check (actor_type in ('client', 'admin', 'worker', 'system')),
  actor_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_website_projects_client on public.website_projects(client_id);
create index if not exists idx_website_projects_state on public.website_projects(state);
create index if not exists idx_pipeline_jobs_project on public.pipeline_jobs(project_id, created_at);
create index if not exists idx_project_usage_project on public.project_usage_events(project_id, recorded_at);
create index if not exists idx_project_audit_project on public.project_audit_events(project_id, created_at);

create or replace function public.apply_project_usage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  new_total bigint;
  cap_seconds numeric;
begin
  if not new.billable then return new; end if;

  update public.website_projects
     set billable_seconds = billable_seconds + new.duration_seconds,
         updated_at = now()
   where id = new.project_id
   returning billable_seconds,
     spending_cap_cents * 3600.0 / hourly_rate_cents
     into new_total, cap_seconds;

  if new_total >= cap_seconds then
    update public.website_projects
       set state = 'paused_cap_reached', updated_at = now()
     where id = new.project_id
       and state not in ('live', 'cancelled', 'archived', 'suspended');

    update public.pipeline_jobs
       set status = 'paused', ended_at = coalesce(ended_at, now()), updated_at = now()
     where project_id = new.project_id and status = 'active';
  end if;

  return new;
end;
$function$;

drop trigger if exists project_usage_updates_total on public.project_usage_events;
create trigger project_usage_updates_total
after insert on public.project_usage_events
for each row execute function public.apply_project_usage_event();

drop trigger if exists website_projects_updated_at on public.website_projects;
create trigger website_projects_updated_at
before update on public.website_projects
for each row execute function public.update_updated_at();

drop trigger if exists pipeline_jobs_updated_at on public.pipeline_jobs;
create trigger pipeline_jobs_updated_at
before update on public.pipeline_jobs
for each row execute function public.update_updated_at();

alter table public.project_briefs enable row level security;
alter table public.website_projects enable row level security;
alter table public.pipeline_jobs enable row level security;
alter table public.project_usage_events enable row level security;
alter table public.project_audit_events enable row level security;

drop policy if exists "admins_manage_project_briefs" on public.project_briefs;
create policy "admins_manage_project_briefs" on public.project_briefs
  for all to authenticated using (true) with check (true);
drop policy if exists "admins_manage_website_projects" on public.website_projects;
create policy "admins_manage_website_projects" on public.website_projects
  for all to authenticated using (true) with check (true);
drop policy if exists "admins_manage_pipeline_jobs" on public.pipeline_jobs;
create policy "admins_manage_pipeline_jobs" on public.pipeline_jobs
  for all to authenticated using (true) with check (true);
drop policy if exists "admins_manage_project_usage" on public.project_usage_events;
create policy "admins_manage_project_usage" on public.project_usage_events
  for all to authenticated using (true) with check (true);
drop policy if exists "admins_manage_project_audit" on public.project_audit_events;
create policy "admins_manage_project_audit" on public.project_audit_events
  for all to authenticated using (true) with check (true);

drop policy if exists "clients_read_own_project_briefs" on public.project_briefs;
create policy "clients_read_own_project_briefs" on public.project_briefs
  for select to authenticated using (
    exists (
      select 1 from public.portal_users pu
      where pu.auth_user_id = auth.uid() and pu.client_id = project_briefs.client_id
    )
  );
drop policy if exists "clients_read_own_website_projects" on public.website_projects;
create policy "clients_read_own_website_projects" on public.website_projects
  for select to authenticated using (
    exists (
      select 1 from public.portal_users pu
      where pu.auth_user_id = auth.uid() and pu.client_id = website_projects.client_id
    )
  );
drop policy if exists "clients_read_own_project_usage" on public.project_usage_events;
create policy "clients_read_own_project_usage" on public.project_usage_events
  for select to authenticated using (
    exists (
      select 1 from public.website_projects wp
      join public.portal_users pu on pu.client_id = wp.client_id
      where wp.id = project_usage_events.project_id and pu.auth_user_id = auth.uid()
    )
  );

commit;
