-- Migration 024: Affiliate Portal Enhancements
-- Adds Stripe Connect fields, backup payout settings, click counters, and granular click tracking

-- 1. Add Stripe Connect and payout fields to affiliates table
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS payout_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;

-- 2. Create affiliate_clicks table for granular source attribution and analytics
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

-- Index for quick lookups by affiliate and referral code
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON public.affiliate_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at);

-- 3. Row Level Security for affiliate_clicks
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_clicks_read_own" ON public.affiliate_clicks
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

-- 4. Allow affiliates to update their own payout details and profile
CREATE POLICY "affiliate_update_own" ON public.affiliates
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
