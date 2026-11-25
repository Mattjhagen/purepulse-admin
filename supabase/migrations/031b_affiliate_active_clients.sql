-- Compatibility for the original PurePulse Meet production-hardening step.
-- Older migration branches referenced this denormalized dashboard counter
-- without adding it to the affiliates table.
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS active_clients integer NOT NULL DEFAULT 0;
