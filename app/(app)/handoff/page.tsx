import { listHandoffProjects, type HandoffProjectRow } from '@/lib/handoff-admin-data'
import HandoffClient from './handoff-client'

export const dynamic = 'force-dynamic'

export default async function HandoffPage() {
  const projects: HandoffProjectRow[] = await listHandoffProjects()
  return <HandoffClient initialProjects={projects} />
}
