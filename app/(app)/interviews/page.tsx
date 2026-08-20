import { adminSupabase } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import InterviewsClientList from './InterviewsClientList'

export const dynamic = 'force-dynamic'

export default async function InterviewsPage() {
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
  const supabase = hasServiceRole ? adminSupabase() : await createServerSupabaseClient()

  let { data: interviews } = await supabase
    .from('interviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (!interviews || interviews.length === 0) {
    const fallbackClient = hasServiceRole ? await createServerSupabaseClient() : adminSupabase()
    const { data: fbData } = await fallbackClient
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false })
    if (fbData && fbData.length > 0) {
      interviews = fbData
    }
  }

  const interviewList = interviews || []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://login.purepulse.one'
  const publicInterviewUrl = `${appUrl}/interview`

  return (
    <InterviewsClientList initialInterviews={interviewList} publicInterviewUrl={publicInterviewUrl} />
  )
}

