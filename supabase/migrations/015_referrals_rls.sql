-- Lock referrals/referral_clicks to admin only. These tables shipped with
-- either no RLS or an overly-permissive policy that treated ANY authenticated
-- Supabase user as trusted -- including self-signup client portal accounts,
-- who could read all referrer PII/commission data and freely insert, update,
-- or delete records (verified live: a client account was able to fabricate a
-- referral with an arbitrary commission amount and mark it paid).
--
-- "Admin" here means an authenticated user with NO portal_users row -- the
-- same implicit convention already used to distinguish admin from client
-- throughout this schema.
--
-- The public /ref/[code] click-tracking route inserts via the service-role
-- key, which bypasses RLS entirely, so this does not affect that flow.

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Drop every existing policy on these tables, whatever it's named, so no
-- stray permissive policy survives alongside the one we're adding below.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('referrals', 'referral_clicks')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "admin_only" ON public.referrals
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid())
  );

CREATE POLICY "admin_only" ON public.referral_clicks
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid())
  );
