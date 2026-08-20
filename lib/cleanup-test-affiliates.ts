import { adminSupabase } from '@/lib/supabase'

export const TEST_EMAILS_TO_REMOVE = [
  'admin@p3lending.space',
  'purepulseone@gmail.com',
  'pounce-woolens63@icloud.com',
  'pacmacmobile@gmail.com',
  'testing@purepulse.one',
  'demo@purepulse.one',
  'test@purepulse.one',
  'mattjhagen@ymail.com',
  'matty@purepulse.one',
  'referrals@purepulse.one',
  'matty@purpulse.one',
]

// Primary admin emails that should NOT be deleted from auth.users (to preserve admin login)
export const PRESERVE_AUTH_EMAILS = new Set([
  'mattjhagen@ymail.com',
  'matty@purepulse.one',
])

export async function cleanupTestAffiliates() {
  const supabase = adminSupabase()
  const results: { email: string; affiliatesDeleted: number; referralsDeleted: number; interviewsDeleted: number }[] = []

  for (const email of TEST_EMAILS_TO_REMOVE) {
    const emailLower = email.toLowerCase().trim()

    // 1. Delete from affiliates & related tables
    const { data: affs } = await supabase
      .from('affiliates')
      .select('id, auth_user_id')
      .ilike('email', emailLower)

    let affCount = 0
    if (affs && affs.length > 0) {
      for (const a of affs) {
        await supabase.from('affiliate_clicks').delete().eq('affiliate_id', a.id)
        await supabase.from('affiliate_commissions').delete().eq('affiliate_id', a.id)
        await supabase.from('affiliate_referrals').delete().eq('affiliate_id', a.id)
        await supabase.from('affiliates').delete().eq('id', a.id)
        affCount++

        if (a.auth_user_id && !PRESERVE_AUTH_EMAILS.has(emailLower)) {
          try {
            await supabase.auth.admin.deleteUser(a.auth_user_id)
          } catch {
            // ignore
          }
        }
      }
    }

    // 2. Delete from referrals & related tables
    const { data: refs } = await supabase
      .from('referrals')
      .select('id')
      .ilike('email', emailLower)

    let refCount = 0
    if (refs && refs.length > 0) {
      for (const r of refs) {
        await supabase.from('referral_clicks').delete().eq('referral_id', r.id)
        await supabase.from('referrals').delete().eq('id', r.id)
        refCount++
      }
    }

    // 3. Delete from interviews
    const { data: ivs } = await supabase
      .from('interviews')
      .select('id')
      .ilike('candidate_email', emailLower)

    let ivCount = 0
    if (ivs && ivs.length > 0) {
      for (const iv of ivs) {
        await supabase.from('interviews').delete().eq('id', iv.id)
        ivCount++
      }
    }

    results.push({
      email,
      affiliatesDeleted: affCount,
      referralsDeleted: refCount,
      interviewsDeleted: ivCount,
    })
  }

  return results
}
