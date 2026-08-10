import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateContractContent } from '@/lib/contract-template'
import { PLAN_PRICES, PLAN_LABELS, type Plan } from '@/lib/types'

const VALID_PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; company?: string; plan?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, email, company, plan, description } = body

  if (!name?.trim() || !email?.trim() || !plan) {
    return NextResponse.json({ error: 'name, email, and plan are required.' }, { status: 400 })
  }

  if (!VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }

  const validPlan = plan as Plan
  const supabase = adminSupabase()

  // Upsert client by email
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id, name, email, company, phone, hourly_rate')
    .eq('email', email.trim().toLowerCase())
    .limit(1)

  let clientId: string
  let clientRecord: { id: string; name: string; email: string; company?: string; phone?: string; hourly_rate: number }

  if (existingClients && existingClients.length > 0) {
    clientRecord = existingClients[0]
    clientId = clientRecord.id
    // Update plan and company if changed
    await supabase
      .from('clients')
      .update({
        plan: validPlan,
        ...(company?.trim() ? { company: company.trim() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        plan: validPlan,
        hourly_rate: 85,
        status: 'prospect',
      })
      .select('id, name, email, company, phone, hourly_rate')
      .single()

    if (clientError || !newClient) {
      console.error('[pricing/start] client insert error:', clientError)
      return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 })
    }

    clientRecord = newClient
    clientId = newClient.id
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
    clientRecord.hourly_rate ?? 85,
    startDate
  )

  // Create contract with signing token
  const token = crypto.randomUUID()
  const { error: contractError } = await supabase
    .from('contracts')
    .insert({
      client_id: clientId,
      title: `${PLAN_LABELS[validPlan]} Web Services Agreement`,
      status: 'sent',
      plan: validPlan,
      monthly_rate: PLAN_PRICES[validPlan],
      hourly_rate: clientRecord.hourly_rate ?? 85,
      start_date: startDate,
      content: contractContent,
      signature_token: token,
    })

  if (contractError) {
    console.error('[pricing/start] contract insert error:', contractError)
    return NextResponse.json({ error: 'Failed to create contract.' }, { status: 500 })
  }

  // Send sign link email
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.purepulse.one'
  const signingUrl = `${appUrl}/sign/${token}`
  const firstName = name.trim().split(' ')[0]

  const { error: emailError } = await resend.emails.send({
    from: 'PurePulse <contracts@login.purepulse.one>',
    to: email.trim(),
    subject: `Your PurePulse contract is ready to sign`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:32px;">
          <span style="font-size:1.25rem;font-weight:700;letter-spacing:-0.02em;">PurePulse</span>
        </div>
        <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Your contract is ready</h2>
        <p style="color:#555;line-height:1.6;margin:0 0 8px;">Hi ${firstName},</p>
        <p style="color:#555;line-height:1.6;margin:0 0 8px;">
          Thanks for choosing PurePulse! Your <strong>${PLAN_LABELS[validPlan]} Plan</strong> Web Services Agreement
          is ready for your review and signature.
        </p>
        <p style="color:#555;line-height:1.6;margin:0 0 24px;">
          Once you sign, you&apos;ll be taken to checkout to complete your $${150 + PLAN_PRICES[validPlan]} payment
          ($150 deposit + first month of $${PLAN_PRICES[validPlan]}).
        </p>
        <a href="${signingUrl}"
           style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9375rem;">
          Review &amp; Sign Contract →
        </a>
        <p style="color:#999;font-size:0.8125rem;margin:32px 0 0;line-height:1.6;">
          This link is unique to you — do not share it. If you have any questions, reply to this email or
          contact us at <a href="mailto:contact@purepulse.one" style="color:#555;">contact@purepulse.one</a>.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
        <p style="color:#bbb;font-size:0.75rem;margin:0;">PurePulse · Web Design &amp; Maintenance · purepulse.one</p>
      </div>
    `,
  })

  if (emailError) {
    // Contract exists, don't fail the whole flow — client can still use the link
    console.error('[pricing/start] email send error:', emailError)
  }

  return NextResponse.json({ token })
}
