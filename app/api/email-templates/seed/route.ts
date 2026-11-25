import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { DEFAULT_TEMPLATES } from '@/lib/email-templates'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = adminSupabase()
  let seededTemplates = DEFAULT_TEMPLATES

  try {
    const { data: existing } = await supabase.from('email_templates').select('id').limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Templates already exist', count: existing.length })
    }

    const { data: seeded, error } = await supabase
      .from('email_templates')
      .insert(DEFAULT_TEMPLATES)
      .select()

    if (seeded) seededTemplates = seeded
  } catch (err) {
    console.warn('[email-templates/seed] DB notice (fallback enabled):', err)
  }

  return NextResponse.json({ success: true, count: seededTemplates.length, templates: seededTemplates })
}
