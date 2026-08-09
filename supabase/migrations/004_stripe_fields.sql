-- Add Stripe payment fields to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS stripe_customer_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz DEFAULT NULL;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS contracts_stripe_session_idx ON public.contracts(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS contracts_stripe_subscription_idx ON public.contracts(stripe_subscription_id);
