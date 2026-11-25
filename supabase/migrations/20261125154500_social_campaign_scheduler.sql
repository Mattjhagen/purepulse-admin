CREATE TABLE IF NOT EXISTS public.campaign_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  campaign_type text NOT NULL DEFAULT 'marketing' CHECK (campaign_type IN ('recruitment','marketing','advertising','announcement','general')),
  platforms text[] NOT NULL DEFAULT '{}',
  platform_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','publishing','published','failed','canceled')),
  scheduled_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Chicago',
  demo_mode boolean NOT NULL DEFAULT true,
  idempotency_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  published_at timestamptz,
  attribution_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_publication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.campaign_social_posts(id) ON DELETE CASCADE,
  platform text,
  status text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_social_posts_schedule_idx ON public.campaign_social_posts(status, scheduled_at);
ALTER TABLE public.campaign_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_publication_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_campaign_social_posts" ON public.campaign_social_posts;
CREATE POLICY "staff_all_campaign_social_posts" ON public.campaign_social_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "staff_read_campaign_publication_logs" ON public.campaign_publication_logs;
CREATE POLICY "staff_read_campaign_publication_logs" ON public.campaign_publication_logs FOR SELECT TO authenticated USING (true);
