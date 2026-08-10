ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signature_data text DEFAULT NULL;
