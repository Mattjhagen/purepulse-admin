'use client'

import Link from 'next/link'
import { isSuperuser } from '@/lib/auth'

export default function OwnerPortalSwitcher({ email }: { email?: string | null }) {
  if (!isSuperuser(email)) return null

  return (
    <nav aria-label="Owner portal switcher" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#A066FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Owner views</span>
      <Link href="/dashboard" style={linkStyle}>Admin</Link>
      <Link href="/portal" style={linkStyle}>Client</Link>
      <Link href="/affiliates/dashboard" style={linkStyle}>Affiliate</Link>
    </nav>
  )
}

const linkStyle = {
  color: '#C4A2FF', border: '1px solid rgba(160,102,255,0.35)', borderRadius: 999,
  padding: '4px 9px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none',
} as const
