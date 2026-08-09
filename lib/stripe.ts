import Stripe from 'stripe'
import type { Plan } from './types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

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
