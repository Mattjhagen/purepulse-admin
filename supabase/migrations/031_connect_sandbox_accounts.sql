-- Isolated Stripe Connect test accounts. Never reuse live payout recipient IDs in sandbox.

CREATE TABLE IF NOT EXISTS public.affiliate_connect_sandbox_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL UNIQUE REFERENCES public.affiliates(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'onboarding_required', 'verification_pending', 'ready', 'restricted'
  )),
  transfers_enabled boolean NOT NULL DEFAULT false,
  requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  environment text NOT NULL DEFAULT 'test' CHECK (environment = 'test'),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_connect_sandbox_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_read_own_connect_sandbox" ON public.affiliate_connect_sandbox_accounts;
CREATE POLICY "affiliate_read_own_connect_sandbox" ON public.affiliate_connect_sandbox_accounts
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.affiliate_connect_sandbox_accounts FROM anon, authenticated;
