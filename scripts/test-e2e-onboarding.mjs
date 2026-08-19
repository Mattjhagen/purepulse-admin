import http from 'http'
import { spawn } from 'child_process'

const PORT = 3010
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

async function runTests() {
  console.log('=====================================================')
  console.log('🧪 PurePulse E2E Onboarding & Video Interview Test Suite')
  console.log('=====================================================\n')

  const timestamp = Date.now()
  const testCandidate = {
    name: `Test Partner ${timestamp.toString().slice(-4)}`,
    email: `partner_${timestamp}@testpulse.local`,
    phone: '555-019-2834',
  }

  let passed = 0
  let failed = 0

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${name} ${details ? `(${details})` : ''}`)
      failed++
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Prescreen Interview Page Load & Param Parsing
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Pre-Screen Video Interview Page ---')
    const prescreenUrl = `${BASE_URL}/interview/prescreen?src=indeed&applicant=${encodeURIComponent(testCandidate.name)}`
    const prescreenRes = await fetch(prescreenUrl)
    const prescreenHtml = await prescreenRes.text()
    assert('Prescreen page returns HTTP 200', prescreenRes.status === 200, `status: ${prescreenRes.status}`)
    assert('Applicant name parsed in HTML payload', prescreenHtml.includes(testCandidate.name))

    // -------------------------------------------------------------------------
    // TEST 2: Video Recording Upload Endpoint (/api/interviews/upload)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Video Upload Endpoint ---')
    const dummyBlob = new Blob(['mock-video-chunk-data-webm-12345'], { type: 'video/webm' })
    const formData = new FormData()
    formData.append('video', dummyBlob, 'q1.webm')
    formData.append('questionId', 'q1')
    formData.append('email', testCandidate.email)

    const uploadRes = await fetch(`${BASE_URL}/api/interviews/upload`, {
      method: 'POST',
      body: formData,
    })
    const uploadData = await uploadRes.json()
    assert('Video upload endpoint returns HTTP 200', uploadRes.status === 200)
    assert('Video upload returns ok: true', uploadData.ok === true)
    assert('Video upload returns valid video URL', typeof uploadData.url === 'string' && uploadData.url.length > 0)

    // -------------------------------------------------------------------------
    // TEST 3: Interview Submission Endpoint (/api/interviews/submit)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Interview Submission Endpoint ---')
    const submitRes = await fetch(`${BASE_URL}/api/interviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: testCandidate.name,
        candidate_email: testCandidate.email,
        candidate_phone: testCandidate.phone,
        job_title: 'Affiliate Sales Partner',
        video_urls: {
          q1: uploadData.url,
          q2: uploadData.url,
          roleplay: uploadData.url,
        },
        text_answers: {
          q1: 'I will target local HVAC contractors, gyms, and dental offices.',
          q2: 'Very comfortable walking in and introducing myself.',
        },
      }),
    })
    const submitData = await submitRes.json()
    assert('Interview submit returns HTTP 200', submitRes.status === 200)
    assert('Interview submit returns ok: true', submitData.ok === true)
    assert('Interview ID generated', typeof submitData.interview_id === 'string' && submitData.interview_id.length > 0)

    const interviewId = submitData.interview_id

    // -------------------------------------------------------------------------
    // TEST 4: Affiliate Application & Contract Digital Signing (/api/affiliates/apply)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Affiliate Application & Digital Contract Signing ---')
    const applyRes = await fetch(`${BASE_URL}/api/affiliates/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testCandidate.name,
        email: testCandidate.email,
        phone: testCandidate.phone,
        notes: 'In-person walk-ins and local business networking',
        signed_by: testCandidate.name,
        signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    })
    const applyData = await applyRes.json()
    assert('Affiliate apply returns HTTP 200 or 409 duplicate handling', applyRes.status === 200 || applyRes.status === 409)
    if (applyRes.status === 200) {
      assert('Referral code generated', typeof applyData.referral_code === 'string' && applyData.referral_code.length > 0)
      assert('Action link or dashboard entry URL provided', typeof applyData.action_link === 'string')
    }

    // -------------------------------------------------------------------------
    // TEST 5: QR Code Brand Generator (/api/qr)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Dynamic QR Code Brand Generator ---')
    const testReferralUrl = `https://purepulse.one/pricing?ref=TESTCODE`
    const qrRes = await fetch(`${BASE_URL}/api/qr?data=${encodeURIComponent(testReferralUrl)}&size=300`)
    assert('QR code endpoint returns HTTP 200', qrRes.status === 200)
    const qrContentType = qrRes.headers.get('content-type')
    assert('QR code content-type is image/png or image/svg', qrContentType?.includes('image') === true)

    // -------------------------------------------------------------------------
    // TEST 6: Standalone Dynamic Tokenized Routes (/interview/[token])
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Dynamic Tokenized Interview Route ---')
    const tokenRouteRes = await fetch(`${BASE_URL}/interview/inv-custom-token-9f82?applicant=${encodeURIComponent(testCandidate.name)}`)
    assert('Dynamic interview token route returns HTTP 200', tokenRouteRes.status === 200)

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n=====================================================')
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`)
    console.log('=====================================================\n')

    return failed === 0
  } catch (error) {
    console.error('Fatal test error:', error)
    return false
  }
}

async function main() {
  console.log('Starting Next.js server on port', PORT, '...')
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: '/Users/matt/.gemini/antigravity/scratch/purepulse-admin',
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  })

  try {
    const ready = await waitForServer(`${BASE_URL}/interview`)
    if (!ready) {
      console.error('Failed to start server within timeout.')
      process.exit(1)
    }

    const success = await runTests()
    server.kill()
    process.exit(success ? 0 : 1)
  } catch (err) {
    console.error(err)
    server.kill()
    process.exit(1)
  }
}

main()
