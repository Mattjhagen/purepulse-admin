import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = ['https://purepulse.one', 'https://admin.purepulse.one', 'http://localhost:3000']

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
    const { name, email, project, plan } = await request.json()

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400, headers: cors(origin) })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from('leads').insert({
      name: name.trim(),
      email: email.trim(),
      project: project?.trim() || null,
      plan: plan || null,
    })

    if (error) throw error

    // Send Supabase invite so the customer can access the client portal.
    // If they already have an account this is a no-op (invite is ignored).
    await supabase.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: 'https://purepulseadmin.netlify.app/portal',
    })

    return NextResponse.json({ ok: true }, { status: 200, headers: cors(origin) })
  } catch {
    return NextResponse.json({ error: 'Failed to save your request.' }, { status: 500, headers: cors(origin) })
  }
}
