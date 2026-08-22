-- Stripe Issuing sandbox ledger and affiliate card records.

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS issuing_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_issuing_cardholder_id text,
  ADD COLUMN IF NOT EXISTS stripe_issuing_card_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliates_issuing_cardholder
  ON public.affiliates(stripe_issuing_cardholder_id)
  WHERE stripe_issuing_cardholder_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliates_issuing_card
  ON public.affiliates(stripe_issuing_card_id)
  WHERE stripe_issuing_card_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.affiliate_issuing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL UNIQUE REFERENCES public.affiliates(id) ON DELETE CASCADE,
  stripe_cardholder_id text NOT NULL UNIQUE,
  stripe_card_id text UNIQUE,
  card_status text NOT NULL DEFAULT 'inactive' CHECK (card_status IN ('inactive', 'active', 'canceled')),
  card_brand text,
  card_last4 text,
  monthly_spend_limit_cents integer NOT NULL DEFAULT 50000 CHECK (monthly_spend_limit_cents >= 0),
  allocated_balance_cents integer NOT NULL DEFAULT 0 CHECK (allocated_balance_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  environment text NOT NULL DEFAULT 'test' CHECK (environment = 'test'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_issuing_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  issuing_account_id uuid REFERENCES public.affiliate_issuing_accounts(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN (
    'card_allocation', 'card_authorization', 'card_authorization_reversal',
    'card_transaction_settled', 'card_refund', 'manual_adjustment'
  )),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  stripe_object_id text,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_issuing_ledger_affiliate
  ON public.affiliate_issuing_ledger(affiliate_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_issuing_ledger_stripe_object_type
  ON public.affiliate_issuing_ledger(stripe_object_id, entry_type)
  WHERE stripe_object_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.affiliate_issuing_transactions (
  id text PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  stripe_card_id text NOT NULL,
  stripe_cardholder_id text NOT NULL,
  type text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  merchant_name text,
  merchant_category text,
  status text NOT NULL,
  authorized_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_affiliate_issuing_transactions_affiliate
  ON public.affiliate_issuing_transactions(affiliate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stripe_issuing_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.affiliate_issuing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_issuing_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_issuing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_issuing_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_read_own_issuing_account" ON public.affiliate_issuing_accounts;
CREATE POLICY "affiliate_read_own_issuing_account" ON public.affiliate_issuing_accounts
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "affiliate_read_own_issuing_ledger" ON public.affiliate_issuing_ledger;
CREATE POLICY "affiliate_read_own_issuing_ledger" ON public.affiliate_issuing_ledger
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "affiliate_read_own_issuing_transactions" ON public.affiliate_issuing_transactions;
CREATE POLICY "affiliate_read_own_issuing_transactions" ON public.affiliate_issuing_transactions
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

REVOKE ALL ON public.stripe_issuing_webhook_events FROM anon, authenticated;

