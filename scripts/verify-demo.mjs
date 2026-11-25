import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of fs.readFileSync(process.env.PUREPULSE_ENV_FILE || '.env.production', 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0) env[line.slice(0, index)] = line.slice(index + 1)
}
const credentials = {}
for (const line of fs.readFileSync(process.env.PUREPULSE_CREDENTIALS || '/home/matt/PurePulse-Recovery/private/purepulse-demo-credentials.txt', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^(?:admin|client|affiliate): (\S+) \/ (.+)$/)
  if (match) credentials[match[1]] = { email: match[1], password: match[2] }
}
const ownerLine = fs.readFileSync(process.env.PUREPULSE_OWNER_CREDENTIALS || '/home/matt/PurePulse-Recovery/private/purepulse-owner-credentials.txt', 'utf8').split(/\r?\n/).find((line) => line.startsWith('Temporary password: '))
credentials['admin@purepulse.one'] = { email: 'admin@purepulse.one', password: ownerLine?.slice('Temporary password: '.length) }

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
for (const [label, account] of Object.entries({ owner: credentials['admin@purepulse.one'], admin: credentials['demo-admin@example.com'], client: credentials['demo-client@example.com'], affiliate: credentials['demo-affiliate@example.com'] })) {
  const result = await client.auth.signInWithPassword({ email: account.email, password: account.password })
  if (result.error) throw new Error(`${label} Supabase auth failed: ${result.error.message}`)
  console.log(`${label}=supabase-auth-ok`)
}

for (const [label, account, table] of [
  ['client', credentials['demo-client@example.com'], 'clients'],
  ['affiliate', credentials['demo-affiliate@example.com'], 'affiliates'],
]) {
  const scoped = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const signedIn = await scoped.auth.signInWithPassword(account)
  if (signedIn.error) throw signedIn.error
  const rows = await scoped.from(table).select('id')
  if (rows.error) throw new Error(`${label} RLS query failed: ${rows.error.message}`)
  console.log(`${label}=rls-scoped-${rows.data?.length ?? 0}-rows`)
}

for (const [label, account] of Object.entries({ owner: credentials['admin@purepulse.one'], admin: credentials['demo-admin@example.com'] })) {
  const response = await fetch('http://127.0.0.1:3041/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(account) })
  if (!response.ok) throw new Error(`${label} application login failed: ${response.status}`)
  const cookie = response.headers.get('set-cookie')
  const me = await fetch('http://127.0.0.1:3041/api/auth/me', { headers: { cookie: cookie?.split(';')[0] || '' } })
  if (!me.ok) throw new Error(`${label} session check failed: ${me.status}`)
  const dashboard = await fetch('http://127.0.0.1:3041/dashboard', { headers: { cookie: cookie?.split(';')[0] || '' } })
  if (!dashboard.ok) throw new Error(`${label} dashboard check failed: ${dashboard.status}`)
  console.log(`${label}=application-session-ok`)
}

const counts = {}
for (const table of ['clients', 'team_members', 'affiliates', 'contracts', 'website_projects', 'campaigns', 'leads', 'interviews', 'affiliate_commissions', 'timesheet_periods']) {
  const result = await client.from(table).select('id')
  if (result.error) throw result.error
  counts[table] = result.data?.length ?? 0
}
console.log(`database-counts=${JSON.stringify(counts)}`)
