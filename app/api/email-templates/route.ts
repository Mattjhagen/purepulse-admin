import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export const DEFAULT_TEMPLATES = [
  {
    name: '🚀 Project Kickoff & Onboarding',
    subject_prefix: 'Welcome & Next Steps: ',
    body: `Hi {{name}},

Welcome to PurePulse! We're excited to partner with you and kick off your digital build.

Here is what to expect over the next few days:
1. Asset & Requirement Review: We'll audit your branding assets, copy, and existing domain DNS.
2. Staging Environment: We'll deploy your initial staging URL so you can preview progress live.
3. Portal Access: You can track deliverables, submit requests, and access files at https://login.purepulse.one/portal.

If you have any questions or additional files to share, feel free to reply directly to this thread.

Best regards,
Matty Hagen
PurePulse Technology Solutions`,
  },
  {
    name: '⚡ Monthly Deliverables & Maintenance Completed',
    subject_prefix: 'Completed: ',
    body: `Hi {{name}},

Your scheduled monthly deliverables and website maintenance updates have been successfully completed and deployed to production.

Key items addressed:
• Core software & dependency updates applied
• Performance & asset caching optimized
• Automated backup snapshot verified
• Security & SSL certificate status checked

You can review your active plan and past reports anytime in your client portal. Let us know if you need anything else!

Best,
Matty Hagen
PurePulse Technology Solutions`,
  },
  {
    name: '💡 New Feature & Scope Proposal',
    subject_prefix: 'Proposal: ',
    body: `Hi {{name}},

Following up on our recent conversation, we've outlined the scope and technical architecture for your requested feature addition.

Summary of Proposed Scope:
• Custom module integration & database schema setup
• Responsive frontend layout styled to match your existing design system
• Edge API endpoint configuration and automated testing
• Estimated turnaround: 5–7 business days

Let me know if this aligns with your timeline and we'll get it scheduled into our next sprint!

Best regards,
Matty Hagen
PurePulse`,
  },
  {
    name: '💳 Payment Confirmation & Receipt',
    subject_prefix: 'Receipt & Thank You: ',
    body: `Hi {{name}},

Thank you for your payment! We've received your transaction and credited it to your account.

Your services, active hosting, and maintenance schedule continue without interruption. You can download itemized PDF receipts and manage payment methods anytime at:
https://login.purepulse.one/portal

Thank you for your ongoing partnership!

Best,
Matty Hagen
PurePulse Billing`,
  },
  {
    name: '🎁 Client Referral Reward Invitation',
    subject_prefix: 'Earn 1 Month Free: ',
    body: `Hi {{name}},

Quick note to thank you for being a valued client of PurePulse!

Did you know about our client referral program? For every business owner or colleague you refer who signs up for a website build or monthly management plan:
🎁 You receive 1 Month of Free Service credited directly to your plan!

Simply have them mention your name when reaching out at purepulse.one or connect us directly via email.

Best regards,
Matty Hagen
PurePulse`,
  },
  {
    name: '🎫 Support Ticket Resolved',
    subject_prefix: 'Resolved: ',
    body: `Hi {{name}},

Good news — the item reported in your support ticket has been resolved and verified live on your site.

Please take a look when you have a moment and confirm everything is working as expected on your end.

If everything looks good, no further action is needed. If you notice anything else, simply reply to this email!

Best,
Matty Hagen
PurePulse Support`,
  },
  {
    name: '⚠️ Friendly Invoice Reminder',
    subject_prefix: 'Friendly Reminder: ',
    body: `Hi {{name}},

Hope you're having a great week! This is a friendly reminder that your monthly invoice is pending settlement.

To ensure uninterrupted hosting and web maintenance, please take a moment to review and complete payment:
https://login.purepulse.one/portal

If you have any questions or need to update your payment method on file, let us know and we'll be happy to assist.

Best regards,
Matty Hagen
PurePulse`,
  },
]

export async function GET() {
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If no templates exist in database yet, auto-seed the default templates
  if (!data || data.length === 0) {
    const { data: seeded, error: seedErr } = await supabase
      .from('email_templates')
      .insert(DEFAULT_TEMPLATES)
      .select()

    if (!seedErr && seeded) {
      return NextResponse.json(seeded)
    }
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { name, subject_prefix, body } = await req.json()
  if (!name?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'name and body are required' }, { status: 400 })
  }
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ name: name.trim(), subject_prefix: subject_prefix ?? 'Re: ', body: body.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
