-- 021's "admin_all" policy on portal_users queried portal_users from within
-- its own policy, which Postgres correctly rejects as infinite recursion --
-- and since every other table's admin_only policy also queries
-- portal_users internally, this broke access everywhere, not just here.
--
-- Fix: portal_users keeps only self-scoped policies (no table can safely
-- check "is this an admin" by querying itself). The one admin-side browser
-- read this table needed (the Clients page's "linked" badge) now goes
-- through a service-role API route instead of a direct client-side query.
DROP POLICY IF EXISTS "admin_all" ON public.portal_users;
