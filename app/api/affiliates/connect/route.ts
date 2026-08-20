import { NextRequest, NextResponse } from 'next/server'
import { POST as onboardPost } from '../payouts/onboard/route'

/**
 * Backward compatibility alias for /api/affiliates/connect.
 * Proxies requests directly to the Stripe Global Payouts onboarding handler.
 */
export async function POST(req: NextRequest) {
  return onboardPost(req)
}
