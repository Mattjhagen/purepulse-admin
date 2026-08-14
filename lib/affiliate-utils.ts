import type { Plan } from './types'
import { PLAN_PRICES } from './types'

export const AFFILIATE_COMMISSION_RATES: Record<Plan, number> = {
  starter: 0.10,
  growth: 0.40,
  premium: 0.45,
  business: 0.50,
}

export function calculateMonthlyCommission(plan: Plan | string, monthlyRate: number): number {
  const rate = AFFILIATE_COMMISSION_RATES[plan as Plan] ?? 0.10
  return Math.round(monthlyRate * rate * 100) / 100
}

export function commissionForPlan(plan: Plan | string): number {
  const price = PLAN_PRICES[plan as Plan] ?? 0
  return calculateMonthlyCommission(plan, price)
}

export function generateReferralCode(name: string): string {
  const base = name.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
  const suffix = Math.floor(100 + Math.random() * 900).toString()
  return `${base}${suffix}`
}

export const AFFILIATE_TERMS = `PUREPULSE AFFILIATE PROGRAM AGREEMENT

IMPORTANT: PLEASE READ THIS AGREEMENT CAREFULLY BEFORE PARTICIPATING IN THE PUREPULSE AFFILIATE PROGRAM.

This Affiliate Program Agreement ("Agreement") is entered into between PurePulse Web Services ("Company," "we," or "us") and the individual identified below ("Affiliate," "you").

──────────────────────────────────────────────

1. PROGRAM OVERVIEW

The PurePulse Affiliate Program allows approved participants to earn recurring commissions by referring new clients to PurePulse's web design and monthly maintenance services. Participation is subject to approval and compliance with this Agreement.

──────────────────────────────────────────────

2. COMMISSION STRUCTURE

Affiliates earn recurring monthly commissions for each referred client who maintains an active, paid subscription. Commissions are calculated as a percentage of the client's monthly plan fee:

  Plan          Monthly Fee    Commission Rate    Your Monthly Earnings
  ─────────     ───────────    ───────────────    ─────────────────────
  Starter       $20/mo         10%                $2.00 per client
  Growth        $50/mo         40%                $20.00 per client
  Premium       $75/mo         45%                $33.75 per client
  Business      $100/mo        50%                $50.00 per client

Commissions begin accruing from the first full calendar month in which the referred client has an active, paid subscription. No commission is earned during trial periods, deposit-only phases, or months in which the client's payment fails.

──────────────────────────────────────────────

3. PERFORMANCE BONUS — FREE VIBECODES.SPACE BUSINESS PLAN

Affiliates who generate at least one (1) new active client referral in a calendar month will receive complimentary access to the vibecodes.space Business Plan (valued at $49/month) for that calendar month. This benefit:

  (a) Applies to the Affiliate's own business use on vibecodes.space
  (b) Resets each calendar month — ongoing eligibility requires ongoing referral activity
  (c) Is non-transferable and has no cash value
  (d) Will be provisioned by PurePulse within 5 business days of eligibility confirmation

──────────────────────────────────────────────

4. REFERRAL TRACKING

Each Affiliate is assigned a unique referral code (e.g., "JANE123"). Affiliates must direct prospects using their unique referral link:

    purepulse.one/pricing?ref=YOURCODE

Referrals made outside of this link cannot be retroactively credited. PurePulse uses cookie-based tracking; if a prospect clears cookies or uses a different device, the referral may not be attributed.

──────────────────────────────────────────────

5. PAYMENT TERMS

  (a) Commissions are calculated at the beginning of each calendar month for the prior month's active referrals.
  (b) Payments are made within 15 business days via ACH transfer or PayPal.
  (c) Minimum payout threshold: $20.00. Balances below this threshold carry forward.
  (d) Affiliates are responsible for providing accurate payment details and updating them promptly if they change.
  (e) PurePulse reserves the right to withhold payment pending investigation of suspected fraud or policy violations.

──────────────────────────────────────────────

6. PROHIBITED CONDUCT

Affiliates may NOT:

  (a) Use deceptive, misleading, spam-based, or unlawful marketing methods
  (b) Make false or exaggerated claims about PurePulse's services or guarantees
  (c) Bid on or use PurePulse branded keywords (e.g., "PurePulse") in paid search advertising
  (d) Refer themselves, family members, or entities they own or control
  (e) Purchase fake traffic, bot traffic, or engage in any form of click fraud
  (f) Offer unauthorized discounts, cash-back incentives, or rebates to prospects
  (g) Post referral links in a manner that violates any platform's terms of service

Violation of these terms may result in immediate termination of this Agreement and forfeiture of unpaid commissions.

──────────────────────────────────────────────

7. INDEPENDENT CONTRACTOR RELATIONSHIP

Affiliates are independent contractors. Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship. Affiliates are solely responsible for all federal, state, and local taxes on commissions earned. PurePulse will issue a Form 1099-NEC for U.S.-based Affiliates who earn $600 or more in a calendar year.

──────────────────────────────────────────────

8. TERM AND TERMINATION

  (a) This Agreement begins when you submit your application and is effective upon our approval.
  (b) Either party may terminate with 30 days' written notice.
  (c) PurePulse may terminate immediately for violation of Section 6 or applicable law.
  (d) Upon termination, earned commissions on currently active referrals will be paid through the end of the final calendar month; no new commissions accrue after termination.
  (e) Your referral link will be deactivated upon termination.

──────────────────────────────────────────────

9. PROGRAM MODIFICATION

PurePulse reserves the right to modify commission rates, program structure, or these terms at any time with 30 days' advance notice delivered to your registered email address. Your continued participation after the notice period constitutes acceptance of the modified terms. If you do not accept modifications, you may terminate pursuant to Section 8.

──────────────────────────────────────────────

10. INTELLECTUAL PROPERTY

PurePulse grants you a limited, non-exclusive, non-transferable, revocable license to use PurePulse's name and provided marketing materials solely in connection with the Affiliate Program. You may not create your own PurePulse-branded materials without prior written approval. All PurePulse trademarks, logos, and brand elements remain the exclusive property of PurePulse.

──────────────────────────────────────────────

11. LIMITATION OF LIABILITY

TO THE FULLEST EXTENT PERMITTED BY LAW, PUREPULSE'S TOTAL LIABILITY TO AFFILIATE SHALL NOT EXCEED THE TOTAL COMMISSIONS PAID TO AFFILIATE IN THE THREE (3) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

──────────────────────────────────────────────

12. GOVERNING LAW; DISPUTE RESOLUTION

This Agreement is governed by applicable U.S. law. Any disputes shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration.

──────────────────────────────────────────────

13. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties regarding the Affiliate Program and supersedes all prior understandings. No modification is effective unless made in accordance with Section 9.

──────────────────────────────────────────────

By signing below, you confirm that:
  • You are at least 18 years of age
  • You have read, understood, and agree to all terms of this Agreement
  • The information you provided in your application is accurate and complete
  • Your electronic signature has the same legal effect as a handwritten signature

PurePulse Web Services · contact@purepulse.one · purepulse.one`
