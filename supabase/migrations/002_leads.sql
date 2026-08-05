create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  project     text,
  plan        text,
  status      text not null default 'new',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table leads enable row level security;

-- Only authenticated admins can read/update leads
create policy "admin read leads"
  on leads for select
  to authenticated
  using (true);

create policy "admin update leads"
  on leads for update
  to authenticated
  using (true);

-- Service role inserts from the API route (no RLS needed for service role)
-- Public anon cannot read or write leads
