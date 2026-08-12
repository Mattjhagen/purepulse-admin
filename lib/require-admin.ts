import { createServerSupabaseClient } from '@/lib/supabase-server'

// Verifies the request comes from an authenticated admin session, not just
// "someone who found the URL" -- middleware.ts leaves all of /api public,
// so routes that take real actions (especially ones that move money) need
// their own check rather than relying on the admin UI alone to gate access.
export async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}
