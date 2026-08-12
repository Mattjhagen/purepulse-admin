create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'member',
  title text,
  phone text,
  hourly_rate numeric(10,2) default 0,
  status text not null default 'active',
  notes text,
  auth_user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table team_members enable row level security;

create policy "admin manage team members"
  on team_members for all
  to authenticated
  using (true)
  with check (true);
