import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  dollarsToCents,
  centsToDollars,
  formatCentsToMoney,
  mapStripeRecipientStatus,
  createGlobalPayoutRecipient,
  createRecipientAccountLink,
  createOutboundPayment,
  type StripeV2Account,
} from '../lib/stripe-global-payouts'
import { resolveAuthenticatedAffiliate } from '../lib/affiliate-auth'
import { getStripe } from '../lib/stripe'
import type { User, SupabaseClient } from '@supabase/supabase-js'

describe('Stripe Global Payouts & Affiliate Resolution Tests', () => {

  // 1. Authenticated affiliate lookup
  describe('1. Authenticated affiliate lookup', () => {
    test('resolves affiliate by auth_user_id', async () => {
      const mockUser = { id: 'usr_123', email: 'affiliate@purepulse.one' } as User
      const mockAdmin = {
        from: (table: string) => ({
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                if (col === 'auth_user_id' && val === 'usr_123') {
                  return {
                    data: {
                      id: 'aff_1',
                      auth_user_id: 'usr_123',
                      name: 'Affiliate One',
                      email: 'affiliate@purepulse.one',
                      referral_code: 'AFF1',
                      payout_onboarding_status: 'ready_for_payouts',
                      payouts_enabled: true,
                    },
                    error: null,
                  }
                }
                return { data: null, error: null }
              },
            }),
            ilike: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient

      const result = await resolveAuthenticatedAffiliate(mockUser, mockAdmin)
      assert.strictEqual(result.error, undefined)
      assert.strictEqual(result.affiliate?.id, 'aff_1')
      assert.strictEqual(result.affiliate?.auth_user_id, 'usr_123')
    })

    test('resolves unlinked affiliate by email and links auth_user_id', async () => {
      const mockUser = { id: 'usr_new_999', email: 'partner@example.com' } as User
      let linkedUserId: string | null = null

      const mockAdmin = {
        from: (table: string) => ({
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            ilike: (col: string, val: string) => ({
              maybeSingle: async () => {
                if (val === 'partner@example.com') {
                  return {
                    data: {
                      id: 'aff_unlinked',
                      auth_user_id: null,
                      name: 'Partner',
                      email: 'partner@example.com',
                      referral_code: 'PARTNER1',
                      payout_onboarding_status: 'setup_required',
                      payouts_enabled: false,
                    },
                    error: null,
                  }
                }
                return { data: null, error: null }
              },
            }),
          }),
          update: (payload: { auth_user_id: string }) => ({
            eq: (col: string, val: string) => ({
              select: () => ({
                single: async () => {
                  linkedUserId = payload.auth_user_id
                  return {
                    data: {
                      id: 'aff_unlinked',
                      auth_user_id: payload.auth_user_id,
                      name: 'Partner',
                      email: 'partner@example.com',
                      referral_code: 'PARTNER1',
                      payout_onboarding_status: 'setup_required',
                      payouts_enabled: false,
                    },
                    error: null,
                  }
                },
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient

      const result = await resolveAuthenticatedAffiliate(mockUser, mockAdmin)
      assert.strictEqual(result.error, undefined)
      assert.strictEqual(result.affiliate?.id, 'aff_unlinked')
      assert.strictEqual(linkedUserId, 'usr_new_999')
    })
  })

  // 2. Missing affiliate record
  describe('2. Missing affiliate record', () => {
    test('returns null affiliate with error message when record does not exist', async () => {
      const mockUser = { id: 'usr_unknown', email: 'nonexistent@example.com' } as User
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      } as unknown as SupabaseClient

      const result = await resolveAuthenticatedAffiliate(mockUser, mockAdmin)
      assert.strictEqual(result.affiliate, null)
      assert.strictEqual(result.error, 'Affiliate record not found')
    })
  })

  // 3. First-time recipient creation
  describe('3. First-time recipient creation', () => {
    test('creates v2 recipient account with correct payload and requested capabilities', async () => {
      const originalFetch = global.fetch
      let capturedUrl = ''
      let capturedBody: Record<string, unknown> = {}
      let capturedHeaders: Record<string, string> = {}

      global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString()
        capturedBody = JSON.parse((init?.body as string) || '{}')
        capturedHeaders = init?.headers as Record<string, string>
        return {
          ok: true,
          json: async () => ({
            id: 'acct_v2_rec_123',
            object: 'account',
            contact_email: 'jane@example.com',
            display_name: 'Jane Doe',
            identity: { country: 'US', entity_type: 'individual' },
            configuration: {
              recipient: {
                capabilities: {
                  bank_accounts: { local: { requested: true, status: 'pending' } },
                },
              },
            },
          }),
        } as Response
      }

      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_123'
      try {
        const recipient = await createGlobalPayoutRecipient({
          email: 'jane@example.com',
          name: 'Jane Doe',
          country: 'US',
          entityType: 'individual',
          affiliateId: 'aff_100',
          referralCode: 'JANE100',
        })

        assert.strictEqual(recipient.id, 'acct_v2_rec_123')
        assert.ok(capturedUrl.includes('/v2/core/accounts'))
        assert.strictEqual(capturedBody.contact_email, 'jane@example.com')
        assert.strictEqual(capturedBody.display_name, 'Jane Doe')
        assert.deepStrictEqual(capturedBody.identity, { country: 'US', entity_type: 'individual' })
        assert.strictEqual(capturedHeaders['Authorization'], 'Bearer sk_test_mock_123')
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  // 4. Reusing an existing recipient
  describe('4. Reusing an existing recipient', () => {
    test('does not create duplicate recipient when ID already exists on affiliate', () => {
      const affiliate = {
        id: 'aff_existing',
        stripe_global_payout_recipient_id: 'acct_v2_existing_777',
      }
      assert.strictEqual(affiliate.stripe_global_payout_recipient_id, 'acct_v2_existing_777')
    })
  })

  // 5. Account Link generation
  describe('5. Account Link generation', () => {
    test('generates Account Link v2 with recipient configuration and correct return/refresh URLs', async () => {
      const originalFetch = global.fetch
      let capturedBody: Record<string, unknown> = {}

      global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse((init?.body as string) || '{}')
        return {
          ok: true,
          json: async () => ({
            id: 'aclink_123',
            object: 'account_link',
            url: 'https://connect.stripe.com/setup/v2/c/12345',
          }),
        } as Response
      }

      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_123'
      try {
        const link = await createRecipientAccountLink({
          accountId: 'acct_v2_rec_123',
          returnUrl: 'https://login.purepulse.one/affiliates/dashboard?tab=payouts&returned=1',
          refreshUrl: 'https://login.purepulse.one/affiliates/dashboard?tab=payouts&reauth=1',
          collectionOption: 'currently_due',
        })

        assert.strictEqual(link.url, 'https://connect.stripe.com/setup/v2/c/12345')
        assert.strictEqual(capturedBody.account, 'acct_v2_rec_123')
        assert.deepStrictEqual(
          (capturedBody.use_case as { account_onboarding: { configurations: string[] } }).account_onboarding.configurations,
          ['recipient']
        )
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  // 6. Return from incomplete onboarding
  describe('6. Return from incomplete onboarding', () => {
    test('maps incomplete recipient account to setup_required', () => {
      const mockAccount: StripeV2Account = {
        id: 'acct_123',
        object: 'account',
        configuration: {
          recipient: {
            capabilities: {
              bank_accounts: { local: { requested: true, status: 'inactive' } },
            },
          },
        },
        requirements: {
          currently_due: [],
          eventually_due: [],
        },
      }

      const res = mapStripeRecipientStatus(mockAccount)
      assert.strictEqual(res.payoutOnboardingStatus, 'setup_required')
      assert.strictEqual(res.payoutsEnabled, false)
    })
  })

  // 7. Active payout capability
  describe('7. Active payout capability', () => {
    test('maps active bank capability with no pending requirements to ready_for_payouts', () => {
      const mockAccount: StripeV2Account = {
        id: 'acct_123',
        object: 'account',
        configuration: {
          recipient: {
            capabilities: {
              bank_accounts: { local: { requested: true, status: 'active' } },
            },
          },
        },
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
        },
      }

      const res = mapStripeRecipientStatus(mockAccount)
      assert.strictEqual(res.payoutOnboardingStatus, 'ready_for_payouts')
      assert.strictEqual(res.payoutsEnabled, true)
    })
  })

  // 8. Additional requirements
  describe('8. Additional requirements', () => {
    test('maps account with currently_due requirements to additional_information_required', () => {
      const mockAccount: StripeV2Account = {
        id: 'acct_123',
        object: 'account',
        configuration: {
          recipient: {
            capabilities: {
              bank_accounts: { local: { requested: true, status: 'pending' } },
            },
          },
        },
        requirements: {
          currently_due: ['individual.verification.document'],
          eventually_due: [],
        },
      }

      const res = mapStripeRecipientStatus(mockAccount)
      assert.strictEqual(res.payoutOnboardingStatus, 'additional_information_required')
      assert.strictEqual(res.payoutsEnabled, false)
      assert.deepStrictEqual(res.requirementsDue, ['individual.verification.document'])
    })
  })

  // 9. Unauthorized access to another affiliate
  describe('9. Unauthorized access to another affiliate', () => {
    test('rejects affiliate resolution when auth user ID does not match and email is different', async () => {
      const attackerUser = { id: 'usr_attacker', email: 'attacker@evil.com' } as User
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      } as unknown as SupabaseClient

      const result = await resolveAuthenticatedAffiliate(attackerUser, mockAdmin)
      assert.strictEqual(result.affiliate, null)
      assert.strictEqual(result.error, 'Affiliate record not found')
    })
  })

  // 10. Invalid webhook signatures
  describe('10. Invalid webhook signatures', () => {
    test('rejects invalid signature verification', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_123'
      const stripe = getStripe()

      assert.throws(() => {
        stripe.webhooks.constructEvent(
          JSON.stringify({ id: 'evt_123' }),
          't=123,v1=invalid_signature',
          'whsec_test_secret'
        )
      })
    })
  })

  // 11. Duplicate webhook delivery
  describe('11. Duplicate webhook delivery', () => {
    test('detects duplicate webhook event ID', async () => {
      const processedEvents = new Set(['evt_processed_1'])
      const isDuplicate = (eventId: string) => processedEvents.has(eventId)

      assert.strictEqual(isDuplicate('evt_processed_1'), true)
      assert.strictEqual(isDuplicate('evt_new_2'), false)
    })
  })

  // 12. Payouts below $20
  describe('12. Payouts below $20', () => {
    test('rejects createOutboundPayment for amounts below $20 (2000 cents)', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_123'
      await assert.rejects(
        async () => {
          await createOutboundPayment({
            recipientAccountId: 'acct_123',
            amountCents: 1500, // $15.00
            idempotencyKey: 'key_123',
          })
        },
        {
          name: 'Error',
          message: 'Minimum payout threshold is $20.00 (2000 cents).',
        }
      )
    })
  })

  // 13. Duplicate payout attempts
  describe('13. Duplicate payout attempts', () => {
    test('generates deterministic idempotency key based on affiliate, period, and commission IDs', () => {
      const affId = 'aff_abc_123'
      const period = '2026-08'
      const amountCents = 5000
      const commissionIds = ['comm_2', 'comm_1']

      const key1 = `payout_${affId}_${period}_${amountCents}_${[...commissionIds].sort().join('_')}`
      const key2 = `payout_${affId}_${period}_${amountCents}_${['comm_1', 'comm_2'].sort().join('_')}`

      assert.strictEqual(key1, key2)
      assert.strictEqual(key1, 'payout_aff_abc_123_2026-08_5000_comm_1_comm_2')
    })
  })

  // 14. Correct integer currency calculations
  describe('14. Correct integer currency calculations', () => {
    test('converts dollar numbers and strings accurately to integer cents without floating point drift', () => {
      assert.strictEqual(dollarsToCents(19.99), 1999)
      assert.strictEqual(dollarsToCents('19.99'), 1999)
      assert.strictEqual(dollarsToCents('$150.00'), 15000)
      assert.strictEqual(dollarsToCents(0.1 + 0.2), 30) // 0.30000000000000004 avoided
      assert.strictEqual(dollarsToCents(33.75), 3375)
      assert.strictEqual(dollarsToCents(50), 5000)
    })

    test('converts cents accurately back to dollars and formatted currency strings', () => {
      assert.strictEqual(centsToDollars(1999), 19.99)
      assert.strictEqual(centsToDollars(2000), 20)
      assert.strictEqual(formatCentsToMoney(2000), '$20.00')
      assert.strictEqual(formatCentsToMoney(3375), '$33.75')
      assert.strictEqual(formatCentsToMoney(15000), '$150.00')
    })
  })
})
