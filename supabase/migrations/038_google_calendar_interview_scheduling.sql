-- Google Calendar scheduling metadata and opaque public booking tokens.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS schedule_token text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_event_id text,
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.interviews
SET schedule_token = encode(gen_random_bytes(24), 'hex')
WHERE schedule_token IS NULL;

ALTER TABLE public.interviews
  ALTER COLUMN schedule_token SET DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS interviews_schedule_token_unique
  ON public.interviews (schedule_token);

CREATE INDEX IF NOT EXISTS interviews_scheduled_at_idx
  ON public.interviews (scheduled_at)
  WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE public.interviews ADD CONSTRAINT interviews_status_check CHECK (
  status IN ('submitted', 'under_review', 'scheduled_1on1', 'strong_hire', 'hire_with_training', 'keep_on_file', 'rejected')
);

NOTIFY pgrst, 'reload schema';
