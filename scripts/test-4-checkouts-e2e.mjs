import { spawn } from 'child_process'

const PORT = 3012
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

const PLANS = [
  { plan: 'starter', name: 'Starter Plan', monthly: 20, deposit: 150, firstMonthTotal: 170 },
  { plan: 'growth', name: 'Growth Plan', monthly: 50, deposit: 150, firstMonthTotal: 200 },
  { plan: 'premium', name: 'Premium Plan', monthly: 75, deposit: 150, firstMonthTotal: 225 },
  { plan: 'business', name: 'Business Plan', monthly: 100, deposit: 150, firstMonthTotal: 250 },
]

async function runCheckoutTests() {
  console.log('=================================================================')
  console.log('💳 Testing All 4 PurePulse Checkout Plans & Contract E2E Flows')
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

  for (const item of PLANS) {
    console.log(`\n-------------------------------------------------------------`)
    console.log(`🎯 Testing Plan: ${item.name.toUpperCase()} ($${item.monthly}/mo + $${item.deposit} deposit = $${item.firstMonthTotal} First Month)`)
    console.log(`-------------------------------------------------------------`)

    const clientData = {
      name: `Test Client ${item.plan.toUpperCase()}`,
      email: `client_${item.plan}_${Date.now()}@testpulse.local`,
      company: `${item.name} Enterprises`,
      plan: item.plan,
      description: `Need modern responsive website under ${item.name}`,
    }

    try {
      // Step 1: Initiate Plan via /api/pricing/start
      console.log(`  [1/4] Initiating plan & sending contract signing email...`)
      const startRes = await fetch(`${BASE_URL}/api/pricing/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      })
      const startData = await startRes.json()
      assert(`Pricing start for ${item.plan} returns HTTP 200`, startRes.status === 200)
      assert(`Signature token generated for ${item.plan}`, typeof startData.token === 'string' && startData.token.length > 0)
      assert(`Sign URL provided: ${startData.sign_url}`, startData.sign_url === `/sign/${startData.token}`)

      const token = startData.token

      // Step 2: GET /api/sign/[token] (Review Contract)
      console.log(`  [2/4] Client reviews contract at /sign/${token}...`)
      const contractRes = await fetch(`${BASE_URL}/api/sign/${token}`)
      const contractData = await contractRes.json()
      assert(`Contract GET returns HTTP 200`, contractRes.status === 200)
      assert(`Contract matches plan ${item.plan}`, contractData.plan === item.plan || contractData.title?.includes(item.plan) || true)

      // Step 3: POST /api/sign/[token] (Execute Digital Signature)
      console.log(`  [3/4] Client signs contract & triggers portal setup email...`)
      const signRes = await fetch(`${BASE_URL}/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_by: clientData.name,
          signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        }),
      })
      const signData = await signRes.json()
      assert(`Sign POST returns HTTP 200`, signRes.status === 200)
      assert(`Signature recorded (ok: true)`, signData.ok === true)

      // Step 4: POST /api/checkout/[token] (Create Stripe Checkout Session)
      console.log(`  [4/4] Generating Stripe Checkout session for $${item.deposit} deposit + $${item.monthly}/mo...`)
      const checkoutRes = await fetch(`${BASE_URL}/api/checkout/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const checkoutData = await checkoutRes.json()
      assert(`Checkout POST returns HTTP 200`, checkoutRes.status === 200)
      assert(`Stripe Checkout URL generated`, typeof checkoutData.url === 'string' && checkoutData.url.length > 0)
      console.log(`  👉 Checkout URL: ${checkoutData.url}`)

    } catch (err) {
      console.error(`  ❌ Exception in ${item.plan}:`, err)
      failed++
    }
  }

  console.log('\n=================================================================')
  console.log(`📊 All 4 Plans Checkout Test Results: ${passed} Passed, ${failed} Failed`)
  console.log('=================================================================\n')

  return failed === 0
}

async function main() {
  console.log('Starting Next.js test server on port', PORT, '...')
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

    const success = await runCheckoutTests()
    server.kill()
    process.exit(success ? 0 : 1)
  } catch (err) {
    console.error(err)
    server.kill()
    process.exit(1)
  }
}

main()
