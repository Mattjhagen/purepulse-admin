import { adminSupabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ScorecardClient from './ScorecardClient'

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
