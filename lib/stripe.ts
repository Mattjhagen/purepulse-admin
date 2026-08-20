import Stripe from 'stripe'
import type { Plan } from './types'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    let key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY || ''
    key = key.trim().replace(/^["'`]|["'`]$/g, '').trim()
    while (key.toLowerCase().startsWith('bearer ')) {
      key = key.slice(7).trim()
    }
    key = key.replace(/[\r\n\t]/g, '').trim()

    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-07-29.dahlia' })
  }
  return _stripe
}

export const DEPOSIT_CENTS = 15000 // $150.00

export const PLAN_CENTS: Record<Plan, number> = {
  starter: 2000,
  growth: 5000,
  premium: 7500,
  business: 10000,
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  premium: 'Premium',
  business: 'Business',
}

export function getPlanPriceId(plan: Plan): string | null {
  const ids: Record<Plan, string | undefined> = {
    starter:  process.env.STRIPE_PRICE_STARTER,
    growth:   process.env.STRIPE_PRICE_GROWTH,
    premium:  process.env.STRIPE_PRICE_PREMIUM,
    business: process.env.STRIPE_PRICE_BUSINESS,
  }
  return ids[plan] ?? null
}

export function getDepositPriceId(): string | null {
  return process.env.STRIPE_PRICE_DEPOSIT ?? null
}
