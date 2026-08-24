import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppSession } from '@/lib/session'
import Nav from '@/components/Nav'
import { PwaRegister } from '@/components/pwa-register'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const teamSession = await getAppSession()

  let userEmail = teamSession?.email

  if (!userEmail) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      userEmail = session?.user?.email
    } catch {}
  }

  if (!userEmail) {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', flexDirection: 'column' }}>
      <PwaRegister />
      <div style={{ display: 'flex', flex: 1 }}>
        <Nav email={userEmail} />
        <main
          style={{
            flex: 1,
            marginLeft: '220px',
            padding: '2rem 2.5rem',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
          className="app-main"
        >
          {children}
        </main>
        <style>{`
          @media (max-width: 768px) {
            .app-main { margin-left: 0 !important; padding: 1.25rem 1rem 5rem !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
