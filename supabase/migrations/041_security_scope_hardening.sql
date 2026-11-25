-- Security hardening for the production self-hosted Supabase instance.
--
-- Earlier migrations used "authenticated and not portal_users" as a proxy
-- for staff. That grants every affiliate (and any other authenticated user
-- without a portal_users row) access to staff tables. Policies are
-- permissive in PostgreSQL, so the old policies must be removed before the
-- narrower policies below can take effect.

CREATE OR REPLACE FUNCTION public.is_team_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
      AND tm.status <> 'inactive'
      AND lower(tm.role) IN ('owner', 'admin', 'manager')
  )
  OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'admin@purepulse.one',
    'matty@purepulse.one',
    'mattjhagen0@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_admin() TO authenticated;

DO $$
DECLARE
  pol record;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clients', 'team_members', 'portal_users', 'affiliates',
    'affiliate_referrals', 'affiliate_commissions', 'affiliate_clicks',
    'affiliate_payouts'
  ] LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_admin_all ON public.clients
  FOR ALL TO authenticated
  USING (public.is_team_admin())
  WITH CHECK (public.is_team_admin());

CREATE POLICY clients_self_read ON public.clients
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.auth_user_id = auth.uid() AND pu.client_id = clients.id
  ));

CREATE POLICY team_members_admin_all ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_team_admin())
  WITH CHECK (public.is_team_admin());

CREATE POLICY team_members_self_read ON public.team_members
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY portal_users_admin_all ON public.portal_users
  FOR ALL TO authenticated
  USING (public.is_team_admin())
  WITH CHECK (public.is_team_admin());

CREATE POLICY portal_users_self_read ON public.portal_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY portal_users_self_insert ON public.portal_users
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() AND client_id IS NULL);

CREATE POLICY affiliates_admin_all ON public.affiliates
  FOR ALL TO authenticated
  USING (public.is_team_admin())
  WITH CHECK (public.is_team_admin());

CREATE POLICY affiliates_self_read ON public.affiliates
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY affiliates_self_update ON public.affiliates
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY affiliate_referrals_scoped ON public.affiliate_referrals
  FOR SELECT TO authenticated
  USING (
    public.is_team_admin()
    OR affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.auth_user_id = auth.uid())
  );

CREATE POLICY affiliate_commissions_scoped ON public.affiliate_commissions
  FOR SELECT TO authenticated
  USING (
    public.is_team_admin()
    OR affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.auth_user_id = auth.uid())
  );

CREATE POLICY affiliate_clicks_scoped ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (
    public.is_team_admin()
    OR affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.auth_user_id = auth.uid())
  );

CREATE POLICY affiliate_payouts_scoped ON public.affiliate_payouts
  FOR SELECT TO authenticated
  USING (
    public.is_team_admin()
    OR affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.auth_user_id = auth.uid())
  );
