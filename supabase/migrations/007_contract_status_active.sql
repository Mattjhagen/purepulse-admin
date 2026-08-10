-- Add 'active' to contracts.status allowed values
-- The Stripe webhook sets status='active' after successful payment;
-- without this the constraint fires and the webhook fails.
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'active', 'expired', 'terminated'));
