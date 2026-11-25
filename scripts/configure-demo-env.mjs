import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const supabaseEnvPath = process.env.SUPABASE_ENV_FILE || '/home/matt/PurePulse-Recovery/deploy/supabase-demo/.env'
const outputPath = process.env.PUREPULSE_ENV_OUTPUT || '/home/matt/PurePulse-Recovery/purepulse-admin/.env.production'

const values = {}
for (const line of fs.readFileSync(supabaseEnvPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) values[match[1]] = match[2]
}

for (const name of ['POSTGRES_PASSWORD', 'ANON_KEY', 'SERVICE_ROLE_KEY', 'SUPABASE_PUBLIC_URL']) {
  if (!values[name]) throw new Error(`Missing ${name} in ${supabaseEnvPath}`)
}

const lines = [
  'NODE_ENV=production',
  'PORT=3041',
  'NEXT_PUBLIC_APP_URL=https://login.purepulse.one',
  'APP_BASE_URL=https://login.purepulse.one',
  'NEXT_PUBLIC_SITE_URL=https://purepulse.one',
  'NEXT_PUBLIC_PORTAL_URL=https://login.purepulse.one/portal',
  `NEXT_PUBLIC_SUPABASE_URL=${values.SUPABASE_PUBLIC_URL}`,
  `SUPABASE_URL=${values.SUPABASE_PUBLIC_URL}`,
  `SUPABASE_PROJECT_URL=${values.SUPABASE_PUBLIC_URL}`,
  `SUPABASE_SERVICE_ROLE_KEY=${values.SERVICE_ROLE_KEY}`,
  `SUPABASE_SERVICE_ROLE=${values.SERVICE_ROLE_KEY}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.ANON_KEY}`,
  `SUPABASE_PUBLISHABLE_KEY=${values.SUPABASE_PUBLISHABLE_KEY || values.ANON_KEY}`,
  `SUPABASE_SECRET_KEY=${values.SUPABASE_SECRET_KEY || values.SERVICE_ROLE_KEY}`,
  `SUPABASE_DB_PASS=${values.POSTGRES_PASSWORD}`,
  `DATABASE_URL=postgresql://postgres:${values.POSTGRES_PASSWORD}@127.0.0.1:15433/postgres`,
  'DATABASE_SSL=disable',
  `SESSION_SECRET=${crypto.randomBytes(48).toString('base64url')}`,
  'RESEND_API_KEY=',
  'RESEND_FROM_EMAIL=PurePulse <noreply@purepulse.one>',
  'STRIPE_SECRET_KEY=',
  'STRIPE_KEY=',
  'STRIPE_WEBHOOK_SECRET=',
  'ANTHROPIC_API_KEY=',
  'OPENROUTER_API_KEY=',
  'GOOGLE_CLIENT_ID=',
  'GOOGLE_CLIENT_SECRET=',
  'HANDOFF_INGEST_TOKEN=',
  'ADMIN_EMAILS=demo-admin@example.com',
]

fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 })
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, { mode: 0o600 })
fs.chmodSync(outputPath, 0o600)
console.log(`Wrote restricted PurePulse environment to ${outputPath}`)
