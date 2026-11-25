import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of fs.readFileSync(process.env.PUREPULSE_ENV_FILE || '/home/matt/PurePulse-Recovery/purepulse-admin/.env.production', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) env[match[1]] = match[2]
}

const email = 'admin@purepulse.one'
const name = 'Matthew Hagen'
const title = 'Owner / Super Administrator'
const temporaryPassword = `PPOwner-${crypto.randomBytes(24).toString('base64url')}!`
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (users.error) throw users.error
const existing = users.data.users.find((user) => user.email?.toLowerCase() === email)
const result = existing
  ? await supabase.auth.admin.updateUserById(existing.id, { password: temporaryPassword, email_confirm: true, user_metadata: { name, role: 'admin', title, owner: true } })
  : await supabase.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true, user_metadata: { name, role: 'admin', title, owner: true } })
if (result.error) throw result.error
const user = result.data.user

const member = await supabase.from('team_members').select('id').eq('email', email).maybeSingle()
if (member.error) throw member.error
const row = { name, email, role: 'admin', title, status: 'active', auth_user_id: user.id, notes: 'Permanent PurePulse owner account.' }
const memberResult = member.data
  ? await supabase.from('team_members').update(row).eq('id', member.data.id)
  : await supabase.from('team_members').insert(row)
if (memberResult.error) throw memberResult.error

const output = process.env.PUREPULSE_OWNER_CREDENTIALS || '/home/matt/PurePulse-Recovery/private/purepulse-owner-credentials.txt'
fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 })
fs.writeFileSync(output, `PurePulse permanent owner administrator\nEmail: ${email}\nName: ${name}\nRole: ${title}\nTemporary password: ${temporaryPassword}\nGenerated: ${new Date().toISOString()}\n`, { mode: 0o600 })
fs.chmodSync(output, 0o600)
console.log(`Owner account provisioned; credentials stored at ${output}`)
