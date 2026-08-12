-- Stripe Connect fields so a referrer can actually be paid out via Stripe
-- instead of only being marked paid as a bookkeeping entry.
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;
