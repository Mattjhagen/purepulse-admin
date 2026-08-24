ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS prescreen_contacted_at timestamptz;

CREATE INDEX IF NOT EXISTS affiliates_prescreen_contacted_at_idx
  ON public.affiliates (prescreen_contacted_at);

NOTIFY pgrst, 'reload schema';
