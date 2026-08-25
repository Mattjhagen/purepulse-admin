'use client'
import { useState, useEffect } from 'react'
import { LogOut, ShieldCheck, User, Menu } from 'lucide-react'
import { signOut, isSuperuser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function TopHeader({ initialEmail }: { initialEmail?: string }) {
  const router = useRouter()
  const [user, setUser] = useState<{
    name: string
    email: string
    role: string
    title?: string | null
  }>({
    name: initialEmail?.split('@')[0] || 'User',
    email: initialEmail || '',
    role: 'admin',
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({
            name: data.user.fullName || data.user.name || initialEmail?.split('@')[0] || 'User',
            email: data.user.email || initialEmail || '',
            role: data.user.role || 'admin',
            title: data.user.title,
          })
        }
      })
      .catch(() => {})
  }, [initialEmail])

  const isSuper = isSuperuser(user.email)

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  const roleLabel = isSuper
    ? 'Superuser'
    : user.role === 'admin'
    ? 'Administrator'
    : user.role === 'manager'
    ? 'Manager'
    : user.role === 'intern'
    ? 'Intern'
    : 'Team Member'

  const roleColor = isSuper
    ? '#A066FF'
    : user.role === 'admin'
    ? '#8B5CF6'
    : user.role === 'manager'
    ? '#3B82F6'
    : user.role === 'intern'
    ? '#F59E0B'
    : '#10B981'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.75rem 0',
        marginBottom: '1.25rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={() => window.dispatchEvent(new Event('open-nav-drawer'))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(123,47,255,0.12)',
            border: '1px solid rgba(123,47,255,0.3)',
            color: '#A066FF',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          className="top-menu-btn"
        >
          <Menu size={16} /> ☰ Menu
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `${roleColor}22`,
            border: `1px solid ${roleColor}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: roleColor,
          }}
        >
          {isSuper ? <ShieldCheck size={16} /> : <User size={16} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
              {user.name}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: roleColor,
                background: `${roleColor}18`,
                border: `1px solid ${roleColor}40`,
                padding: '1px 6px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              {roleLabel}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {user.email}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.375rem 0.75rem',
          borderRadius: 6,
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#F87171',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Log out of your account"
      >
        <LogOut size={13} strokeWidth={2} />
        Log Out
      </button>
      <style>{`
        @media (min-width: 1025px) { .top-menu-btn { display: none !important; } }
      `}</style>
    </header>
  )
}
