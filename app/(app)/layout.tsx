import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Nav from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Nav email={session.user.email} />
      <main style={{
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
  )
}
