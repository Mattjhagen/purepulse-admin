-- Migration 025: Video Interviews System
-- Enables automated asynchronous video interviews for hiring affiliate sales partners and candidate evaluation scorecards

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_phone TEXT,
  job_title TEXT DEFAULT 'Affiliate Sales Partner',
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'strong_hire', 'hire_with_training', 'keep_on_file', 'rejected')),
  
  -- Scores for Q1 through Q8 and Roleplay (1 to 5)
  scores JSONB DEFAULT '{
    "q1": null,
    "q2": null,
    "q3": null,
    "q4": null,
    "q5": null,
    "q6": null,
    "q7": null,
    "q8": null,
    "roleplay": null
  }'::JSONB,
  overall_score INTEGER DEFAULT 0,
  
  -- Evaluation matrix: Green vs Red flags
  evaluation_matrix JSONB DEFAULT '{
    "b2b_communication": null,
    "outreach_drive": null,
    "tech_clarity": null
  }'::JSONB,
  
  admin_notes TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_hire', 'hire_with_training', 'keep_on_file', 'do_not_proceed', NULL)),
  
  -- Video recordings and answers
  video_urls JSONB DEFAULT '{}'::JSONB,
  text_answers JSONB DEFAULT '{}'::JSONB,
  roleplay_video_url TEXT,
  
  -- Metadata
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_interviews_email ON interviews (candidate_email);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (status);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews (created_at DESC);

-- Enable RLS
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Public can submit interviews (insert only)
CREATE POLICY "Public insert interviews"
  ON interviews FOR INSERT
  WITH CHECK (true);

-- Authenticated admins can view, update, delete
CREATE POLICY "Admin select interviews"
  ON interviews FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin update interviews"
  ON interviews FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin delete interviews"
  ON interviews FOR DELETE
  USING (auth.role() = 'authenticated');

-- Storage bucket for interview video recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('interviews', 'interviews', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for interviews bucket
CREATE POLICY "Public upload interview videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'interviews');

CREATE POLICY "Public read interview videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'interviews');
