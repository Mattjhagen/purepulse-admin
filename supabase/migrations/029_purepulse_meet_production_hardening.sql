-- Production hardening for PurePulse Meet mobile account linking and community RLS.

ALTER TABLE public.affiliates
  ALTER COLUMN tier SET DEFAULT 'Bronze',
  ALTER COLUMN tier_progress SET DEFAULT 0,
  ALTER COLUMN available_balance SET DEFAULT 0,
  ALTER COLUMN pending_commissions SET DEFAULT 0,
  ALTER COLUMN lifetime_earnings SET DEFAULT 0,
  ALTER COLUMN monthly_recurring SET DEFAULT 0,
  ALTER COLUMN avatar_url DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.claim_mobile_pair_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affiliate public.affiliates%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_affiliate
  FROM public.affiliates
  WHERE upper(mobile_pair_code) = upper(trim(p_code))
    AND mobile_pair_expires_at > now()
  FOR UPDATE;

  IF v_affiliate.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired pair code');
  END IF;
  IF v_affiliate.auth_user_id IS NOT NULL AND v_affiliate.auth_user_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Affiliate account is already linked');
  END IF;

  UPDATE public.affiliates
  SET auth_user_id = v_user_id,
      mobile_pair_code = NULL,
      mobile_pair_expires_at = NULL,
      updated_at = now()
  WHERE id = v_affiliate.id;

  RETURN jsonb_build_object(
    'success', true,
    'affiliate_id', v_affiliate.id,
    'name', v_affiliate.name,
    'referral_code', v_affiliate.referral_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mobile_pair_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_mobile_pair_code(text) TO authenticated;

DROP POLICY IF EXISTS "huddle_rooms_read_all" ON public.huddle_rooms;
DROP POLICY IF EXISTS "huddle_rooms_read_authenticated" ON public.huddle_rooms;
CREATE POLICY "huddle_rooms_read_authenticated" ON public.huddle_rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "channel_messages_read_all" ON public.channel_messages;
DROP POLICY IF EXISTS "channel_messages_read_authenticated" ON public.channel_messages;
CREATE POLICY "channel_messages_read_authenticated" ON public.channel_messages
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "channel_messages_insert_authenticated" ON public.channel_messages;
DROP POLICY IF EXISTS "channel_messages_insert_own" ON public.channel_messages;
CREATE POLICY "channel_messages_insert_own" ON public.channel_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "forum_posts_read_all" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_read_authenticated" ON public.forum_posts;
CREATE POLICY "forum_posts_read_authenticated" ON public.forum_posts
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "forum_posts_insert_authenticated" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_own" ON public.forum_posts;
CREATE POLICY "forum_posts_insert_own" ON public.forum_posts
  FOR INSERT TO authenticated WITH CHECK (
    author_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "direct_messages_read_participant" ON public.direct_messages;
CREATE POLICY "direct_messages_read_participant" ON public.direct_messages
  FOR SELECT TO authenticated USING (
    sender_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "direct_messages_send_own" ON public.direct_messages;
CREATE POLICY "direct_messages_send_own" ON public.direct_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
    AND receiver_id IS NOT NULL
    AND receiver_id <> sender_id
  );
DROP POLICY IF EXISTS "direct_messages_mark_received_read" ON public.direct_messages;
CREATE POLICY "direct_messages_mark_received_read" ON public.direct_messages
  FOR UPDATE TO authenticated USING (
    receiver_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    receiver_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );
