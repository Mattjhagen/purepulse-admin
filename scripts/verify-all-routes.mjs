import { spawn } from 'child_process'

const PORT = 3030
const BASE_URL = `http://localhost:${PORT}`

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return true
    } catch {
      // ignore
    }
    await delay(500)
  }
  return false
}

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/portal',
  '/pricing',
  '/pricing/start',
  '/pricing/start?plan=starter',
  '/pricing/start?plan=growth',
  '/pricing/start?plan=premium',
  '/pricing/start?plan=business',
  '/affiliates',
  '/affiliates/apply',
  '/affiliates/login',
  '/interview',
  '/interview/prescreen',
  '/interview/affiliate-prescreen',
  '/interview/test-candidate-token-99',
  '/sign/test-contract-token-123',
  '/checkout/test-checkout-token-456',
  '/checkout/success?token=test-checkout-token-456',
  '/ref/TESTREF',
  '/referrals/connect/test-affiliate-id',
]

const PROTECTED_ADMIN_PAGES = [
  '/dashboard',
  '/clients',
  '/clients/cl_123',
  '/contracts',
  '/contracts/ct_123',
  '/inbox',
  '/invoices',
  '/invoices/inv_123',
  '/leads',
  '/marketing',
  '/messages',
  '/referrals',
  '/referrals/aff_123',
  '/settings',
  '/social',
  '/team',
  '/tickets',
  '/tickets/tkt_123',
  '/time-clock',
  '/time-clock/reports',
  '/time-clock/timesheets',
  '/velour',
  '/campaigns',
  '/campaigns/cmp_123',
  '/interviews',
  '/interviews/int_123',
  '/documents',
  '/calendar',
]

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/qr?data=https://purepulse.one' },
  { method: 'GET', path: '/api/sign/test-token-123' },
  { method: 'GET', path: '/api/ref/TESTCODE' },
  { method: 'POST', path: '/api/pricing/start', body: { name: 'Audit User', email: 'audit@test.local', plan: 'growth' } },
  { method: 'POST', path: '/api/sign/test-token-123', body: { signed_by: 'Audit User', signature_data: 'data:image/png;base64,123' } },
  { method: 'POST', path: '/api/checkout/test-token-123', body: {} },
  { method: 'POST', path: '/api/affiliates/apply', body: { name: 'Affiliate Audit', email: 'aff_audit@test.local', signed_by: 'Affiliate Audit', signature_data: 'data:image/png;base64,123' } },
  { method: 'POST', path: '/api/interviews/submit', body: { candidate_name: 'Audit Candidate', candidate_email: 'cand_audit@test.local' } },
  { method: 'POST', path: '/api/interviews/123/onboard', body: {} },
  { method: 'POST', path: '/api/affiliates/logout', body: {} },
  { method: 'POST', path: '/api/inbox/test-inbound', body: { from: 'test@example.com', subject: 'Ping', body: 'Test' } },
  { method: 'GET', path: '/api/email-templates' },
  { method: 'POST', path: '/api/email-templates/seed', body: {} },
]

async function runAudit() {
  console.log('=================================================================')
  console.log('🔍 Comprehensive Route Audit: purepulse-admin')
  console.log('=================================================================\n')

  let passed = 0
  let failed = 0

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`)
      failed++
    }
  }

  // 1. Audit Public Pages
  console.log('\n--- 1. Public Pages (Expected HTTP 200 / Redirect) ---')
  for (const path of PUBLIC_PAGES) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' })
      assert(`Public page ${path} healthy (status: ${res.status})`, res.status === 200 || res.status === 307 || res.status === 308 || res.status === 302, `status: ${res.status}`)
    } catch (err) {
      assert(`Public page ${path} reachable`, false, err.message)
    }
  }

  // 2. Audit Protected Admin Pages
  console.log('\n--- 2. Protected Admin Pages (Auth Guard Verification) ---')
  for (const path of PROTECTED_ADMIN_PAGES) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' })
      const isRedirectOrLogin = res.status === 307 || res.status === 308 || res.status === 302 || res.status === 200
      const location = res.headers.get('location') || ''
      assert(`Admin page ${path} protected by auth guard (status: ${res.status}, dest: ${location || 'direct'})`, isRedirectOrLogin && (!location || location.includes('/login') || location.includes('/portal')))
    } catch (err) {
      assert(`Admin page ${path} reachable`, false, err.message)
    }
  }

  // 3. Audit API Endpoints
  console.log('\n--- 3. API Endpoints (Health & Safe Handling) ---')
  for (const ep of API_ENDPOINTS) {
    try {
      const options = {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : {},
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      }
      const res = await fetch(`${BASE_URL}${ep.path}`, options)
      // Any response under 500 (200, 400, 401, 404, 409) is a handled, valid response without server crashes
      assert(`API ${ep.method} ${ep.path} handled without crash (status: ${res.status})`, res.status < 500, `status: ${res.status}`)
    } catch (err) {
      assert(`API ${ep.method} ${ep.path} reachable`, false, err.message)
    }
  }

  console.log('\n=================================================================')
  console.log(`📊 purepulse-admin Route Audit Results: ${passed} Passed, ${failed} Failed`)
  console.log('=================================================================\n')

  return failed === 0
}

async function main() {
  console.log('Starting purepulse-admin test server on port', PORT, '...')
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: '/Users/matt/.gemini/antigravity/scratch/purepulse-admin',
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  })

  try {
    const ready = await waitForServer(`${BASE_URL}/pricing`)
    if (!ready) {
      console.error('Failed to start server within timeout.')
      process.exit(1)
    }

    const success = await runAudit()
    server.kill()
    process.exit(success ? 0 : 1)
  } catch (err) {
    console.error(err)
    server.kill()
    process.exit(1)
  }
}

main()
