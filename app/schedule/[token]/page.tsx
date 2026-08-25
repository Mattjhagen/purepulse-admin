import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

export default async function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ScheduleClient token={token} />
}
