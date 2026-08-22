const STRIPE_API_BASE = 'https://api.stripe.com'
const CONNECT_SANDBOX_API_VERSION = '2026-07-29.preview'

export type ConnectSandboxStatus =
  | 'not_started'
  | 'onboarding_required'
  | 'verification_pending'
  | 'ready'
  | 'restricted'

export interface StripeConnectSandboxAccount {
  id: string
  contact_email?: string
  display_name?: string
  dashboard?: string
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: {
            requested?: boolean
            status?: 'active' | 'inactive' | 'pending' | 'restricted'
          }
        }
      }
    }
  }
  requirements?: {
    currently_due?: string[]
    past_due?: string[]
    pending_verification?: string[]
    disabled_reason?: string
  }
}

function getConnectSandboxKey(): string {
  const key = (
    process.env.STRIPE_CONNECT_SANDBOX_SECRET_KEY ||
    process.env.STRIPE_ISSUING_SECRET_KEY ||
    ''
  ).trim().replace(/^["'`]|["'`]$/g, '').replace(/[\r\n\t]/g, '')

  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    throw new Error('Stripe Connect sandbox key must be a test-mode secret or restricted key')
  }
  return key
}

export function assertConnectSandboxEnabled(): void {
  if (process.env.STRIPE_CONNECT_SANDBOX_ENABLED !== 'true') {
    throw new Error('Stripe Connect sandbox is disabled')
  }
}

async function connectSandboxFetch<T>(
  endpoint: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getConnectSandboxKey()}`,
    'Stripe-Version': process.env.STRIPE_CONNECT_SANDBOX_API_VERSION || CONNECT_SANDBOX_API_VERSION,
    'Content-Type': 'application/json',
  }
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.error?.message || json?.message || `Stripe Connect error (${response.status})`)
  }
  return json as T
}

export async function createConnectSandboxAccount(params: {
  affiliateId: string
  email: string
  name: string
  country: string
}): Promise<StripeConnectSandboxAccount> {
  return connectSandboxFetch('/v2/core/accounts', {
    method: 'POST',
    idempotencyKey: `purepulse-connect-sandbox-${params.affiliateId}`,
    body: {
      contact_email: params.email,
      display_name: params.name,
      dashboard: 'express',
      defaults: {
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
      },
      identity: { country: params.country.toLowerCase() },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      metadata: {
        affiliate_id: params.affiliateId,
        environment: 'test',
        system: 'purepulse_affiliates',
      },
      include: ['configuration.recipient', 'identity', 'requirements'],
    },
  })
}

export async function createConnectSandboxOnboardingLink(params: {
  accountId: string
  returnUrl: string
  refreshUrl: string
}): Promise<{ id: string; url: string; expires_at?: number }> {
  return connectSandboxFetch('/v2/core/account_links', {
    method: 'POST',
    body: {
      account: params.accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          return_url: params.returnUrl,
          refresh_url: params.refreshUrl,
          collection_options: { fields: 'eventually_due' },
        },
      },
    },
  })
}

export async function getConnectSandboxAccount(accountId: string): Promise<StripeConnectSandboxAccount> {
  return connectSandboxFetch(
    `/v2/core/accounts/${encodeURIComponent(accountId)}?include[]=configuration.recipient&include[]=requirements`,
  )
}

export function mapConnectSandboxStatus(account: StripeConnectSandboxAccount): {
  status: ConnectSandboxStatus
  transfersEnabled: boolean
  requirementsDue: string[]
} {
  const capability = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers
  const requirements = account.requirements || {}
  const requirementsDue = Array.from(new Set([
    ...(requirements.currently_due || []),
    ...(requirements.past_due || []),
  ]))

  if (requirements.disabled_reason || capability?.status === 'restricted') {
    return { status: 'restricted', transfersEnabled: false, requirementsDue }
  }
  if (requirementsDue.length > 0) {
    return { status: 'onboarding_required', transfersEnabled: false, requirementsDue }
  }
  if ((requirements.pending_verification || []).length > 0 || capability?.status === 'pending') {
    return { status: 'verification_pending', transfersEnabled: false, requirementsDue }
  }
  if (capability?.status === 'active') {
    return { status: 'ready', transfersEnabled: true, requirementsDue }
  }
  return { status: 'onboarding_required', transfersEnabled: false, requirementsDue }
}
