-- Permanently associate each pre-screen submission with the invited affiliate.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS interview_token text,
  ADD COLUMN IF NOT EXISTS promotion_strategy text;

UPDATE public.affiliates
SET interview_token = encode(gen_random_bytes(24), 'hex')
WHERE interview_token IS NULL;

ALTER TABLE public.affiliates
  ALTER COLUMN interview_token SET DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_interview_token_unique
  ON public.affiliates (interview_token);

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS affiliate_id uuid
  REFERENCES public.affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS interviews_affiliate_id_idx
  ON public.interviews (affiliate_id);

UPDATE public.interviews i
SET affiliate_id = a.id
FROM public.affiliates a
WHERE i.affiliate_id IS NULL
  AND lower(trim(i.candidate_email)) = lower(trim(a.email));

NOTIFY pgrst, 'reload schema';
