CREATE TABLE IF NOT EXISTS public.marketing_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('clients', 'affiliates')),
  subject text NOT NULL,
  preview text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_email_templates_admin_all ON public.marketing_email_templates;
CREATE POLICY marketing_email_templates_admin_all
  ON public.marketing_email_templates
  FOR ALL TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
