#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const envPath = path.join(root, '.env.production')
const credentialsPath = path.join(root, '..', 'private', 'purepulse-demo-credentials.txt')
const demoAccounts = [
  { email: 'demo-admin@example.com', label: 'Demo administrator' },
  { email: 'demo-client@example.com', label: 'Demo client' },
  { email: 'demo-affiliate@example.com', label: 'Demo affiliate' },
]

function loadEnv(file) {
  const values = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return values
}

if (!fs.existsSync(envPath)) throw new Error(`Missing ${envPath}`)
const env = { ...loadEnv(envPath), ...process.env }
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_PUBLIC_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SECRET_KEY
if (!url || !serviceKey) throw new Error('Supabase service configuration is missing')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (error) throw error

const rotated = []
for (const account of demoAccounts) {
  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === account.email)
  if (!user) throw new Error(`Demo account not found: ${account.email}`)
  const password = crypto.randomBytes(32).toString('base64url')
  const result = await supabase.auth.admin.updateUserById(user.id, { password })
  if (result.error) throw result.error
  rotated.push({ ...account, password })
}

const privateDir = path.dirname(credentialsPath)
fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 })
const contents = [
  '# PurePulse fictional demonstration credentials',
  '# Keep this file outside GitHub and public web roots.',
  `# Rotated: ${new Date().toISOString()}`,
  ...rotated.flatMap((account) => [`${account.label}:`, `  email=${account.email}`, `  password=${account.password}`]),
  '',
].join('\n')
fs.writeFileSync(credentialsPath, contents, { mode: 0o600 })
fs.chmodSync(credentialsPath, 0o600)
console.log(`Rotated ${rotated.length} demo passwords. Credentials were written to ${credentialsPath} (mode 0600); passwords were not displayed.`)
