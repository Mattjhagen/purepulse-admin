-- Safely link a signed-in mobile user to an existing active affiliate when emails match exactly.
CREATE OR REPLACE FUNCTION public.link_current_affiliate_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_affiliate public.affiliates%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authenticated email required');
  END IF;

  SELECT * INTO v_affiliate FROM public.affiliates
  WHERE auth_user_id = v_user_id AND status = 'active'
  LIMIT 1;
  IF v_affiliate.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'affiliate_id', v_affiliate.id, 'method', 'existing');
  END IF;

  SELECT * INTO v_affiliate FROM public.affiliates
  WHERE lower(trim(email)) = v_email AND status = 'active'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF v_affiliate.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active affiliate has this email');
  END IF;
  IF v_affiliate.auth_user_id IS NOT NULL AND v_affiliate.auth_user_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This affiliate is already linked to another login');
  END IF;

  UPDATE public.affiliates SET auth_user_id = v_user_id, updated_at = now()
  WHERE id = v_affiliate.id AND (auth_user_id IS NULL OR auth_user_id = v_user_id);

  RETURN jsonb_build_object('success', true, 'affiliate_id', v_affiliate.id, 'method', 'email');
END;
$$;

REVOKE ALL ON FUNCTION public.link_current_affiliate_by_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_current_affiliate_by_email() TO authenticated;
