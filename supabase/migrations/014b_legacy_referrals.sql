-- Compatibility migration for the original legacy referral dashboard.
-- The historical 015 RLS migration assumes these tables exist, but the
-- original table-creation migration was lost during a branch merge.
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  code text NOT NULL UNIQUE,
  commission_per_conversion numeric(10,2) NOT NULL DEFAULT 50,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  total_earned numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  stripe_account_id text,
  stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  application_pdf_url text,
  application_pdf_name text,
  application_pdf_uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'direct',
  ip text,
  user_agent text,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  client_name text,
  plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referral_id ON public.referral_clicks(referral_id);
