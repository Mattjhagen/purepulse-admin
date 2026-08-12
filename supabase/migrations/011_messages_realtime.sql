-- Enable Supabase Realtime for client_messages so both admin and portal
-- receive live updates without polling.
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_messages;
