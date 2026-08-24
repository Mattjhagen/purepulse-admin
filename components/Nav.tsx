'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Clock, Users, Ticket, FileText, FileCheck, Receipt, LayoutDashboard, Settings,
  LogOut, ChevronRight, Inbox, Mail, MessageCircle, Sparkles, CalendarDays,
  Share2, UsersRound, Gift, Megaphone, ShoppingBag, Video, Workflow, ServerCog, ShieldCheck
} from 'lucide-react'
import { signOut, isSuperuser } from '@/lib/auth'

const handoffDashboardUrl = process.env.NEXT_PUBLIC_HANDOFF_DASHBOARD_URL || 'https://handoff.relayapp.pro'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Interviews', href: '/interviews', icon: Video },
  { label: 'Velour E-Com', href: '/velour', icon: ShoppingBag },
  { label: 'Inbox', href: '/inbox', icon: Mail },
  { label: 'Leads', href: '/leads', icon: Inbox },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Build Projects', href: '/projects', icon: Workflow },
  { label: 'Server Handoff', href: '/handoff', icon: ServerCog },
  { label: 'Handoff Dashboard', href: handoffDashboardUrl, icon: ServerCog, external: true },
  { label: 'Team', href: '/team', icon: UsersRound },
  { label: 'Campaigns', href: '/campaigns', icon: Sparkles },
  { label: 'Marketing', href: '/marketing', icon: Megaphone },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Social', href: '/social', icon: Share2 },
  { label: 'Time Clock', href: '/time-clock', icon: Clock },
  { label: 'Messages', href: '/messages', icon: MessageCircle },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Contracts', href: '/contracts', icon: FileCheck },
  { label: '1099 Docs', href: '/documents', icon: Receipt },
  { label: 'Affiliates', href: '/referrals', icon: Gift },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function Nav({ email }: { email?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isSuper = isSuperuser(email)

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '220px',
          background: '#0d0d0d',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.875rem',
          zIndex: 40,
        }}
        className="desktop-nav"
      >
        {/* Logo */}
        <div style={{ marginBottom: '1.25rem', paddingLeft: '0.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
            {isSuper && (
              <span style={{ fontSize: '0.625rem', fontWeight: 800, background: '#7B2FFF', color: '#fff', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Super
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Admin Portal
          </p>
        </div>

        {/* Scrollable Nav items */}
        <nav
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            paddingRight: '2px',
          }}
          className="nav-scroll-area"
        >
          {nav.map(({ label, href, icon: Icon, external }) => {
            const active = !external && (pathname === href || (href !== '/dashboard' && pathname.startsWith(href)))
            return (
              <Link
                key={href}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-label={external ? `${label} (opens in a new tab)` : label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.84rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.12s',
                  flexShrink: 0,
                }}
              >
                <Icon size={15} strokeWidth={active ? 2.5 : 1.75} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Always visible pinned Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '0.75rem',
            marginTop: '0.5rem',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {email && (
            <div style={{ paddingLeft: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isSuper ? (
                  <ShieldCheck size={12} color="#A066FF" />
                ) : null}
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text)',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                  title={email}
                >
                  {email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#F87171',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              cursor: 'pointer',
              width: '100%',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={14} strokeWidth={2} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#0d0d0d',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0.5rem 0.25rem 0.75rem',
          zIndex: 40,
        }}
        className="mobile-nav"
      >
        {nav.slice(0, 4).map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.625rem',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                padding: '0.375rem 0.5rem',
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.625rem',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            color: '#F87171',
            padding: '0.375rem 0.5rem',
            cursor: 'pointer',
          }}
        >
          <LogOut size={18} strokeWidth={2} />
          Log Out
        </button>
      </nav>

      <style>{`
        .nav-scroll-area::-webkit-scrollbar {
          width: 4px;
        }
        .nav-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .nav-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        @media (min-width: 769px) { .mobile-nav { display: none !important; } }
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
      `}</style>
    </>
  )
}
