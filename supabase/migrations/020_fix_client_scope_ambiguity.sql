-- Fix a systemic RLS bug affecting every client-scoped policy that compared
-- portal_users.client_id against a BARE, unqualified client_id/id column.
-- Since portal_users itself has columns named client_id and id, Postgres
-- resolved the bare reference to portal_users' OWN column rather than the
-- outer table's row -- collapsing the check to "does this user have any
-- portal_users row at all", which is true for every signed-up client.
--
-- Verified live: this let any client read every OTHER client's tickets,
-- project stages, messages, invoices, and contracts -- not just their own.
-- (My own migration 019 shipped the same mistake on clients; fixed here too.)

-- tickets
DROP POLICY IF EXISTS "client_own_tickets" ON public.tickets;
CREATE POLICY "client_own_tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = tickets.client_id)
  );

DROP POLICY IF EXISTS "client_insert_ticket" ON public.tickets;
CREATE POLICY "client_insert_ticket" ON public.tickets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = tickets.client_id)
  );

-- project_stages
DROP POLICY IF EXISTS "client_read_stages" ON public.project_stages;
CREATE POLICY "client_read_stages" ON public.project_stages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = project_stages.client_id)
  );

-- client_messages
DROP POLICY IF EXISTS "client_read_messages" ON public.client_messages;
CREATE POLICY "client_read_messages" ON public.client_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_messages.client_id)
  );

DROP POLICY IF EXISTS "client_insert_messages" ON public.client_messages;
CREATE POLICY "client_insert_messages" ON public.client_messages
  FOR INSERT WITH CHECK (
    sender = 'client' AND
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = client_messages.client_id)
  );

-- invoices
DROP POLICY IF EXISTS "client_read_invoices" ON public.invoices;
CREATE POLICY "client_read_invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = invoices.client_id)
  );

-- contracts
DROP POLICY IF EXISTS "client_read_contracts" ON public.contracts;
CREATE POLICY "client_read_contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = contracts.client_id)
  );

-- clients (fix migration 019's own copy of the same mistake)
DROP POLICY IF EXISTS "client_read_own" ON public.clients;
CREATE POLICY "client_read_own" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = auth.uid() AND pu.client_id = clients.id)
  );
