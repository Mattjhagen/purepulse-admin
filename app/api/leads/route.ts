import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePortalLink } from '@/lib/portal-auth-link'
import { sendPortalInviteEmail } from '@/lib/portal-invite-email'

const ALLOWED_ORIGINS = ['https://purepulse.one', 'https://login.purepulse.one', 'http://localhost:3000']

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: cors(origin) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')

  try {
    const { name, email, project, plan, referral_code } = await request.json()

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400, headers: cors(origin) })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Only attribute to a referral code that actually exists and is active —
    // a bad/stale ref param shouldn't block the lead or attribute to nothing.
    let referralCode: string | null = null
    if (referral_code?.trim()) {
      const { data: referral } = await supabase
        .from('referrals')
        .select('code')
        .eq('code', referral_code.trim().toUpperCase())
        .eq('active', true)
        .maybeSingle()
      referralCode = referral?.code ?? null
    }

    const { error } = await supabase.from('leads').insert({
      name: name.trim(),
      email: email.trim(),
      project: project?.trim() || null,
      plan: plan || null,
      referral_code: referralCode,
    })

    if (error) throw error

    // Send a portal invite so the customer can access the client portal.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
    const link = await generatePortalLink(supabase, email.trim(), { appUrl })
    if (link?.isNewInvite) {
      await sendPortalInviteEmail({ email: email.trim(), name: name.trim(), url: link.url })
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: cors(origin) })
  } catch {
    return NextResponse.json({ error: 'Failed to save your request.' }, { status: 500, headers: cors(origin) })
  }
}
