-- Remove overly-broad public RLS policies on contracts.
-- All contract reads and signature writes go through service-role API routes,
-- so these policies are unnecessary and would expose signature data to anon clients.
DROP POLICY IF EXISTS "public_read_by_token" ON public.contracts;
DROP POLICY IF EXISTS "public_sign_by_token" ON public.contracts;
