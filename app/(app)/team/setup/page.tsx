'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Shield,
  Briefcase,
  Users,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'

const ROLE_INFO: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number }>; description: string; highlights: string[] }> = {
  admin: {
    label: 'Administrator',
    color: '#8B5CF6',
    icon: Shield,
    description: 'You have been assigned Administrator Privileges with full platform control.',
    highlights: [
      'Manage team members & roles',
      'Review and score video pre-screen interviews',
      'Client CRM, contracts & billing operations',
      'Affiliate payouts & financial management',
    ],
  },
  manager: {
    label: 'Manager',
    color: '#3B82F6',
    icon: Briefcase,
    description: 'You have been assigned Manager Privileges to oversee candidates and team projects.',
    highlights: [
      'Candidate review, scoring & scheduling',
      'Client project & deliverable tracking',
      'Team task coordination & time clock monitoring',
      'Lead qualification and intake',
    ],
  },
  member: {
    label: 'Team Member',
    color: '#10B981',
    icon: Users,
    description: 'You have been added as a Team Member to collaborate on client projects.',
    highlights: [
      'Assigned client projects and deliverables',
      'Interactive time clock logging',
      'Internal tickets and messaging',
    ],
  },
  intern: {
    label: 'Intern',
    color: '#F59E0B',
    icon: GraduationCap,
    description: 'You have been added with Intern access.',
    highlights: [
      'Assigned learning tasks and deliverables',
      'Timesheet logging and clocking in/out',
      'Direct team collaboration',
    ],
  },
}

export default function TeamSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [member, setMember] = useState<{
    id: string
    name: string
    email: string
    role: string
    title?: string | null
  } | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token || !emailParam) {
      setError('Missing invitation token or email. Please check your invitation link.')
      setLoading(false)
      return
    }

    async function validateInvite() {
      try {
        const res = await fetch(`/api/team/setup?token=${encodeURIComponent(token!)}&email=${encodeURIComponent(emailParam!)}`)
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setError(data.error || 'Invalid or expired invitation link.')
        } else {
          setMember(data.member)
        }
      } catch (err) {
        setError('Network error validating invite. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [token, emailParam])

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/team/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: member?.email || emailParam,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to set up account.')
      }

      setSuccess(true)

      // Sign in automatically with the newly created password
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: member?.email || emailParam!,
        password,
      })

      setTimeout(() => {
        if (!signInErr) {
          if (member?.role === 'admin' || member?.role === 'manager') {
            router.push('/dashboard')
          } else {
            router.push('/dashboard')
          }
        } else {
          router.push('/login')
        }
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error setting password.')
      setSubmitting(false)
    }
  }

  const roleMeta = ROLE_INFO[member?.role?.toLowerCase() || 'member'] || ROLE_INFO.member
  const RoleIcon = roleMeta.icon

  return (
    <div style={{ minHeight: '100vh', background: '#07070D', color: '#F4F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Pure<span style={{ color: '#A066FF' }}>Pulse</span>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Team Account Activation
          </p>
        </div>

        <div style={{ background: '#0D0D14', border: '1px solid #1F1F2E', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#A066FF' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Verifying your invitation credentials...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <AlertCircle size={28} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F87171', marginBottom: '0.5rem' }}>
                Invitation Issue
              </h2>
              <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {error}
              </p>
              <a
                href="/login"
                style={{ display: 'inline-block', background: '#1F1F2E', color: '#F4F4FF', padding: '0.625rem 1.25rem', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
              >
                Go to Sign In →
              </a>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#A7F3D0', marginBottom: '0.5rem' }}>
                Account Activated!
              </h2>
              <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '1.5rem' }}>
                Your password has been saved. Redirecting to your dashboard...
              </p>
              <div style={{ color: '#A066FF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '13px' }}>
                <Loader2 size={16} className="animate-spin" /> Logging you in securely...
              </div>
            </div>
          ) : (
            <div>
              {/* Member Profile Badge */}
              <div style={{ background: '#14141F', border: '1px solid #2D2D42', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${roleMeta.color}22`, border: `1px solid ${roleMeta.color}55`, color: roleMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RoleIcon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#F4F4FF' }}>{member?.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: `${roleMeta.color}22`, color: roleMeta.color, border: `1px solid ${roleMeta.color}44` }}>
                      {roleMeta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                    {member?.email} {member?.title ? `• ${member.title}` : ''}
                  </div>
                </div>
              </div>

              {/* Role Privileges Box */}
              <div style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A066FF', marginBottom: '6px' }}>
                  {roleMeta.label} Privileges
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '12.5px', color: '#D1D5DB', lineHeight: 1.5 }}>
                  {roleMeta.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>

              <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '0.25rem', color: '#F4F4FF' }}>
                Create Your Account Password
              </h2>
              <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '1.25rem' }}>
                Choose a secure password to access your dashboard.
              </p>

              <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#D1D5DB', marginBottom: '0.35rem' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#14141F',
                        border: '1px solid #2D2D42',
                        borderRadius: '8px',
                        padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                        color: '#F4F4FF',
                        fontSize: '14px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#D1D5DB', marginBottom: '0.35rem' }}>
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#14141F',
                      border: '1px solid #2D2D42',
                      borderRadius: '8px',
                      padding: '0.625rem 0.875rem',
                      color: '#F4F4FF',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#7B2FFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(123,47,255,0.3)',
                  }}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving Password...</>
                  ) : (
                    <>Activate &amp; Enter Dashboard <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
