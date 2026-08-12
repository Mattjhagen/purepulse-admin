-- Replace the blanket "any authenticated user" policy with an admin-only one
-- on every table where it coexisted with (and silently overrode, since
-- Postgres ORs permissive policies) a narrower client-scoped policy, or
-- where clients have no legitimate access at all.
--
-- "admin" = authenticated with no portal_users row, the existing convention.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'client_messages', 'contracts', 'documents_1099', 'invoice_line_items',
    'invoices', 'project_stages', 'ticket_comments', 'tickets', 'received_emails'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "admin_only" ON public.%I FOR ALL USING (auth.role() = ''authenticated'' AND NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid()))',
      t
    );
  END LOOP;
END $$;

-- portal_users is special: it's the table that establishes who counts as a
-- client, so it can't just be "admin only" -- the organic self-signup flow
-- (app/portal/page.tsx) still needs to insert its own row. But it also
-- can't stay open, or a client could insert {auth_user_id: themselves,
-- client_id: <anyone>} and fully impersonate any client, bypassing every
-- other fix in this migration and the last one.
DROP POLICY IF EXISTS "authenticated_all" ON public.portal_users;

-- Admin: full access.
CREATE POLICY "admin_all" ON public.portal_users
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid())
  );

-- A user may read their own mapping (the portal needs this to bootstrap).
CREATE POLICY "self_read" ON public.portal_users
  FOR SELECT USING (auth_user_id = auth.uid());

-- A user may create their own row only if it's unlinked (client_id null) --
-- self-signup never sets client_id; only an admin invite/link action does.
CREATE POLICY "self_insert_unlinked" ON public.portal_users
  FOR INSERT WITH CHECK (auth_user_id = auth.uid() AND client_id IS NULL);
