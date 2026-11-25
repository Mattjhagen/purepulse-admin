'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

export default function AccountSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passwords, setPasswords] = useState<Record<PasswordField, string>>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({ currentPassword: false, newPassword: false, confirmPassword: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then(async (sessionData) => {
        if (sessionData.user?.email) {
          setEmail(sessionData.user.email)
          setName((sessionData.user.fullName || sessionData.user.name || sessionData.user.email).toString())
          setLoading(false)
          return
        }
        const { data } = await supabase.auth.getUser()
        const user = data.user
        setEmail(user?.email || '')
        setName((user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || '').toString())
        setLoading(false)
      })
      .catch(async () => {
        try {
          const { data } = await supabase.auth.getUser()
          const user = data.user
          setEmail(user?.email || '')
          setName((user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || '').toString())
        } finally {
          setLoading(false)
        }
      })
  }, [supabase])

  const updatePassword = (field: PasswordField, value: string) => setPasswords((current) => ({ ...current, [field]: value }))
  const toggle = (field: PasswordField) => setVisible((current) => ({ ...current, [field]: !current[field] }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwords),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Password could not be updated.')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage({ kind: 'success', text: 'Password updated. Other sessions were signed out. Sign in again with your new password.' })
      window.setTimeout(() => router.push('/login?passwordChanged=1'), 1200)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Password could not be updated.' })
    } finally {
      setSaving(false)
    }
  }

  const field = (id: PasswordField, label: string, hint?: string) => (
    <div className="form-group" key={id}>
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} className="input" type={visible[id] ? 'text' : 'password'} value={passwords[id]} onChange={(event) => updatePassword(id, event.target.value)} autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'} required style={{ paddingRight: '3rem' }} />
        <button type="button" onClick={() => toggle(id)} aria-label={visible[id] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}>
          {visible[id] ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{hint}</p>}
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>Account Settings</h1>
        <p>Manage your PurePulse account and sign-in security.</p>
      </div>

      <div className="card-elevated" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#A066FF', background: 'rgba(123,47,255,0.14)', border: '1px solid rgba(123,47,255,0.3)' }}><UserCircle size={22} /></div>
          <div><h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 800 }}>{name || 'Authenticated user'}</h2><p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0', fontSize: '0.8125rem' }}>{email}</p></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A066FF', fontSize: '0.8125rem', fontWeight: 700 }}><KeyRound size={15} /> Password security</div>
      </div>

      <form onSubmit={submit} className="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 800 }}>Change password</h2><p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>Your current password is verified before the new credential is saved.</p></div>
        {message && <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 0.875rem', borderRadius: 8, color: message.kind === 'success' ? '#34D399' : '#F87171', background: message.kind === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.kind === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, fontSize: '0.8125rem' }}>{message.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<span>{message.text}</span></div>}
        {field('currentPassword', 'Current password')}
        {field('newPassword', 'New password', 'Use at least 8 characters. A long, unique passphrase is recommended.')}
        {field('confirmPassword', 'Confirm new password')}
        <div style={{ paddingTop: '0.25rem' }}><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Update password'}</button></div>
      </form>
    </div>
  )
}
