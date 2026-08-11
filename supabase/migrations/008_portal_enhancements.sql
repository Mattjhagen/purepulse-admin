-- Project stages for client progress tracking
CREATE TABLE IF NOT EXISTS public.project_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete')),
  sort_order int NOT NULL DEFAULT 0,
  note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "authenticated_all" ON public.project_stages
  FOR ALL USING (auth.role() = 'authenticated');

-- Clients can read their own stages
CREATE POLICY "client_read_stages" ON public.project_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_id
    )
  );

-- Client messages (two-way between admin and client)
CREATE TABLE IF NOT EXISTS public.client_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('admin','client')),
  sender_name text NOT NULL DEFAULT 'Matty',
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "authenticated_all" ON public.client_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Clients can read and insert their own messages
CREATE POLICY "client_read_messages" ON public.client_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_id
    )
  );

CREATE POLICY "client_insert_messages" ON public.client_messages
  FOR INSERT WITH CHECK (
    sender = 'client' AND
    EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_id
    )
  );

-- Clients can read their own invoices
CREATE POLICY "client_read_invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_id
    )
  );

-- Clients can read their invoice line items
CREATE POLICY "client_read_invoice_items" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.portal_users pu ON pu.client_id = i.client_id
      WHERE i.id = invoice_id AND pu.auth_user_id = auth.uid()
    )
  );

-- Clients can read their contracts
CREATE POLICY "client_read_contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portal_users pu
      WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_id
    )
  );

-- Add stripe_payment_link to invoices for one-click pay
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_link text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Trigger
CREATE TRIGGER project_stages_updated_at
  BEFORE UPDATE ON public.project_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
