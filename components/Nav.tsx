'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Clock, Users, Ticket, FileText, FileCheck, Receipt, LayoutDashboard, Settings, LogOut, ChevronRight } from 'lucide-react'
import { signOut } from '@/lib/auth'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Time Clock', href: '/time-clock', icon: Clock },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Contracts', href: '/contracts', icon: FileCheck },
  { label: '1099 Docs', href: '/documents', icon: Receipt },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function Nav({ email }: { email?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Sidebar — desktop */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
        background: '#0d0d0d', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
        zIndex: 40,
      }}
        className="desktop-nav"
      >
        {/* Logo */}
        <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Portal</p>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.12s',
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {email && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '0.75rem', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem', color: 'var(--text-muted)',
              background: 'transparent', border: 'none', cursor: 'pointer', width: '100%',
              transition: 'all 0.12s',
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0d0d0d', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0.5rem 0.25rem 0.75rem', zIndex: 40,
      }}
        className="mobile-nav"
      >
        {nav.slice(0, 5).map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.625rem', fontWeight: active ? 600 : 400, textDecoration: 'none',
              color: active ? 'var(--text)' : 'var(--text-muted)', padding: '0.375rem 0.5rem',
            }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          )
        })}
        <Link href="/clients" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', textDecoration: 'none', color: 'var(--text-muted)', padding: '0.375rem 0.5rem' }}>
          <ChevronRight size={20} strokeWidth={1.75} />
          More
        </Link>
      </nav>

      <style>{`
        @media (min-width: 769px) { .mobile-nav { display: none !important; } }
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
      `}</style>
    </>
  )
}
