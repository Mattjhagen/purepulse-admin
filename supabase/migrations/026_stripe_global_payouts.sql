-- Migration 026: Stripe Global Payouts & Affiliate Architecture
-- Self-contained and fully idempotent: ensures all affiliate tables, columns, indexes,
-- and RLS policies exist safely.

-- 1. Ensure referral_code column exists on clients
ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS referral_code text;

-- 2. Create public.affiliates table if it does not exist
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  terms_signed_at timestamptz,
  terms_signature_data text,
  terms_ip text,
  notes text,
  free_plan_active boolean NOT NULL DEFAULT false,
  stripe_account_id text,
  stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  payout_method text NOT NULL DEFAULT 'stripe',
  payout_details jsonb DEFAULT '{}'::jsonb,
  clicks integer NOT NULL DEFAULT 0,
  stripe_global_payout_recipient_id text UNIQUE,
  stripe_payout_method_id text,
  payout_onboarding_status text NOT NULL DEFAULT 'setup_required',
  payouts_enabled boolean NOT NULL DEFAULT false,
  payout_country text NOT NULL DEFAULT 'US',
  payout_entity_type text NOT NULL DEFAULT 'individual',
  payout_requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  payout_onboarded_at timestamptz,
  last_payout_status_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If affiliates table already existed, add all Global Payouts and enhancement columns
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS terms_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_signature_data text,
  ADD COLUMN IF NOT EXISTS terms_ip text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS free_plan_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS payout_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_global_payout_recipient_id text,
  ADD COLUMN IF NOT EXISTS stripe_payout_method_id text,
  ADD COLUMN IF NOT EXISTS payout_onboarding_status text NOT NULL DEFAULT 'setup_required',
  ADD COLUMN IF NOT EXISTS payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS payout_entity_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS payout_requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payout_onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payout_status_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure recipient uniqueness constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_affiliates_global_payout_recipient'
  ) THEN
    ALTER TABLE public.affiliates
      ADD CONSTRAINT uq_affiliates_global_payout_recipient UNIQUE (stripe_global_payout_recipient_id);
  END IF;
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliates_auth_user_id ON public.affiliates(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON public.affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_global_recipient ON public.affiliates(stripe_global_payout_recipient_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_payout_status ON public.affiliates(payout_onboarding_status);
CREATE INDEX IF NOT EXISTS idx_affiliates_payouts_enabled ON public.affiliates(payouts_enabled);

-- 3. Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'churned')),
  commission_rate numeric(5,4) NOT NULL,
  monthly_commission numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  churned_at timestamptz,
  UNIQUE (affiliate_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_client_id ON public.affiliate_referrals(client_id);

-- 4. Create affiliate_commissions table
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id uuid NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_commission_per_period UNIQUE (referral_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON public.affiliate_commissions(status);

-- 5. Create affiliate_clicks table
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  source text DEFAULT 'direct',
  ip text,
  user_agent text,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON public.affiliate_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at);

-- 6. Create affiliate_payouts table (Outbound Payments)
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  stripe_outbound_payment_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'failed', 'canceled')),
  idempotency_key text NOT NULL UNIQUE,
  commission_ids uuid[] NOT NULL DEFAULT '{}',
  failure_code text,
  failure_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON public.affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_created_at ON public.affiliate_payouts(created_at);

-- 7. Create stripe_webhook_events table
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'processed',
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at ON public.stripe_webhook_events(processed_at);

-- 8. Row Level Security (RLS)
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplicate policy errors
DROP POLICY IF EXISTS "affiliate_read_own" ON public.affiliates;
DROP POLICY IF EXISTS "affiliate_update_own" ON public.affiliates;
DROP POLICY IF EXISTS "affiliate_referrals_read_own" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "affiliate_commissions_read_own" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "affiliate_clicks_read_own" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "affiliate_payouts_read_own" ON public.affiliate_payouts;

CREATE POLICY "affiliate_read_own" ON public.affiliates
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "affiliate_update_own" ON public.affiliates
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "affiliate_referrals_read_own" ON public.affiliate_referrals
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "affiliate_commissions_read_own" ON public.affiliate_commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "affiliate_clicks_read_own" ON public.affiliate_clicks
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "affiliate_payouts_read_own" ON public.affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );
