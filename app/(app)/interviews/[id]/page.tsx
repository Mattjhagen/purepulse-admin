import { adminSupabase } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ScorecardClient from './ScorecardClient'

export const dynamic = 'force-dynamic'

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
  const supabase = hasServiceRole ? adminSupabase() : await createServerSupabaseClient()

  let { data: interview, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !interview) {
    // If not found with current client, try the alternative
    const fallbackClient = hasServiceRole ? await createServerSupabaseClient() : adminSupabase()
    const { data: fbInterview } = await fallbackClient
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single()
    interview = fbInterview
  }

  if (!interview) {
    notFound()
  }

  return <ScorecardClient interview={interview} />
}

