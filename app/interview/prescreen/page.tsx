import { Suspense } from 'react'
import InterviewClient from '../InterviewClient'

export const metadata = {
  title: 'PurePulse | Candidate Pre-Screen Video Interview',
  description: 'Complete your automated asynchronous pre-screen video interview for the PurePulse Affiliate Partner role.',
}

export default function PrescreenPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#07070D', color: '#F4F4FF' }}>
      <Suspense
        fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#888' }}>
            Loading pre-screen interview...
          </div>
        }
      >
        <InterviewClient />
      </Suspense>
    </main>
  )
}
