import { Client } from 'pg'

export function getDbClient() {
  return new Client({
    user: 'postgres.kofjljwctqqllnjiejxd',
    password: process.env.SUPABASE_DB_PASS,
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  })
}

export async function setUserPasswordAndConfirm(params: {
  email: string
  password: string
  name: string
  role: string
  title?: string | null
}) {
  const { email, password, name, role, title } = params
  const cleanEmail = email.toLowerCase().trim()
  const client = getDbClient()

  await client.connect()
  try {
    // Check if user already exists
    const userRes = await client.query(
      'SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    )

    let userId: string

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id
      await client.query(
        `UPDATE auth.users SET 
          encrypted_password = crypt($1, gen_salt('bf')),
          email_confirmed_at = NOW(),
          raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{role}',
            to_jsonb($2::text)
          ),
          updated_at = NOW()
        WHERE id = $3::uuid`,
        [password, role, userId]
      )
    } else {
      // Create user
      const insRes = await client.query(
        `INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token
        )
        VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          $1,
          crypt($2, gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          json_build_object('name', $3::text, 'role', $4::text, 'title', $5::text)::jsonb,
          NOW(),
          NOW(),
          ''
        )
        RETURNING id`,
        [cleanEmail, password, name, role, title || '']
      )
      userId = insRes.rows[0].id

      // Insert identity
      await client.query(
        `INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1::uuid,
          json_build_object('sub', $1::text, 'email', $2::text)::jsonb,
          'email',
          $1::text,
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING`,
        [userId, cleanEmail]
      )
    }

    return { userId, email: cleanEmail }
  } finally {
    await client.end()
  }
}
