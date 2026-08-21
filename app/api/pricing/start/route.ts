import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getResend } from '@/lib/resend'
import { generateContractContent } from '@/lib/contract-template'
import { PLAN_PRICES, PLAN_LABELS, type Plan } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VALID_PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']
const WEBSITE_TYPES = ['brochure', 'booking', 'store', 'portfolio', 'membership', 'custom'] as const
const CONTENT_STATUSES = ['ready', 'partial', 'needs_help'] as const
const BUILD_RATE = 25

type WebsiteType = (typeof WEBSITE_TYPES)[number]
type ContentStatus = (typeof CONTENT_STATUSES)[number]

export async function POST(req: NextRequest) {
  let body: {
    name?: string
    email?: string
    company?: string
    plan?: string
    ref_code?: string
    website_type?: WebsiteType
    business_summary?: string
    target_audience?: string
    pages?: string[]
    features?: string[]
    style_notes?: string
    example_sites?: string[]
    content_status?: ContentStatus
    desired_launch_date?: string
    spending_cap_dollars?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    name, email, company, plan, ref_code, website_type, business_summary,
    target_audience, pages, features, style_notes, example_sites,
    content_status, desired_launch_date, spending_cap_dollars,
  } = body

  if (!name?.trim() || !email?.trim() || !plan || !website_type || !business_summary?.trim() || !target_audience?.trim()) {
    return NextResponse.json({ error: 'Contact details and the website brief are required.' }, { status: 400 })
  }

  if (!VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }

  if (!WEBSITE_TYPES.includes(website_type) || !CONTENT_STATUSES.includes(content_status ?? 'needs_help')) {
    return NextResponse.json({ error: 'Invalid website brief.' }, { status: 400 })
  }

  const capDollars = Number(spending_cap_dollars)
  if (!Number.isFinite(capDollars) || capDollars < BUILD_RATE || capDollars > 25000) {
    return NextResponse.json({ error: 'Choose a spending cap between $25 and $25,000.' }, { status: 400 })
  }

  const validPlan = plan as Plan
  const supabase = adminSupabase()

  // Upsert client by email
  let clientId = `cl_${Date.now()}`
  let clientRecord = {
    id: clientId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    company: company?.trim() || undefined,
    phone: undefined as string | undefined,
    hourly_rate: BUILD_RATE,
  }

  try {
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, name, email, company, phone, hourly_rate')
      .eq('email', email.trim().toLowerCase())
      .limit(1)

    if (existingClients && existingClients.length > 0) {
      clientRecord = existingClients[0]
      clientId = clientRecord.id
      await supabase
        .from('clients')
        .update({
          plan: validPlan,
          ...(company?.trim() ? { company: company.trim() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
    } else {
      let validRefCode: string | null = null
      if (ref_code?.trim()) {
        const { data: aff } = await supabase
          .from('affiliates')
          .select('id')
          .eq('referral_code', ref_code.trim().toUpperCase())
          .eq('status', 'active')
          .single()
        if (aff) validRefCode = ref_code.trim().toUpperCase()
      }

      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          company: company?.trim() || null,
          plan: validPlan,
          hourly_rate: BUILD_RATE,
          status: 'prospect',
          referral_code: validRefCode,
        })
        .select('id, name, email, company, phone, hourly_rate')
        .single()

      if (newClient) {
        clientRecord = newClient
        clientId = newClient.id
      }
    }
  } catch (clientErr) {
    console.warn('[pricing/start] Client DB warning (fallback enabled):', clientErr)
  }

  // Save the approved intake as version 1 of the project brief.
  let briefId: string | null = null
  try {
    const { data: brief, error: briefError } = await supabase
      .from('project_briefs')
      .insert({
        client_id: clientId,
        version: 1,
        website_type,
        business_summary: business_summary.trim(),
        target_audience: target_audience.trim(),
        pages: (pages ?? []).map(value => value.trim()).filter(Boolean),
        features: (features ?? []).map(value => value.trim()).filter(Boolean),
        style_notes: style_notes?.trim() || null,
        example_sites: (example_sites ?? []).map(value => value.trim()).filter(Boolean),
        content_status: content_status ?? 'needs_help',
        desired_launch_date: desired_launch_date || null,
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (briefError) throw briefError
    briefId = brief.id
  } catch (briefErr) {
    console.warn('[pricing/start] Project brief DB warning:', briefErr)
  }

  // Generate contract content
  const startDate = new Date().toISOString().split('T')[0]
  const contractContent = generateContractContent(
    {
      id: clientId,
      name: clientRecord.name,
      email: clientRecord.email,
      company: clientRecord.company,
      phone: clientRecord.phone,
      plan: validPlan,
      hourly_rate: clientRecord.hourly_rate ?? 85,
      status: 'prospect',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    validPlan,
    BUILD_RATE,
    startDate
  )

  // Create contract with signing token
  const token = crypto.randomUUID()
  let contractId: string | null = null
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        client_id: clientId,
        title: `${PLAN_LABELS[validPlan]} Web Services Agreement`,
        status: 'sent',
        plan: validPlan,
        monthly_rate: PLAN_PRICES[validPlan],
        hourly_rate: BUILD_RATE,
        start_date: startDate,
        content: contractContent,
        signature_token: token,
      })
      .select('id')
      .single()
    if (contractError) throw contractError
    contractId = contract.id
  } catch (contractErr) {
    console.warn('[pricing/start] Contract DB warning (fallback enabled):', contractErr)
  }

  if (briefId) {
    try {
      const { data: project, error: projectError } = await supabase
        .from('website_projects')
        .insert({
          client_id: clientId,
          brief_id: briefId,
          referral_code: ref_code?.trim().toUpperCase() || null,
          name: `${company?.trim() || name.trim()} website`,
          state: 'awaiting_contract',
          hourly_rate_cents: BUILD_RATE * 100,
          spending_cap_cents: Math.round(capDollars * 100),
          contract_id: contractId,
        })
        .select('id')
        .single()
      if (projectError) throw projectError

      await supabase.from('project_audit_events').insert({
        project_id: project.id,
        actor_type: 'client',
        actor_id: email.trim().toLowerCase(),
        action: 'project_intake_submitted',
        metadata: { brief_id: briefId, spending_cap_dollars: capDollars, hourly_rate: BUILD_RATE },
      })
    } catch (projectErr) {
      console.warn('[pricing/start] Website project DB warning:', projectErr)
    }
  }

  // Send sign link email
  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const signingUrl = `${appUrl}/sign/${token}`
  const firstName = name.trim().split(' ')[0]
  let emailSent = false
  let emailWarning: string | null = null

  try {
    const delivery = await resend.emails.send({
      from: 'PurePulse <matty@purepulse.one>',
      to: email.trim(),
      subject: `Your PurePulse contract is ready to sign`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
          <div style="margin-bottom:32px;">
            <span style="font-size:1.25rem;font-weight:700;letter-spacing:-0.02em;">PurePulse</span>
          </div>
          <h2 style="font-size:1.375rem;font-weight:700;margin:0 0 12px;color:#111;">
            Hi ${firstName}, your ${PLAN_LABELS[validPlan]} contract is ready
          </h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px;">
            Thank you for choosing PurePulse! We've prepared your Web Services Agreement for the <strong>${PLAN_LABELS[validPlan]} plan</strong> ($${PLAN_PRICES[validPlan]}/mo + $150 setup deposit).
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:28px;">
            <p style="margin:0 0 8px;font-size:0.875rem;font-weight:600;color:#374151;">Plan Summary</p>
            <table style="width:100%;font-size:0.875rem;color:#555;border-collapse:collapse;">
              <tr>
                <td style="padding:4px 0;">Plan:</td>
                <td style="padding:4px 0;font-weight:600;color:#111;text-align:right;">${PLAN_LABELS[validPlan]}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Setup Deposit:</td>
                <td style="padding:4px 0;font-weight:600;color:#111;text-align:right;">$150.00 (charged today)</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Monthly Rate:</td>
                <td style="padding:4px 0;font-weight:600;color:#111;text-align:right;">$${PLAN_PRICES[validPlan]}.00/mo (billed after launch)</td>
              </tr>
            </table>
          </div>
          <a
            href="${signingUrl}"
            style="display:inline-block;background:#111;color:#fff;font-weight:700;font-size:0.9375rem;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;"
          >
            Review &amp; Sign Contract →
          </a>
          <p style="color:#9ca3af;font-size:0.8125rem;margin:24px 0 0;line-height:1.5;">
            Or copy and paste this link into your browser:<br/>
            <span style="color:#6b7280;word-break:break-all;">${signingUrl}</span>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 24px;" />
          <p style="color:#9ca3af;font-size:0.75rem;margin:0;">
            PurePulse Web Services · Questions? Reply to this email or contact support@purepulse.one
          </p>
        </div>
      `,
    })
    if (delivery.error) throw new Error(delivery.error.message)
    emailSent = true
  } catch (emailErr) {
    emailWarning = emailErr instanceof Error ? emailErr.message : 'Contract email could not be delivered.'
    console.error('[pricing/start] Contract email failed:', emailWarning)
  }

  return NextResponse.json({
    token,
    sign_url: `/sign/${token}`,
    email_sent: emailSent,
    email_warning: emailWarning,
  })
}
