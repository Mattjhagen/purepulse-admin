-- Add e-signature fields to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signature_token uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signature_ip text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS contracts_signature_token_idx ON public.contracts(signature_token);

-- Allow anyone with the token to read the contract (for the signing page)
CREATE POLICY "public_read_by_token" ON public.contracts
  FOR SELECT USING (signature_token IS NOT NULL);

-- Allow token-holder to record their signature
CREATE POLICY "public_sign_by_token" ON public.contracts
  FOR UPDATE USING (signature_token IS NOT NULL AND status = 'sent')
  WITH CHECK (status = 'signed');
