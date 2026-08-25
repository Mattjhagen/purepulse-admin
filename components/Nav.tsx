'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X as CloseIcon, ArrowUp, ArrowDown, GripVertical, RotateCcw, Edit2, Check,
  Clock, Users, Ticket, FileText, FileCheck, Receipt, LayoutDashboard, Settings,
  LogOut, ChevronRight, Inbox, Mail, MessageCircle, Sparkles, CalendarDays,
  Share2, UsersRound, Gift, Megaphone, ShoppingBag, Video, Workflow, ServerCog, ShieldCheck
} from 'lucide-react'
import { signOut, isSuperuser } from '@/lib/auth'

const DEFAULT_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Interviews', href: '/interviews', icon: Video },
  { label: 'Velour E-Com', href: '/velour', icon: ShoppingBag },
  { label: 'Inbox', href: '/inbox', icon: Mail },
  { label: 'Leads', href: '/leads', icon: Inbox },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Build Projects', href: '/projects', icon: Workflow },
  { label: 'Server Handoff', href: '/handoff', icon: ServerCog },
  { label: 'TTY Command Center', href: 'https://tty-purepulse.relayapp.pro', icon: ServerCog, external: true },
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState(DEFAULT_NAV)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const pathname = usePathname()
  const router = useRouter()
  const isSuper = isSuperuser(email)

  useEffect(() => {
    const handleOpen = () => setDrawerOpen(true)
    window.addEventListener('open-nav-drawer', handleOpen)
    return () => window.removeEventListener('open-nav-drawer', handleOpen)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('purepulse_nav_order')
      if (saved) {
        const savedHrefs: string[] = JSON.parse(saved)
        const itemMap = new Map(DEFAULT_NAV.map(item => [item.href, item]))
        const reordered = savedHrefs.map(href => itemMap.get(href)).filter(Boolean) as typeof DEFAULT_NAV
        DEFAULT_NAV.forEach(item => {
          if (!reordered.some(r => r.href === item.href)) reordered.push(item)
        })
        setItems(reordered)
      }
    } catch (e) {
      console.warn('Failed loading custom nav order:', e)
    }
  }, [])

  const saveOrder = (newItems: typeof DEFAULT_NAV) => {
    setItems(newItems)
    try {
      localStorage.setItem('purepulse_nav_order', JSON.stringify(newItems.map(i => i.href)))
    } catch {}
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    const updated = [...items]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    saveOrder(updated)
  }

  const resetOrder = () => {
    setItems(DEFAULT_NAV)
    try {
      localStorage.removeItem('purepulse_nav_order')
    } catch {}
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const updated = [...items]
    const [moved] = updated.splice(draggedIndex, 1)
    updated.splice(index, 0, moved)
    setDraggedIndex(index)
    saveOrder(updated)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const renderNavList = (onItemClick?: () => void) => (
    <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingRight: '4px' }} className="nav-scroll-area">
      {items.map(({ label, href, icon: Icon, external }, index) => {
        const active = !external && (pathname === href || (href !== '/dashboard' && pathname.startsWith(href)))
        return (
          <div
            key={href}
            draggable={isEditing}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={() => setDraggedIndex(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isEditing ? '0.25rem 0.5rem' : 0,
              borderRadius: '6px',
              background: isEditing ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: isEditing ? '1px dashed rgba(255,255,255,0.15)' : 'none',
              cursor: isEditing ? 'grab' : 'default',
              opacity: draggedIndex === index ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              {isEditing && (
                <GripVertical size={14} color="#6B7280" style={{ flexShrink: 0, cursor: 'grab' }} />
              )}
              <Link
                href={href}
                onClick={onItemClick}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.55rem 0.625rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: active ? 700 : 400,
                  color: active ? '#fff' : 'var(--text-muted)',
                  background: active ? 'rgba(123,47,255,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(123,47,255,0.3)' : '1px solid transparent',
                  textDecoration: 'none',
                  flex: 1,
                }}
              >
                <Icon size={16} color={active ? '#A066FF' : undefined} strokeWidth={active ? 2.5 : 1.75} />
                {label}
              </Link>
            </div>

            {isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: index === 0 ? '#4B5563' : '#9CA3AF',
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                  }}
                  title="Move Up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: index === items.length - 1 ? '#4B5563' : '#9CA3AF',
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                  title="Move Down"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        style={{
          width: '220px',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.875rem',
          zIndex: 30,
        }}
        className="desktop-nav"
      >
        <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)' }}>PurePulse</span>
            <span style={{ fontSize: '0.625rem', color: '#7B2FFF', fontWeight: 800, marginLeft: 6, textTransform: 'uppercase' }}>ADMIN</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={{
              background: isEditing ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)',
              border: isEditing ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.12)',
              color: isEditing ? '#10B981' : '#9CA3AF',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
            title="Rearrange navigation items"
          >
            {isEditing ? <><Check size={11} /> Done</> : <><Edit2 size={11} /> Rearrange</>}
          </button>
        </div>

        {isEditing && (
          <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '0.6875rem', color: '#A066FF', fontWeight: 700 }}>Drag or use ▲▼ to reorder</span>
            <button
              type="button"
              onClick={resetOrder}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
              title="Reset default order"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        )}

        {renderNavList()}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginTop: '0.75rem' }}>
          {email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={email}>
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

      {/* Mobile Slideout Menu Drawer */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          />

          <aside
            style={{
              position: 'relative',
              width: '300px',
              maxWidth: '88vw',
              height: '100%',
              background: '#0d0d0d',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.25rem 1rem',
              zIndex: 101,
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>PurePulse</span>
                <span style={{ fontSize: '0.625rem', color: '#7B2FFF', fontWeight: 800, marginLeft: 6, textTransform: 'uppercase' }}>Menu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: isEditing ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)',
                    border: isEditing ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.12)',
                    color: isEditing ? '#10B981' : '#9CA3AF',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {isEditing ? <><Check size={12} /> Done</> : <><Edit2 size={12} /> Rearrange</>}
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#9CA3AF', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  aria-label="Close menu"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </div>

            {isEditing && (
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <span style={{ fontSize: '0.6875rem', color: '#A066FF', fontWeight: 700 }}>Drag or use ▲▼ to reorder</span>
                <button
                  type="button"
                  onClick={resetOrder}
                  style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>
            )}

            {renderNavList(() => !isEditing && setDrawerOpen(false))}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginTop: '0.75rem' }}>
              {email && <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '0 0 8px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>}
              <button
                onClick={() => { setDrawerOpen(false); handleSignOut() }}
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', color: '#F87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom bar with Menu toggle button */}
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
        {items.slice(0, 3).map(({ label, href, icon: Icon }) => {
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
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.625rem',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            color: drawerOpen ? '#A066FF' : 'var(--text)',
            padding: '0.375rem 0.5rem',
            cursor: 'pointer',
          }}
        >
          <Menu size={18} strokeWidth={2.2} />
          All Menu
        </button>

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
        @media (min-width: 1025px) { .mobile-nav { display: none !important; } }
        @media (max-width: 1024px) { .desktop-nav { display: none !important; } }
      `}</style>
    </>
  )
}
