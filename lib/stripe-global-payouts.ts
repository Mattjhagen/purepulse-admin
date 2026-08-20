import type { PayoutOnboardingStatus } from './affiliate-auth'

const STRIPE_API_BASE = 'https://api.stripe.com'
export const DEFAULT_GLOBAL_PAYOUTS_API_VERSION = '2026-07-29.preview'

export interface StripeV2Account {
  id: string
  object: string
  contact_email?: string
  display_name?: string
  identity?: {
    country?: string
    entity_type?: 'individual' | 'company'
  }
  configuration?: {
    recipient?: {
      capabilities?: {
        bank_accounts?: {
          local?: {
            status?: 'active' | 'inactive' | 'pending' | 'restricted'
            requested?: boolean
          }
          wire?: {
            status?: 'active' | 'inactive' | 'pending' | 'restricted'
            requested?: boolean
          }
        }
        stripe_balance?: {
          status?: 'active' | 'inactive' | 'pending' | 'restricted'
          requested?: boolean
        }
      }
      payout_methods?: {
        default_outbound_destination?: string
      }
    }
  }
  requirements?: {
    currently_due?: string[]
    eventually_due?: string[]
    past_due?: string[]
    pending_verification?: string[]
    disabled_reason?: string
  }
  metadata?: Record<string, string>
}

export interface StripeV2AccountLink {
  id: string
  object: string
  url: string
  expires_at?: number
}

export interface RecipientStatusResult {
  payoutOnboardingStatus: PayoutOnboardingStatus
  payoutsEnabled: boolean
  requirementsDue: string[]
  payoutMethodId: string | null
  rawStatus?: string
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }
  return key
}

function getGlobalPayoutsApiVersion(): string {
  return process.env.STRIPE_GLOBAL_PAYOUTS_API_VERSION || DEFAULT_GLOBAL_PAYOUTS_API_VERSION
}

/**
 * Executes a secure server-side call to the Stripe v2 API.
 * Using native fetch ensures exact compatibility with v2 endpoints and custom preview API versions.
 */
export async function stripeV2Fetch<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE'
    body?: Record<string, unknown>
    idempotencyKey?: string
    apiVersion?: string
  } = {}
): Promise<T> {
  const secretKey = getStripeSecretKey()
  const apiVersion = options.apiVersion || getGlobalPayoutsApiVersion()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Stripe-Version': apiVersion,
    'Content-Type': 'application/json',
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }

  const url = endpoint.startsWith('http') ? endpoint : `${STRIPE_API_BASE}${endpoint}`

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const errorMsg = json?.error?.message || json?.message || `Stripe API Error (${res.status})`
    const err = new Error(errorMsg) as Error & { status: number; code?: string; type?: string }
    err.status = res.status
    err.code = json?.error?.code
    err.type = json?.error?.type
    throw err
  }

  return json as T
}

/**
 * Creates a Stripe Global Payouts Recipient Account using the Accounts v2 API.
 */
export async function createGlobalPayoutRecipient(params: {
  email: string
  name: string
  country?: string
  entityType?: 'individual' | 'company'
  affiliateId: string
  referralCode: string
}): Promise<StripeV2Account> {
  const country = (params.country || 'US').toUpperCase()
  const entityType = params.entityType || 'individual'

  const body = {
    contact_email: params.email,
    display_name: params.name,
    identity: {
      country,
      entity_type: entityType,
    },
    configuration: {
      recipient: {
        capabilities: {
          bank_accounts: {
            local: { requested: true },
          },
        },
      },
    },
    metadata: {
      affiliate_id: params.affiliateId,
      referral_code: params.referralCode,
      system: 'purepulse_affiliates',
    },
  }

  return stripeV2Fetch<StripeV2Account>('/v2/core/accounts', {
    method: 'POST',
    body,
  })
}

/**
 * Generates an Account Link v2 for Stripe's hosted recipient onboarding form.
 */
export async function createRecipientAccountLink(params: {
  accountId: string
  returnUrl: string
  refreshUrl: string
  collectionOption?: 'currently_due' | 'eventually_due'
}): Promise<StripeV2AccountLink> {
  const body = {
    account: params.accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        refresh_url: params.refreshUrl,
        return_url: params.returnUrl,
        collection_options: {
          fields: params.collectionOption || 'currently_due',
        },
      },
    },
  }

  return stripeV2Fetch<StripeV2AccountLink>('/v2/core/account_links', {
    method: 'POST',
    body,
  })
}

/**
 * Retrieves a Global Payouts Recipient Account with full recipient configuration and requirements.
 */
export async function getGlobalPayoutRecipient(accountId: string): Promise<StripeV2Account> {
  return stripeV2Fetch<StripeV2Account>(
    `/v2/core/accounts/${encodeURIComponent(accountId)}?include[]=configuration.recipient&include[]=requirements`,
    { method: 'GET' }
  )
}

/**
 * Evaluates the status of a Stripe Global Payouts Recipient account and maps it to
 * one of the 5 canonical user-facing statuses.
 */
export function mapStripeRecipientStatus(account: StripeV2Account): RecipientStatusResult {
  const localBankCap = account.configuration?.recipient?.capabilities?.bank_accounts?.local
  const isCapActive = localBankCap?.status === 'active'
  const isCapPending = localBankCap?.status === 'pending'
  const isCapRestricted = localBankCap?.status === 'restricted'

  const reqs = account.requirements || {}
  const currentlyDue = reqs.currently_due || []
  const pastDue = reqs.past_due || []
  const pendingVerification = reqs.pending_verification || []
  const disabledReason = reqs.disabled_reason

  const allDue = Array.from(new Set([...currentlyDue, ...pastDue]))
  const payoutMethodId = account.configuration?.recipient?.payout_methods?.default_outbound_destination || null

  let status: PayoutOnboardingStatus = 'setup_required'
  let payoutsEnabled = false

  if (disabledReason || isCapRestricted) {
    status = 'payouts_restricted'
    payoutsEnabled = false
  } else if (allDue.length > 0) {
    status = 'additional_information_required'
    payoutsEnabled = false
  } else if (isCapPending || pendingVerification.length > 0) {
    status = 'verification_pending'
    payoutsEnabled = false
  } else if (isCapActive) {
    status = 'ready_for_payouts'
    payoutsEnabled = true
  } else {
    status = 'setup_required'
    payoutsEnabled = false
  }

  return {
    payoutOnboardingStatus: status,
    payoutsEnabled,
    requirementsDue: allDue,
    payoutMethodId,
    rawStatus: localBankCap?.status,
  }
}

/**
 * Creates an Outbound Payment via Stripe Global Payouts / Money Management API.
 */
export async function createOutboundPayment(params: {
  financialAccountId?: string
  recipientAccountId: string
  amountCents: number
  currency?: string
  idempotencyKey: string
  description?: string
}): Promise<{ id: string; status: string; amount_cents: number; currency: string }> {
  if (params.amountCents < 2000) {
    throw new Error('Minimum payout threshold is $20.00 (2000 cents).')
  }

  const currency = (params.currency || 'usd').toLowerCase()
  const financialAccountId = params.financialAccountId || process.env.STRIPE_FINANCIAL_ACCOUNT_ID

  const body: Record<string, unknown> = {
    to: {
      recipient: params.recipientAccountId,
    },
    amount: {
      value: params.amountCents,
      currency,
    },
    description: params.description || 'PurePulse Affiliate Commission Payout',
  }

  if (financialAccountId) {
    body.from = {
      financial_account: financialAccountId,
      currency,
    }
  }

  return stripeV2Fetch<{ id: string; status: string; amount_cents: number; currency: string }>(
    '/v2/money_management/outbound_payments',
    {
      method: 'POST',
      body,
      idempotencyKey: params.idempotencyKey,
    }
  )
}

/**
 * Accurate currency arithmetic helpers using integer minor units (cents).
 * Avoids JavaScript floating-point errors.
 */
export function dollarsToCents(dollars: number | string): number {
  if (typeof dollars === 'string') {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]+/g, ''))
    if (isNaN(parsed)) return 0
    return Math.round(parsed * 100)
  }
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function formatCentsToMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
