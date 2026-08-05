import { Client, Plan, PLAN_PRICES } from './types'
import { formatMoney } from './utils'

export function generateContractContent(client: Client, plan: Plan, hourlyRate: number, startDate: string): string {
  const planPrice = PLAN_PRICES[plan]
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
  const formattedStart = new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return `WEB SERVICES AGREEMENT
Version 2.1 — ${today}

This Web Services Agreement ("Agreement") is entered into as of ${formattedStart}, between:

SERVICE PROVIDER:
PurePulse
Email: contact@purepulse.one
Website: purepulse.one

CLIENT:
${client.name}
${client.company ? `Company: ${client.company}\n` : ''}Email: ${client.email}
${client.phone ? `Phone: ${client.phone}` : ''}

───────────────────────────────────────

1. SERVICES

PurePulse agrees to provide web design, development, and maintenance services ("Services") to Client as described in each applicable Statement of Work or as otherwise agreed in writing.

2. SELECTED PLAN

Client has selected the ${planLabel} Plan:
• Monthly Fee: ${formatMoney(planPrice)}/month
• Included: See plan details at purepulse.one/#pricing
• Effective: ${formattedStart}

3. PAYMENT TERMS

3.1 Monthly subscription fee of ${formatMoney(planPrice)} is due on the 1st of each month.
3.2 A non-refundable deposit of $150.00 is required to initiate Services.
3.3 Extra work beyond the scope of the selected plan is billed at ${formatMoney(hourlyRate)}/hour.
3.4 Invoices unpaid after 30 days accrue a 1.5% monthly late fee.

4. TERM AND RENEWAL

4.1 This Agreement begins on ${formattedStart} and continues for a minimum of twelve (12) months.
4.2 After the initial term, this Agreement automatically renews on a month-to-month basis.
4.3 Either party may terminate the month-to-month renewal with 30 days' written notice.

5. OVERTIME AND ADDITIONAL HOURS

Work exceeding the plan's included scope is billed at ${formatMoney(hourlyRate)}/hour ("Standard Rate").
Work performed in excess of 8 hours on a single day is billed at ${formatMoney(hourlyRate * 1.5)}/hour (1.5× Standard Rate).

6. INTELLECTUAL PROPERTY

6.1 Upon receipt of all amounts due, Client owns the final deliverables specific to Client's project.
6.2 PurePulse retains ownership of all underlying templates, frameworks, tools, and reusable components.

7. CONFIDENTIALITY

Each party agrees to keep the other party's confidential information private and not to disclose it to third parties without prior written consent.

8. WARRANTIES AND LIMITATIONS

8.1 PurePulse warrants that Services will be performed in a professional and workmanlike manner.
8.2 IN NO EVENT SHALL PUREPULSE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
8.3 PurePulse's total liability shall not exceed the fees paid by Client in the three (3) months preceding the claim.

9. DISPUTE RESOLUTION

Any disputes arising under this Agreement shall be resolved by binding arbitration in Omaha, Nebraska, under the rules of the American Arbitration Association.

10. GOVERNING LAW

This Agreement is governed by the laws of the State of Nebraska.

11. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions and understandings.

───────────────────────────────────────

SIGNATURES

By signing below, the parties agree to the terms of this Agreement.

SERVICE PROVIDER — PurePulse

Signature: ______________________________

Name: Matthew Hagen

Date: ______________________________


CLIENT — ${client.name}

Signature: ______________________________

Name: ______________________________

Date: ______________________________


${client.company ? `Company: ${client.company}\n\n` : ''}───────────────────────────────────────
PurePulse Web Services Agreement v2.1 | purepulse.one | contact@purepulse.one
Nebraska Governing Law | Arbitration Venue: Omaha, NE`
}
