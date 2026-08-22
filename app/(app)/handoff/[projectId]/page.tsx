import { notFound } from 'next/navigation'
import { getHandoffProjectDetail } from '@/lib/handoff-admin-data'
import ProjectDetailClient from './project-detail-client'

export const dynamic = 'force-dynamic'

export default async function HandoffProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const detail = await getHandoffProjectDetail(projectId)
  if (!detail) notFound()
  return <ProjectDetailClient detail={detail} />
}
