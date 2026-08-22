-- Migration 028: Mobile App Account Linking (Pair Code & Deep Link Support)

-- 1. Add pair code columns to public.affiliates
ALTER TABLE public.affiliates
ADD COLUMN IF NOT EXISTS mobile_pair_code text,
ADD COLUMN IF NOT EXISTS mobile_pair_expires_at timestamptz;

-- 2. Create index for fast pair code lookup
CREATE INDEX IF NOT EXISTS idx_affiliates_mobile_pair_code ON public.affiliates(mobile_pair_code);

-- 3. Create RPC function to safely claim pair code from mobile app
CREATE OR REPLACE FUNCTION public.claim_mobile_pair_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate record;
BEGIN
  -- Search for valid active pair code
  SELECT * INTO v_affiliate
  FROM public.affiliates
  WHERE UPPER(mobile_pair_code) = UPPER(p_code)
    AND (mobile_pair_expires_at IS NULL OR mobile_pair_expires_at > now());

  IF v_affiliate.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired pair code');
  END IF;

  -- Link user_id to affiliate record and clear code
  UPDATE public.affiliates
  SET user_id = p_user_id,
      mobile_pair_code = NULL,
      mobile_pair_expires_at = NULL,
      updated_at = now()
  WHERE id = v_affiliate.id;

  RETURN jsonb_build_object(
    'success', true,
    'affiliate_id', v_affiliate.id,
    'name', v_affiliate.name,
    'ref_code', v_affiliate.ref_code
  );
END;
$$;
