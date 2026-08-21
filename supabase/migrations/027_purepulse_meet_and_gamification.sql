-- Migration 027: PurePulse Meet Huddles, Gamified Tiers & Community Messaging
-- Extends existing purepulse-admin database with live Jitsi huddles, channel feeds, DMs, forums, and tier gamification.
-- Idempotent & safe to run multiple times without policy collision errors.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. EXTEND EXISTING AFFILIATES TABLE WITH GAMIFICATION & BALANCE FIELDS
--------------------------------------------------------------------------------
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Silver' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'PurePulse Black Card')),
  ADD COLUMN IF NOT EXISTS tier_progress integer DEFAULT 65,
  ADD COLUMN IF NOT EXISTS available_balance numeric(10, 2) DEFAULT 450.00,
  ADD COLUMN IF NOT EXISTS pending_commissions numeric(10, 2) DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS lifetime_earnings numeric(10, 2) DEFAULT 1850.00,
  ADD COLUMN IF NOT EXISTS monthly_recurring numeric(10, 2) DEFAULT 450.00,
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

--------------------------------------------------------------------------------
-- 2. HUDDLE ROOMS TABLE (Live Jitsi Meetings)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.huddle_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  host_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  host_name text NOT NULL,
  host_avatar text NOT NULL,
  participants_count integer DEFAULT 1,
  is_live boolean DEFAULT true,
  jitsi_room_url text NOT NULL,
  category text DEFAULT 'Founder Office Hours',
  created_at timestamptz DEFAULT now()
);

--------------------------------------------------------------------------------
-- 3. CHANNEL MESSAGES TABLE (Slack/Teams Group Channels)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL CHECK (channel_id IN ('wins-and-success', 'general', 'coaching-deals', 'announcements')),
  sender_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_avatar text NOT NULL,
  sender_role text DEFAULT 'Partner',
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

--------------------------------------------------------------------------------
-- 4. DIRECT MESSAGES TABLE (1-on-1 Private DMs)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

--------------------------------------------------------------------------------
-- 5. FORUM POSTS TABLE (Strategy & Objection Handling Boards)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_avatar text NOT NULL,
  category text DEFAULT 'Sales Strategy',
  content text NOT NULL,
  replies_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

--------------------------------------------------------------------------------
-- 6. PAYOUT TRANSACTIONS TABLE (Stripe Connect Express Ledger)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'Completed' CHECK (status IN ('Completed', 'Processing', 'Pending', 'Failed')),
  destination text NOT NULL,
  stripe_payout_id text,
  created_at timestamptz DEFAULT now()
);

--------------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY (RLS) & IDEMPOTENT POLICIES
--------------------------------------------------------------------------------
ALTER TABLE public.huddle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "huddle_rooms_read_all" ON public.huddle_rooms;
CREATE POLICY "huddle_rooms_read_all" ON public.huddle_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "huddle_rooms_insert_authenticated" ON public.huddle_rooms;
CREATE POLICY "huddle_rooms_insert_authenticated" ON public.huddle_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "channel_messages_read_all" ON public.channel_messages;
CREATE POLICY "channel_messages_read_all" ON public.channel_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "channel_messages_insert_authenticated" ON public.channel_messages;
CREATE POLICY "channel_messages_insert_authenticated" ON public.channel_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "forum_posts_read_all" ON public.forum_posts;
CREATE POLICY "forum_posts_read_all" ON public.forum_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "forum_posts_insert_authenticated" ON public.forum_posts;
CREATE POLICY "forum_posts_insert_authenticated" ON public.forum_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "payout_transactions_read_own" ON public.payout_transactions;
CREATE POLICY "payout_transactions_read_own" ON public.payout_transactions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE auth_user_id = auth.uid())
);

--------------------------------------------------------------------------------
-- 8. SUPABASE REALTIME WEBSOCKETS ENABLEMENT
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'channel_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'huddle_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.huddle_rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'forum_posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- 9. INITIAL SEED DEMO DATA
--------------------------------------------------------------------------------
INSERT INTO public.huddle_rooms (title, host_name, host_avatar, participants_count, is_live, jitsi_room_url, category) VALUES
('Daily Founder Deal Coaching & Objection Handling', 'Matty Hagen (Founder)', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 8, true, 'https://meet.jit.si/PurePulseCoaching-DailyHuddle', 'Founder Office Hours'),
('High-Converting Cold Outreach Scripting', 'Sarah Vance (Top Affiliate)', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', 4, true, 'https://meet.jit.si/PurePulseCoaching-Scripting', 'Affiliate Success')
ON CONFLICT DO NOTHING;

INSERT INTO public.channel_messages (channel_id, sender_name, sender_avatar, sender_role, content, likes_count) VALUES
('wins-and-success', 'Sarah Vance', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', 'Gold Partner', '🚀 Just closed another local dentist on the $150/mo plan using the Signature Dark Neon flyer! That makes 6 active clients this month!', 12),
('wins-and-success', 'Matty Hagen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'Founder', 'LFG Sarah!! 🔥 Commission payout sent directly to your Stripe account. Keep crushing it!', 9),
('general', 'David K.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', 'Silver Partner', 'Hey everyone, hopping into the Jitsi Huddle in 5 mins if anyone wants to roleplay objection handling for local retail clients!', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.forum_posts (title, author_name, author_avatar, category, content, replies_count, likes_count) VALUES
('How I Pitch $150 Deposit Websites to Coffee Shops & Cafes', 'Sarah Vance', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', 'Sales Strategy', 'Coffee shop owners hate huge upfront software fees. I walk in with the 10-Tab Tear-Off Poster, leave my card, and mention zero upfront maintenance worry...', 18, 34),
('Top 3 Answers to "Can I update the content myself on vibeCodes?"', 'Matty Hagen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'Objection Handling', 'Yes! VibeCodes allows full self-serve updates or PurePulse fully manages updates for them under the monthly plan.', 7, 21)
ON CONFLICT DO NOTHING;
