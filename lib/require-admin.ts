import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppSession } from '@/lib/session'

// Verifies the request comes from an authenticated admin session or team session cookie
export async function requireAdmin(): Promise<boolean> {
  const teamSession = await getAppSession()
  if (teamSession?.email) return true

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}
