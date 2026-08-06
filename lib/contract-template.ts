import { Client, Plan, PLAN_PRICES } from './types'
import { formatMoney } from './utils'

export function generateContractContent(client: Client, plan: Plan, hourlyRate: number, startDate: string): string {
  const planPrice = PLAN_PRICES[plan]
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
  const formattedStart = new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const buyoutTotal = planPrice * 12

  return `PUREPULSE.ONE / WEBSITE SERVICES AGREEMENT
Effective Date: ${today}
Website Work Start Date: ${formattedStart}

SERVICE PROVIDER:
PurePulse
Matthew Hagen, CEO
Email: contact@purepulse.one
Website: purepulse.one

CLIENT:
${client.name}${client.company ? `\n${client.company}` : ''}
Email: ${client.email}${client.phone ? `\nPhone: ${client.phone}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

01 Scope of Services and Remote Arrangement

Beginning ${formattedStart}, Service Provider will perform authorized website work remotely at ${formatMoney(hourlyRate)} per hour. Routine communication will occur by email or telephone. Client will give at least forty-eight (48) business hours' advance notice for any requested in-person meeting. Service Provider may accept, decline, or propose an alternative time for a requested meeting.

New work must be authorized in writing before it begins. Client will pay invoices within thirty (30) calendar days of receipt. Invoices unpaid after thirty (30) days accrue a 1.5% monthly late fee.

02 Monthly Plan — ${planLabel} (${formatMoney(planPrice)}/month)

Client has selected the ${planLabel} Website-Service Plan for a twelve (12) month term beginning on the Website Work Start Date listed above. The plan covers only the services separately described in writing and does not include third-party charges. The plan fee of ${formatMoney(planPrice)} per month is due on the 1st of each month.

A non-refundable deposit of $150.00 is required to initiate Services. Service Provider is not required to begin or resume work until the initial deposit and any outstanding balance is paid in full, unless the parties sign a separate written payment arrangement.

Work exceeding the plan's included scope is billed at ${formatMoney(hourlyRate)}/hour. Work performed in excess of eight (8) hours on a single calendar day is billed at ${formatMoney(Math.round(hourlyRate * 1.5 * 100) / 100)}/hour (1.5× Standard Rate).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICE CONTINUITY AND OWNERSHIP OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

03 Client-Paid Third-Party Services

Client is responsible for the cost of all third-party services required for the Website, including hosting, domain registration, Cloudflare, databases, email, paid software, AI tools, licenses, and similar services. These costs are separate from labor fees and the monthly plan unless expressly included in a signed writing. Client will reimburse any approved third-party charge paid by Service Provider on Client's behalf within ten (10) days of invoice.

04 Project Buyout and Ownership Transfer

Instead of the monthly website-service plan, Client may buy out the Client-specific Website project for ${formatMoney(planPrice)} per month for twelve (12) months, calculated from the Website Work Start Date, for a total project buyout of ${formatMoney(buyoutTotal)} less any mutually agreed written credits. Client may pay the buyout in one payment or installments under a separate signed payment schedule. The buyout is separate from any unpaid balance, approved expenses, and third-party charges.

05 Ownership, Release, and Transition

Service Provider retains ownership and control of the Website source code, design files, repositories, deployment configuration, and related project files until Client has paid every amount due, including any outstanding balance and, if selected, the full project buyout. After full payment, Service Provider will transfer the Client-specific files and GitHub repository to an account chosen by Client within ten (10) business days and will reasonably assist with transferring Client-owned domain and hosting access.

Service Provider retains pre-existing tools, templates, reusable components, general know-how, and third-party materials subject to their licenses.

06 Intellectual Property

PurePulse warrants that the deliverables will be original work and will not knowingly infringe any third-party intellectual property rights. Client represents that all content, logos, images, and materials provided by Client for use on the Website are owned by Client or licensed for the intended use.

07 Confidentiality

Each party agrees to keep the other party's Confidential Information (including pricing, business data, and technical information) private and not to disclose it to third parties without prior written consent. This obligation survives termination of this Agreement.

08 Warranties and Limitation of Liability

Service Provider warrants that Services will be performed in a professional and workmanlike manner consistent with industry standards. IN NO EVENT SHALL PUREPULSE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS OR DATA, ARISING OUT OF OR RELATED TO THIS AGREEMENT. Service Provider's total liability shall not exceed the fees paid by Client in the three (3) months immediately preceding the claim.

09 Termination

Either party may end future services with thirty (30) days' written notice. Ending future services does not cancel any outstanding balance, approved third-party charges, or a signed buyout/payment schedule. Until every required amount is paid, Client has only a limited right to use the live Website during an active service term and may not require transfer of repositories, source files, or administrative control.

Upon termination, any outstanding invoices become immediately due and payable.

10 Dispute Resolution and Governing Law

Any dispute arising out of or relating to this Agreement shall first be addressed through good-faith negotiation. If unresolved, disputes shall be submitted to binding arbitration in Omaha, Nebraska, under the rules of the American Arbitration Association. This Agreement is governed by the laws of the State of Nebraska.

11 Entire Agreement; Written Modification Required

This Agreement is the parties' complete agreement concerning its subject matter and replaces all prior discussions on that subject. Any change must be in writing and signed by both parties. This Agreement becomes effective only when signed by both parties; verbal statements, continued use, or payment alone do not change ownership, payment, or transfer rights.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICE ELECTION AND ACKNOWLEDGMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Service / Election                                  Initial
  ─────────────────────────────────────────────────   ───────
  [ ] ${formatMoney(planPrice)}/month Website-Service Plan
      for 12 months from Website Work Start Date       _______

  [ ] Early project buyout at ${formatMoney(planPrice)}/month
      for 12 months, less any written credits
      Total buyout: ${formatMoney(buyoutTotal)}         _______

  Hourly rate for work beyond plan scope:
      ${formatMoney(hourlyRate)}/hour                   _______

  Client acknowledges third-party service costs
      are Client's responsibility (Section 03)          _______

  Attached exhibits reviewed and incorporated
      into this Agreement                               _______

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIRMATION AND ACCEPTANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By signing below, each party confirms that they have read, understood, and agree to this Agreement.

SERVICE PROVIDER — PUREPULSE

Signature: _____________________________    Date: _______________

Matthew Hagen, CEO
contact@purepulse.one


CLIENT — ${client.name.toUpperCase()}

Signature: _____________________________    Date: _______________

Printed Name: __________________________

Title: _________________________________
${client.company ? `\nCompany: ${client.company}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED ATTACHMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  EXHIBIT A — SCOPE OF WORK
  [Description of website deliverables, pages, and features included in this engagement.]

  EXHIBIT B — PAYMENT RECORDS
  [Bank statements, deposit records, and receipts as applicable.]

  EXHIBIT C — EXPENSE RECORDS
  [Invoices, receipts, and subscription records for approved third-party charges.]

  PAYMENT ARRANGEMENT (if applicable)
  [Due dates, installment amounts, and payment method for any agreed installment schedule.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUREPULSE.ONE / WEBSITE SERVICES AGREEMENT | Nebraska Governing Law | Arbitration Venue: Omaha, NE`
}
