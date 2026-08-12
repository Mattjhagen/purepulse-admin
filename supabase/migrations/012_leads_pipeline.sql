-- Allow authenticated admins to delete leads and insert new ones from the admin panel
create policy "admin delete leads"
  on leads for delete
  to authenticated
  using (true);

create policy "admin insert leads"
  on leads for insert
  to authenticated
  with check (true);

-- Phone number for lead contact tracking
alter table leads add column if not exists phone text;

-- Source of the lead (website, referral, social, etc.)
alter table leads add column if not exists source text default 'website';
