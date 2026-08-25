import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = adminSupabase()
    const { data, error } = await supabase
      .from('projects')
      .update({ state: 'client_review' })
      .eq('id', '6b2a8538-a410-4423-b09c-5d2ffe12c50a')
      .select()

    return NextResponse.json({ success: !error, error, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
