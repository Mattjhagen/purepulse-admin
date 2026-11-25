-- Compatibility for the original team login route, which records last login.
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
