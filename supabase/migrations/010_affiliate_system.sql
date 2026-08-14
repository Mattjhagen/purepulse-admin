-- Affiliate program tables

alter table clients add column if not exists referral_code text;

create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  phone text,
  referral_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  terms_signed_at timestamptz,
  terms_signature_data text,
  terms_ip text,
  notes text,
  free_plan_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  plan text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'churned')),
  commission_rate numeric(5,4) not null,
  monthly_commission numeric(10,2) not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  churned_at timestamptz,
  unique (affiliate_id, client_id)
);

create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  referral_id uuid not null references affiliate_referrals(id) on delete cascade,
  period_month date not null,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_commission_per_period unique (referral_id, period_month)
);

-- RLS
alter table affiliates enable row level security;
alter table affiliate_referrals enable row level security;
alter table affiliate_commissions enable row level security;

create policy "affiliate_read_own" on affiliates
  for select using (auth.uid() = auth_user_id);

create policy "affiliate_referrals_read_own" on affiliate_referrals
  for select using (
    affiliate_id in (select id from affiliates where auth_user_id = auth.uid())
  );

create policy "affiliate_commissions_read_own" on affiliate_commissions
  for select using (
    affiliate_id in (select id from affiliates where auth_user_id = auth.uid())
  );
