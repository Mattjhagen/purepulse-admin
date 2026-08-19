import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ScorecardClient from './ScorecardClient'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export const dynamic = 'force-dynamic'

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: interview, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !interview) {
    notFound()
  }

  return <ScorecardClient interview={interview} />
}
