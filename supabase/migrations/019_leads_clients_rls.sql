-- Lock leads and clients down to admin only. Both shipped with policies
-- that treat ANY authenticated Supabase user as trusted -- including
-- self-signup client portal accounts -- letting any client read, insert,
-- update, or delete every lead's contact info, and read/modify every
-- OTHER client's record (PII, plan, hourly rate, notes, suspension status).
--
-- Same convention as referrals/ticket_comments: "admin" means an
-- authenticated user with NO portal_users row.

-- ── leads: admin only, full stop -- clients never see leads ────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leads', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "admin_only" ON public.leads
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid())
  );

-- ── clients: admin has full access; a client may only SELECT their own row
-- (the portal reads its own client name; it never writes to this table) ────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.clients', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "admin_only" ON public.clients
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid())
  );

CREATE POLICY "client_read_own" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = id)
  );
