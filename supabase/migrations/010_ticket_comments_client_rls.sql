-- Client can read comments on their own tickets
CREATE POLICY "client_read_ticket_comments" ON public.ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.portal_users pu ON pu.client_id = t.client_id
      WHERE t.id = ticket_id AND pu.auth_user_id = auth.uid()
    )
  );

-- Client can add comments to their own tickets
CREATE POLICY "client_insert_ticket_comments" ON public.ticket_comments
  FOR INSERT WITH CHECK (
    is_client = true AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.portal_users pu ON pu.client_id = t.client_id
      WHERE t.id = ticket_id AND pu.auth_user_id = auth.uid()
    )
  );
