-- Carry a referral code from the initial lead all the way through to the
-- client record, so a contract payment can be traced back to the referral
-- that generated it.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referral_code text REFERENCES public.referrals(code);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referral_code text REFERENCES public.referrals(code);
