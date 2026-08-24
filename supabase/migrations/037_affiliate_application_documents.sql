ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS application_pdf_url text,
  ADD COLUMN IF NOT EXISTS application_pdf_name text,
  ADD COLUMN IF NOT EXISTS application_pdf_uploaded_at timestamptz;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS application_pdf_url text,
  ADD COLUMN IF NOT EXISTS application_pdf_name text,
  ADD COLUMN IF NOT EXISTS application_pdf_uploaded_at timestamptz;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS application_pdf_url text,
  ADD COLUMN IF NOT EXISTS application_pdf_name text,
  ADD COLUMN IF NOT EXISTS application_pdf_uploaded_at timestamptz;

NOTIFY pgrst, 'reload schema';
