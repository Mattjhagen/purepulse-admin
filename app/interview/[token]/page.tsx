import { Suspense } from 'react'
import InterviewClient from '../InterviewClient'

export const metadata = {
  title: 'PurePulse | Virtual Video Interview',
  description: 'Complete your automated asynchronous video interview for the PurePulse Affiliate Sales Partner role.',
}

export default async function DynamicInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <main style={{ minHeight: '100vh', background: '#07070D', color: '#F4F4FF' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#888' }}>
          Loading virtual interview...
        </div>
      }>
        <InterviewClient token={token} />
      </Suspense>
    </main>
  )
}
