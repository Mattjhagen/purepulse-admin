-- Email reply templates for the inbox
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_prefix TEXT NOT NULL DEFAULT 'Re: ',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with common templates
INSERT INTO public.email_templates (name, subject_prefix, body) VALUES
  ('Thanks for reaching out', 'Re: ', 'Hi {{name}},

Thank you for reaching out to PurePulse! We''ve received your message and will get back to you within 1 business day.

In the meantime, feel free to visit your client portal at https://portal.purepulse.one for updates.

Best,
The PurePulse Team'),
  ('Following up', 'Re: ', 'Hi {{name}},

Just following up on your message. Is there anything specific we can help you with?

Best,
The PurePulse Team'),
  ('Scheduling a call', 'Re: ', 'Hi {{name}},

Thanks for your email! I''d love to hop on a quick call to discuss this further.

Please feel free to book a time that works for you, or reply with your availability.

Best,
Matty
PurePulse'),
  ('Invoice ready', 'Re: ', 'Hi {{name}},

Your latest invoice is ready and available in your client portal at https://portal.purepulse.one.

Please let me know if you have any questions.

Best,
The PurePulse Team');

-- RLS: admin-only access via service role (no public policies needed)
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
