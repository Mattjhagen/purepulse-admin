import Stripe from 'stripe'

const ISSUING_API_VERSION = '2026-07-29.dahlia' as const
let issuingClient: Stripe | null = null

function cleanSecret(value: string | undefined): string {
  return (value || '').trim().replace(/^['"`]|['"`]$/g, '').replace(/[\r\n\t]/g, '')
}

export function getIssuingStripe(): Stripe {
  if (issuingClient) return issuingClient

  const key = cleanSecret(process.env.STRIPE_ISSUING_SECRET_KEY)
  if (!key) throw new Error('STRIPE_ISSUING_SECRET_KEY is not configured')
  if (!key.startsWith('sk_test_')) {
    throw new Error('Issuing integration is sandbox-only until live access is approved')
  }

  const configuredVersion = process.env.STRIPE_ISSUING_API_VERSION || ISSUING_API_VERSION
  if (configuredVersion !== ISSUING_API_VERSION) {
    throw new Error(`STRIPE_ISSUING_API_VERSION must be ${ISSUING_API_VERSION}`)
  }

  issuingClient = new Stripe(key, { apiVersion: ISSUING_API_VERSION })
  return issuingClient
}

export function assertIssuingProvisioningEnabled(): void {
  if (process.env.STRIPE_ISSUING_MODE !== 'test') {
    throw new Error('STRIPE_ISSUING_MODE must be test')
  }
  if (process.env.STRIPE_ISSUING_PROVISIONING_ENABLED !== 'true') {
    throw new Error('Issuing provisioning is disabled')
  }
}

export const DEFAULT_MONTHLY_SPEND_LIMIT_CENTS = 50_000

