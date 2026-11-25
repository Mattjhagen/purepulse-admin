import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = process.env.PUREPULSE_ENV_FILE || '/home/matt/PurePulse-Recovery/purepulse-admin/.env.production'
const credentialsPath = process.env.PUREPULSE_DEMO_CREDENTIALS || '/home/matt/PurePulse-Recovery/private/purepulse-demo-credentials.txt'
const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) env[match[1]] = match[2]
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const demoUsers = [
  { email: 'demo-admin@example.com', name: 'DEMO Administrator', role: 'admin', title: 'Demonstration Administrator' },
  { email: 'demo-client@example.com', name: 'DEMO Client Contact', role: 'client', title: 'Demonstration Client' },
  { email: 'demo-affiliate@example.com', name: 'DEMO Affiliate Partner', role: 'affiliate', title: 'Demonstration Affiliate' },
]

function password() {
  return `PPDemo-${crypto.randomBytes(18).toString('base64url')}!`
}

async function requireData(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function authUser(spec, passwords) {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listed.error) throw listed.error
  const existing = listed.data.users.find((user) => user.email?.toLowerCase() === spec.email)
  const pass = password()
  const result = existing
    ? await supabase.auth.admin.updateUserById(existing.id, { password: pass, email_confirm: true, user_metadata: { name: spec.name, role: spec.role, title: spec.title, demo: true } })
    : await supabase.auth.admin.createUser({ email: spec.email, password: pass, email_confirm: true, user_metadata: { name: spec.name, role: spec.role, title: spec.title, demo: true } })
  if (result.error) throw result.error
  const user = result.data.user
  passwords.push(`${spec.role}: ${spec.email} / ${pass}`)
  return user
}

async function firstOrInsert(table, key, value, row) {
  const found = await supabase.from(table).select('*').eq(key, value).maybeSingle()
  if (found.error) throw new Error(`${table} lookup: ${found.error.message}`)
  if (found.data) return found.data
  return requireData(await supabase.from(table).insert(row).select('*').single(), `${table} insert`)
}

const passwords = []
const admin = await authUser(demoUsers[0], passwords)
const clientUser = await authUser(demoUsers[1], passwords)
const affiliateUser = await authUser(demoUsers[2], passwords)

const clients = []
for (let i = 1; i <= 12; i++) {
  clients.push(await firstOrInsert('clients', 'email', `demo-client-${String(i).padStart(2, '0')}@example.com`, {
    name: `DEMO Client ${String(i).padStart(2, '0')}`,
    email: `demo-client-${String(i).padStart(2, '0')}@example.com`,
    phone: `555-010-${String(i).padStart(2, '2')}`,
    company: `DEMO Company ${String(i).padStart(2, '2')}`,
    plan: ['starter', 'growth', 'premium', 'business'][i % 4],
    status: i < 9 ? 'active' : 'prospect',
    notes: 'FICTIONAL DEMONSTRATION RECORD — not real business data.',
  }))
}

const demoClient = await firstOrInsert('clients', 'email', 'demo-client@example.com', {
  name: 'DEMO Client Contact', email: 'demo-client@example.com', phone: '555-010-00', company: 'DEMO Showcase Company',
  plan: 'growth', status: 'active', notes: 'FICTIONAL DEMONSTRATION RECORD — not real business data.',
})
await firstOrInsert('portal_users', 'email', 'demo-client@example.com', { auth_user_id: clientUser.id, client_id: demoClient.id, email: 'demo-client@example.com' })

const team = [{ name: 'DEMO Administrator', email: 'demo-admin@example.com', role: 'admin', title: 'Demonstration Administrator', auth_user_id: admin.id }, ...Array.from({ length: 7 }, (_, i) => ({
  name: `DEMO Employee ${String(i + 1).padStart(2, '0')}`,
  email: `demo-employee-${String(i + 1).padStart(2, '0')}@example.com`,
  role: i < 3 ? 'manager' : 'employee', title: i < 3 ? 'Demonstration Manager' : 'Demonstration Specialist', hourly_rate: 28 + i * 2,
  status: i === 6 ? 'onboarding' : 'active', notes: 'FICTIONAL DEMONSTRATION RECORD — onboarding stage example.',
}))]
const teamRows = []
for (const member of team) teamRows.push(await firstOrInsert('team_members', 'email', member.email, member))

const affiliates = []
for (let i = 1; i <= 15; i++) {
  const email = i === 1 ? 'demo-affiliate@example.com' : `demo-affiliate-${String(i).padStart(2, '0')}@example.com`
  affiliates.push(await firstOrInsert('affiliates', 'email', email, {
    name: i === 1 ? 'DEMO Affiliate Partner' : `DEMO Affiliate ${String(i).padStart(2, '0')}`,
    email, phone: `555-020-${String(i).padStart(2, '2')}`, referral_code: `DEMO${String(i).padStart(3, '0')}`,
    auth_user_id: i === 1 ? affiliateUser.id : null, status: 'active', terms_signed_at: new Date().toISOString(),
    terms_signature_data: 'FICTIONAL DEMONSTRATION SIGNATURE', clicks: i * 7, active_clients: i % 4,
    notes: 'FICTIONAL DEMONSTRATION RECORD — not real affiliate performance.', tier: i > 10 ? 'Gold' : 'Bronze',
    available_balance: i === 1 ? 125 : 0, pending_commissions: i === 1 ? 75 : 0, lifetime_earnings: i === 1 ? 450 : 0,
  }))
}

const affiliate = affiliates[0]
const legacyReferral = await firstOrInsert('referrals', 'code', 'DEMO001', {
  name: 'DEMO Affiliate Partner', email: 'demo-affiliate@example.com', phone: '555-020-01', code: 'DEMO001',
  commission_per_conversion: 50, active: true, notes: 'FICTIONAL DEMONSTRATION RECORD — legacy referral workflow.',
})
const projectRows = []
const contractRows = []
for (let i = 0; i < clients.length; i++) {
  const client = clients[i]
  const contract = await firstOrInsert('contracts', 'title', `DEMO Contract ${String(i + 1).padStart(2, '0')}`, {
    client_id: client.id, title: `DEMO Contract ${String(i + 1).padStart(2, '0')}`, status: i % 3 === 0 ? 'signed' : 'draft', plan: client.plan,
    monthly_rate: client.plan === 'starter' ? 20 : client.plan === 'growth' ? 50 : client.plan === 'premium' ? 75 : 125,
    hourly_rate: 85,
    start_date: new Date().toISOString().slice(0, 10), content: 'FICTIONAL DEMONSTRATION AGREEMENT — not a legal contract.',
    signed_at: i % 3 === 0 ? new Date().toISOString() : null, signed_by: i % 3 === 0 ? client.name : null,
  })
  contractRows.push(contract)
  const brief = await firstOrInsert('project_briefs', 'id', `10000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, {
    id: `10000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, client_id: client.id, website_type: 'Demonstration website',
    business_summary: 'FICTIONAL DEMONSTRATION PROJECT', target_audience: 'Prospective customers', pages: ['home', 'about', 'contact'], features: ['responsive design'],
  })
  projectRows.push(await firstOrInsert('website_projects', 'name', `DEMO Website Project ${String(i + 1).padStart(2, '0')}`, {
    client_id: client.id, brief_id: brief.id, contract_id: contract.id, name: `DEMO Website Project ${String(i + 1).padStart(2, '0')}`, spending_cap_cents: 50000,
    state: ['building', 'awaiting_contract', 'live'][i % 3], slug: `demo-project-${i + 1}`,
    live_url: 'https://purepulse.one', github_repo: 'https://github.com/Mattjhagen/PurePulse',
    repository_provisioned_at: new Date().toISOString(), pages_verified_at: i % 3 === 2 ? new Date().toISOString() : null,
    referral_code: affiliate.referral_code,
  }))
  await firstOrInsert('invoices', 'invoice_number', `DEMO-${String(i + 1).padStart(4, '0')}`, {
    invoice_number: `DEMO-${String(i + 1).padStart(4, '0')}`, client_id: client.id, status: i % 3 === 0 ? 'paid' : 'sent',
    subtotal: 50, total: 50, due_date: '2026-12-15', notes: 'FICTIONAL DEMONSTRATION INVOICE — no payment is attached.',
  })
  await firstOrInsert('tickets', 'subject', `DEMO Support Request ${String(i + 1).padStart(2, '0')}`, {
    client_id: client.id, subject: `DEMO Support Request ${String(i + 1).padStart(2, '0')}`,
    description: 'FICTIONAL DEMONSTRATION SUPPORT TICKET.', priority: i % 3 === 0 ? 'high' : 'medium', status: i % 2 ? 'open' : 'resolved',
  })
}

for (let i = 0; i < affiliates.length; i++) {
  const aff = affiliates[i]
  const client = clients[i % clients.length]
  const ar = await firstOrInsert('affiliate_referrals', 'id', `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, {
    id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, affiliate_id: aff.id, client_id: client.id,
    plan: client.plan, status: i < 9 ? 'active' : 'pending', commission_rate: 0.1, monthly_commission: 5,
  })
  await firstOrInsert('affiliate_commissions', 'referral_id', ar.id, { affiliate_id: aff.id, referral_id: ar.id, period_month: '2026-11-01', amount: i === 0 ? 50 : 5, status: 'pending' })
}

for (let i = 0; i < 12; i++) {
  const client = clients[i]
  await firstOrInsert('campaigns', 'name', `DEMO Campaign ${String(i + 1).padStart(2, '0')}`, {
    client_id: client.id, contract_id: contractRows[i].id, name: `DEMO Campaign ${String(i + 1).padStart(2, '0')}`,
    plan: client.plan, status: i % 4 === 0 ? 'draft' : 'active', brand_voice: { label: 'FICTIONAL DEMO' }, audience: { segment: 'prospective customers' }, goals: ['awareness', 'leads'],
  })
  await firstOrInsert('leads', 'email', `demo-lead-${String(i + 1).padStart(2, '0')}@example.com`, {
    name: `DEMO Lead ${String(i + 1).padStart(2, '0')}`, email: `demo-lead-${String(i + 1).padStart(2, '0')}@example.com`, project: 'Demonstration website', plan: client.plan, status: i % 3 === 0 ? 'qualified' : 'new', source: 'demo', referral_code: legacyReferral.code,
  })
}

for (let i = 0; i < 8; i++) {
  await firstOrInsert('interviews', 'candidate_email', `demo-candidate-${String(i + 1).padStart(2, '0')}@example.com`, {
    candidate_name: `DEMO Candidate ${String(i + 1).padStart(2, '0')}`, candidate_email: `demo-candidate-${String(i + 1).padStart(2, '0')}@example.com`, candidate_phone: '555-030-0000', status: i < 3 ? 'strong_hire' : i < 6 ? 'under_review' : 'submitted', admin_notes: 'FICTIONAL DEMONSTRATION INTERVIEW — no real applicant.',
  })
}

for (let i = 0; i < 8; i++) {
  const member = teamRows[i]
  const timeUser = [admin, clientUser, affiliateUser][i % 3]
  const periodStart = `2026-10-${String(i + 1).padStart(2, '0')}`
  await firstOrInsert('timesheet_periods', 'period_start', periodStart, { user_id: timeUser.id, period_start: periodStart, period_end: `2026-10-${String(i + 15).padStart(2, '0')}`, status: i % 2 ? 'submitted' : 'open', total_hours: 40, total_regular_hours: 40, total_earnings: 40 * Number(member.hourly_rate || 28) })
  await firstOrInsert('time_entries', 'description', `DEMO time entry ${i + 1}`, { user_id: timeUser.id, client_id: clients[i % clients.length].id, clock_in: '2026-11-10T14:00:00Z', clock_out: '2026-11-10T18:00:00Z', hourly_rate: Number(member.hourly_rate || 28), description: `DEMO time entry ${i + 1}`, status: 'closed', manual_entry: true })
}

fs.mkdirSync(path.dirname(credentialsPath), { recursive: true, mode: 0o700 })
fs.writeFileSync(credentialsPath, [
  'PurePulse isolated fictional demonstration credentials',
  'Generated by scripts/seed-demo.mjs; do not share publicly.',
  `Generated: ${new Date().toISOString()}`,
  ...passwords,
].join('\n') + '\n', { mode: 0o600 })
fs.chmodSync(credentialsPath, 0o600)
console.log(`Seeded isolated demo data and wrote restricted credentials to ${credentialsPath}`)
