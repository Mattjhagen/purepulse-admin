-- Inbox: emails received at matty@purepulse.one via Resend inbound webhook
CREATE TABLE IF NOT EXISTS public.received_emails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id   TEXT UNIQUE,
  from_email  TEXT NOT NULL,
  from_name   TEXT,
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  html        TEXT,
  text        TEXT,
  read_at     TIMESTAMPTZ,
  starred     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.received_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON public.received_emails
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS received_emails_created_at_idx ON public.received_emails (created_at DESC);
CREATE INDEX IF NOT EXISTS received_emails_read_idx ON public.received_emails (read_at) WHERE read_at IS NULL;
