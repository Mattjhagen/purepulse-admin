-- Migration 026: Stripe Global Payouts
-- Upgrades affiliate payout architecture to Stripe Global Payouts (Accounts v2 & Outbound Payments)

-- 1. Add Stripe Global Payouts recipient and status fields to affiliates
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS stripe_global_payout_recipient_id text,
  ADD COLUMN IF NOT EXISTS stripe_payout_method_id text,
  ADD COLUMN IF NOT EXISTS payout_onboarding_status text NOT NULL DEFAULT 'setup_required',
  ADD COLUMN IF NOT EXISTS payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS payout_entity_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS payout_requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payout_onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payout_status_sync_at timestamptz;

-- 2. Add constraints and indexes for recipient uniqueness and status lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_affiliates_global_payout_recipient'
  ) THEN
    ALTER TABLE public.affiliates
      ADD CONSTRAINT uq_affiliates_global_payout_recipient UNIQUE (stripe_global_payout_recipient_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliates_global_recipient ON public.affiliates(stripe_global_payout_recipient_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_payout_status ON public.affiliates(payout_onboarding_status);
CREATE INDEX IF NOT EXISTS idx_affiliates_payouts_enabled ON public.affiliates(payouts_enabled);

-- 3. Create affiliate_payouts table to record outbound payment records and atomic commission tracking
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  stripe_outbound_payment_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status in ('pending', 'processing', 'posted', 'failed', 'canceled')),
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

-- 4. Create stripe_webhook_events table for idempotent webhook processing
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY, -- Stripe event ID (evt_...)
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'processed',
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at ON public.stripe_webhook_events(processed_at);

-- 5. Row Level Security
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_payouts_read_own" ON public.affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );
