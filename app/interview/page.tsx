import { Suspense } from 'react'
import InterviewClient from './InterviewClient'

export const metadata = {
  title: 'PurePulse | Virtual Video Interview',
  description: 'Complete your automated asynchronous video interview for the PurePulse Affiliate Sales Partner role.',
}

export default function InterviewPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#07070D', color: '#F4F4FF' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#888' }}>
          Loading virtual interview...
        </div>
      }>
        <InterviewClient />
      </Suspense>
    </main>
  )
}
