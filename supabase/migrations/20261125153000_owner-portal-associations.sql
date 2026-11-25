-- Associate the existing owner identity with isolated client and affiliate
-- views. Demo accounts remain separate rows and identities.
DO $$
DECLARE
  owner_id uuid;
  owner_client_id uuid;
BEGIN
  SELECT id INTO owner_id FROM auth.users WHERE lower(email) = 'admin@purepulse.one';
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'admin@purepulse.one must already exist in Supabase Auth';
  END IF;

  INSERT INTO clients (name, email, company, plan, status, notes)
  SELECT 'Matthew Hagen — Owner Client View', 'admin@purepulse.one', 'PurePulse Owner Demonstration', 'starter', 'active', 'Owner-only portal view; not a separate login identity.'
  WHERE NOT EXISTS (SELECT 1 FROM clients WHERE lower(email) = 'admin@purepulse.one');

  SELECT id INTO owner_client_id FROM clients WHERE lower(email) = 'admin@purepulse.one' ORDER BY created_at LIMIT 1;

  INSERT INTO portal_users (auth_user_id, client_id, email)
  SELECT owner_id, owner_client_id, 'admin@purepulse.one'
  WHERE NOT EXISTS (SELECT 1 FROM portal_users WHERE auth_user_id = owner_id);

  INSERT INTO affiliates (auth_user_id, name, email, referral_code, status, promotion_strategy)
  SELECT owner_id, 'Matthew Hagen — Owner Affiliate View', 'admin@purepulse.one', 'OWNER2026', 'active', 'Owner-only demonstration view'
  WHERE NOT EXISTS (SELECT 1 FROM affiliates WHERE auth_user_id = owner_id)
    AND NOT EXISTS (SELECT 1 FROM affiliates WHERE referral_code = 'OWNER2026');
END $$;
