-- Enable RLS
create extension if not exists "uuid-ossp";

-- Clients
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  phone text,
  company text,
  plan text not null default 'starter' check (plan in ('starter','growth','premium','business')),
  hourly_rate numeric(10,2) not null default 85.00,
  status text not null default 'prospect' check (status in ('active','inactive','prospect')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Time entries
create table public.time_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  hourly_rate numeric(10,2) not null,
  description text,
  status text not null default 'open' check (status in ('open','closed','voided')),
  needs_review boolean not null default false,
  auto_clock_out boolean not null default false,
  manual_entry boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Breaks
create table public.time_entry_breaks (
  id uuid primary key default uuid_generate_v4(),
  time_entry_id uuid not null references public.time_entries(id) on delete cascade,
  break_start timestamptz not null default now(),
  break_end timestamptz,
  created_at timestamptz not null default now()
);

-- Contractor settings
create table public.contractor_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  overtime_threshold_hours numeric(4,2) not null default 8.00,
  overtime_multiplier numeric(4,2) not null default 1.50,
  default_hourly_rate numeric(10,2) not null default 85.00,
  timezone text not null default 'America/Chicago',
  auto_clock_out boolean not null default true,
  auto_clock_out_hours numeric(4,2) not null default 12.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Timesheet periods
create table public.timesheet_periods (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open','submitted','amended')),
  submitted_at timestamptz,
  total_hours numeric(8,2),
  total_regular_hours numeric(8,2),
  total_overtime_hours numeric(8,2),
  total_earnings numeric(10,2),
  created_at timestamptz not null default now(),
  unique(user_id, period_start)
);

-- IT Tickets
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','in_progress','blocked','resolved','closed')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assigned_to uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ticket comments
create table public.ticket_comments (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid references auth.users(id),
  is_client boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

-- Invoices
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','sent','viewed','paid','overdue','void')),
  issue_date date not null default current_date,
  due_date date not null,
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invoice line items
create table public.invoice_line_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  type text not null default 'other' check (type in ('monthly_plan','hourly','project','expense','other')),
  description text not null,
  quantity numeric(10,3) not null default 1,
  unit_price numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Contracts
create table public.contracts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft','sent','signed','expired','terminated')),
  plan text not null check (plan in ('starter','growth','premium','business')),
  monthly_rate numeric(10,2) not null,
  hourly_rate numeric(10,2) not null,
  start_date date not null default current_date,
  end_date date,
  signed_at timestamptz,
  signed_by text,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1099 Documents
create table public.documents_1099 (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tax_year int not null,
  total_paid numeric(10,2) not null,
  status text not null default 'draft' check (status in ('draft','filed')),
  generated_at timestamptz not null default now(),
  filed_at timestamptz,
  unique(client_id, tax_year)
);

-- Portal users (customers who sign in to the portal)
create table public.portal_users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  email text not null,
  created_at timestamptz not null default now()
);

-- RLS policies
alter table public.clients enable row level security;
alter table public.time_entries enable row level security;
alter table public.time_entry_breaks enable row level security;
alter table public.contractor_settings enable row level security;
alter table public.timesheet_periods enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.contracts enable row level security;
alter table public.documents_1099 enable row level security;
alter table public.portal_users enable row level security;

-- Admin has full access (users in auth.users with specific emails)
-- For simplicity, grant authenticated users access to everything (lock down further with roles later)
create policy "authenticated_all" on public.clients for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.time_entries for all using (auth.uid() = user_id);
create policy "authenticated_all" on public.time_entry_breaks for all using (
  exists (select 1 from public.time_entries te where te.id = time_entry_id and te.user_id = auth.uid())
);
create policy "authenticated_all" on public.contractor_settings for all using (auth.uid() = user_id);
create policy "authenticated_all" on public.timesheet_periods for all using (auth.uid() = user_id);
create policy "authenticated_all" on public.tickets for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.ticket_comments for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.invoices for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.invoice_line_items for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.contracts for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.documents_1099 for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on public.portal_users for all using (auth.role() = 'authenticated');

-- Portal: clients see their own tickets
create policy "client_own_tickets" on public.tickets for select using (
  exists (select 1 from public.portal_users pu where pu.auth_user_id = auth.uid() and pu.client_id = client_id)
);
create policy "client_insert_ticket" on public.tickets for insert with check (
  exists (select 1 from public.portal_users pu where pu.auth_user_id = auth.uid() and pu.client_id = client_id)
);

-- Updated_at triggers
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger clients_updated_at before update on public.clients for each row execute function update_updated_at();
create trigger time_entries_updated_at before update on public.time_entries for each row execute function update_updated_at();
create trigger tickets_updated_at before update on public.tickets for each row execute function update_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function update_updated_at();
create trigger contracts_updated_at before update on public.contracts for each row execute function update_updated_at();
