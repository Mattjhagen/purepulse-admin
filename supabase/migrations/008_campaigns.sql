-- ============================================================
-- 008_campaigns.sql
-- AI-powered marketing campaign management for PurePulse clients
-- ============================================================

-- campaigns: one per contract, the overarching marketing engagement
CREATE TABLE public.campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  name            text NOT NULL,
  plan            text NOT NULL,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  -- AI-assembled brand intelligence (populated after intake form)
  brand_voice     jsonb,   -- { tone: [], personality: '', avoid: [] }
  audience        jsonb,   -- { demographics: '', pain_points: [], desires: [] }
  goals           text[],
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- campaign_briefs: structured brand intake (filled by client or AI-extracted from notes)
CREATE TABLE public.campaign_briefs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  business_name    text,
  industry         text,
  location         text,
  target_audience  text,
  unique_value_prop text,
  tone             text[],    -- professional | friendly | bold | playful | minimal
  competitors      text[],
  goals            text[],
  raw_intake       jsonb,     -- full form responses verbatim
  ai_summary       text,      -- one-paragraph brand brief written by AI
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- milestones: phases within a campaign (AI-generated from plan tier at activation)
CREATE TABLE public.milestones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  sort_order   int  NOT NULL DEFAULT 0,
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- deliverables: individual pieces of content within a milestone
CREATE TABLE public.deliverables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  milestone_id    uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  title           text NOT NULL,
  type            text NOT NULL
                    CHECK (type IN (
                      'social_post', 'blog_post', 'webpage', 'ad_copy',
                      'email', 'graphic_brief', 'video_script',
                      'seo_report', 'analytics_report', 'strategy_doc'
                    )),
  platform        text,  -- instagram | facebook | linkedin | x | google | website | email
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN (
                      'draft', 'ai_generated', 'in_review',
                      'revision_requested', 'approved', 'scheduled',
                      'published', 'archived'
                    )),
  -- AI generation
  ai_prompt       text,    -- prompt sent to Claude
  ai_content      jsonb,   -- { headline, body, caption, hashtags, cta, alt_text, ... }
  -- Human-edited final
  final_content   jsonb,
  -- Scheduling
  scheduled_at    timestamptz,
  published_at    timestamptz,
  -- Client feedback
  client_notes    text,
  revision_count  int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- approvals: full audit trail of every client decision on a deliverable
CREATE TABLE public.approvals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  uuid REFERENCES public.deliverables(id) ON DELETE CASCADE,
  decision        text NOT NULL
                    CHECK (decision IN ('approved', 'revision_requested', 'rejected')),
  notes           text,
  approved_by     text,   -- client's name (no auth required for client portal)
  approved_by_ip  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX campaigns_contract_id_idx   ON public.campaigns(contract_id);
CREATE INDEX campaigns_client_id_idx     ON public.campaigns(client_id);
CREATE INDEX milestones_campaign_id_idx  ON public.milestones(campaign_id);
CREATE INDEX deliverables_campaign_id_idx  ON public.deliverables(campaign_id);
CREATE INDEX deliverables_milestone_id_idx ON public.deliverables(milestone_id);
CREATE INDEX deliverables_status_idx     ON public.deliverables(status);
CREATE INDEX approvals_deliverable_id_idx  ON public.approvals(deliverable_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_briefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals        ENABLE ROW LEVEL SECURITY;

-- Authenticated users (PurePulse staff) can do everything
CREATE POLICY "staff_all_campaigns"       ON public.campaigns       FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_briefs"          ON public.campaign_briefs FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_milestones"      ON public.milestones      FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_deliverables"    ON public.deliverables    FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_approvals"       ON public.approvals       FOR ALL TO authenticated USING (true);

-- Anon (client portal, no auth) — read their own campaigns via share token
-- NOTE: client portal uses service-role key server-side; these anon policies
-- exist for future direct client auth. For now service-role bypasses RLS.
CREATE POLICY "anon_read_deliverables"    ON public.deliverables    FOR SELECT TO anon USING (status NOT IN ('draft', 'archived'));
CREATE POLICY "anon_insert_approvals"     ON public.approvals       FOR INSERT TO anon WITH CHECK (true);
