-- Track the Stripe Invoice ID so we can reconcile payments via webhook
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_stripe_invoice_id_idx
  ON public.invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
