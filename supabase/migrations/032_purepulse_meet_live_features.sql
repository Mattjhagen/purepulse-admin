-- Remove seeded demo content and enable production PurePulse Meet collaboration.

DELETE FROM public.channel_messages
WHERE content IN (
  '🚀 Just closed another local dentist on the $150/mo plan using the Signature Dark Neon flyer! That makes 6 active clients this month!',
  'LFG Sarah!! 🔥 Commission payout sent directly to your Stripe account. Keep crushing it!',
  'Hey everyone, hopping into the Jitsi Huddle in 5 mins if anyone wants to roleplay objection handling for local retail clients!'
);

DELETE FROM public.forum_posts
WHERE title IN (
  'How I Pitch $150 Deposit Websites to Coffee Shops & Cafes',
  'Top 3 Answers to "Can I update the content myself on vibeCodes?"'
);

DELETE FROM public.huddle_rooms
WHERE title IN (
  'Daily Founder Deal Coaching & Objection Handling',
  'High-Converting Cold Outreach Scripting'
);

-- Migration 027 created a demonstration affiliate balance before production hardening.
-- Reset only that exact untouched demonstration tuple when it has no ledger activity.
UPDATE public.affiliates a
SET available_balance = 0,
    pending_commissions = 0,
    lifetime_earnings = 0,
    monthly_recurring = 0,
    active_clients = 0,
    clicks = 0,
    tier = 'Bronze',
    tier_progress = 0,
    avatar_url = NULL
WHERE a.available_balance = 450
  AND a.pending_commissions = 150
  AND a.lifetime_earnings = 1850
  AND a.monthly_recurring = 450
  AND a.active_clients = 3
  AND a.clicks = 247
  AND NOT EXISTS (SELECT 1 FROM public.payout_transactions p WHERE p.affiliate_id = a.id);

DROP POLICY IF EXISTS "huddle_rooms_insert_authenticated" ON public.huddle_rooms;
DROP POLICY IF EXISTS "huddle_rooms_insert_purepulse_staff" ON public.huddle_rooms;
CREATE POLICY "huddle_rooms_insert_purepulse_staff" ON public.huddle_rooms
  FOR INSERT TO authenticated WITH CHECK (
    lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@purepulse.one'
    AND host_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "huddle_rooms_update_own" ON public.huddle_rooms;
CREATE POLICY "huddle_rooms_update_own" ON public.huddle_rooms
  FOR UPDATE TO authenticated USING (
    host_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    host_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.list_affiliate_directory()
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  tier text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.name, a.avatar_url, a.tier
  FROM public.affiliates a
  WHERE a.status = 'active'
    AND a.auth_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.affiliates caller
      WHERE caller.auth_user_id = auth.uid() AND caller.status = 'active'
    )
  ORDER BY lower(a.name);
$$;

REVOKE ALL ON FUNCTION public.list_affiliate_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_affiliate_directory() TO authenticated;

DROP POLICY IF EXISTS "channel_messages_insert_own" ON public.channel_messages;
CREATE POLICY "channel_messages_insert_own" ON public.channel_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
    AND length(trim(content)) BETWEEN 1 AND 500
  );

DROP POLICY IF EXISTS "forum_posts_insert_own" ON public.forum_posts;
CREATE POLICY "forum_posts_insert_own" ON public.forum_posts
  FOR INSERT TO authenticated WITH CHECK (
    author_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
    AND length(trim(title)) BETWEEN 3 AND 160
    AND length(trim(content)) BETWEEN 1 AND 5000
  );

DROP POLICY IF EXISTS "direct_messages_send_own" ON public.direct_messages;
CREATE POLICY "direct_messages_send_own" ON public.direct_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
    AND receiver_id IS NOT NULL
    AND receiver_id <> sender_id
    AND receiver_id IN (SELECT id FROM public.affiliates WHERE status = 'active' AND auth_user_id IS NOT NULL)
    AND length(trim(content)) BETWEEN 1 AND 2000
  );

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE, author_name text NOT NULL,
  author_avatar text, content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_comments_post_created_idx ON public.forum_comments(post_id, created_at);
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forum_comments_read_authenticated" ON public.forum_comments;
CREATE POLICY "forum_comments_read_authenticated" ON public.forum_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "forum_comments_insert_own" ON public.forum_comments;
CREATE POLICY "forum_comments_insert_own" ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (
  author_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
);
CREATE OR REPLACE FUNCTION public.sync_forum_reply_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.forum_posts SET replies_count = (SELECT count(*) FROM public.forum_comments WHERE post_id = coalesce(NEW.post_id, OLD.post_id)) WHERE id = coalesce(NEW.post_id, OLD.post_id);
  RETURN coalesce(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS forum_comments_sync_count ON public.forum_comments;
CREATE TRIGGER forum_comments_sync_count AFTER INSERT OR DELETE ON public.forum_comments FOR EACH ROW EXECUTE FUNCTION public.sync_forum_reply_count();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'forum_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
  END IF;
END $$;
