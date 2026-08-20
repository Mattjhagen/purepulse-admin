import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.warn('[affiliates/logout] signOut notice:', err)
  }
  return NextResponse.redirect(new URL('/affiliates/login', process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'))
}
