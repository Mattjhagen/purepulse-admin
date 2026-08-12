-- Client suspension fields
alter table public.clients
  add column if not exists suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists warning_sent_at timestamptz;
