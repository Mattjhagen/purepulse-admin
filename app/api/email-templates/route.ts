import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { DEFAULT_TEMPLATES } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = adminSupabase()
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      return NextResponse.json(data)
    }

    if (!data || data.length === 0) {
      const { data: seeded } = await supabase
        .from('email_templates')
        .insert(DEFAULT_TEMPLATES)
        .select()

      if (seeded && seeded.length > 0) {
        return NextResponse.json(seeded)
      }
    }
  } catch (err) {
    console.warn('[email-templates/GET] DB notice (fallback enabled):', err)
  }

  return NextResponse.json(DEFAULT_TEMPLATES)
}

export async function POST(req: NextRequest) {
  const { name, subject_prefix, body } = await req.json()
  if (!name?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'name and body are required' }, { status: 400 })
  }
  const supabase = adminSupabase()
  let templateRecord: any = null
  try {
    const { data } = await supabase
      .from('email_templates')
      .insert({ name: name.trim(), subject_prefix: subject_prefix ?? 'Re: ', body: body.trim() })
      .select()
      .single()
    if (data) templateRecord = data
  } catch (err) {
    console.warn('[email-templates/POST] DB insert notice:', err)
  }

  if (!templateRecord) {
    templateRecord = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      subject_prefix: subject_prefix ?? 'Re: ',
      body: body.trim(),
      created_at: new Date().toISOString(),
    }
  }

  return NextResponse.json(templateRecord)
}
