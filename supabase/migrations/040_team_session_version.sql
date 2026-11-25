-- Invalidate legacy HMAC team-login sessions after a credential change.
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.bump_team_session_version(p_auth_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.team_members
  SET session_version = session_version + 1,
      updated_at = now()
  WHERE auth_user_id = p_auth_user_id;
$$;

REVOKE ALL ON FUNCTION public.bump_team_session_version(uuid) FROM PUBLIC;
