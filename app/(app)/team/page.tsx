'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X, Mail, Phone, DollarSign, Trash2, UserCheck, UserX } from 'lucide-react'

type TeamMember = {
  id: string
  name: string
  email: string
  role: string
  title: string | null
  phone: string | null
  hourly_rate: number
  status: string
  notes: string | null
  created_at: string
}

const ROLES = [
  { key: 'admin',   label: 'Admin',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { key: 'manager', label: 'Manager', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'member',  label: 'Member',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { key: 'intern',  label: 'Intern',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
]

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  active:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  invited:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  inactive: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)

  // edit fields
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState('')

  // invite fields
  const [invName, setInvName] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('member')
  const [invTitle, setInvTitle] = useState('')
  const [invPhone, setInvPhone] = useState('')
  const [invRate, setInvRate] = useState('')
  const [invNotes, setInvNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('team_members').select('*').order('name')
    setMembers(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selected) return
    setEditName(selected.name)
    setEditTitle(selected.title ?? '')
    setEditRole(selected.role)
    setEditPhone(selected.phone ?? '')
    setEditRate(String(selected.hourly_rate ?? 0))
    setEditNotes(selected.notes ?? '')
    setEditStatus(selected.status)
  }, [selected])

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    const updates = {
      name: editName.trim(),
      title: editTitle.trim() || null,
      role: editRole,
      phone: editPhone.trim() || null,
      hourly_rate: parseFloat(editRate) || 0,
      notes: editNotes.trim() || null,
      status: editStatus,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('team_members').update(updates).eq('id', selected.id)
    setMembers(prev => prev.map(m => m.id === selected.id ? { ...m, ...updates } : m))
    setSelected(null)
    setSaving(false)
  }

  async function deleteMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: invName.trim(),
        email: invEmail.trim(),
        role: invRole,
        title: invTitle.trim() || null,
        phone: invPhone.trim() || null,
        hourly_rate: parseFloat(invRate) || 0,
        notes: invNotes.trim() || null,
      }),
    })
    const { member } = await res.json()
    if (member) setMembers(prev => [...prev, member as TeamMember].sort((a, b) => a.name.localeCompare(b.name)))
    setInvName(''); setInvEmail(''); setInvRole('member'); setInvTitle('')
    setInvPhone(''); setInvRate(''); setInvNotes('')
    setShowInvite(false)
    setSaving(false)
  }

  const active = members.filter(m => m.status === 'active').length
  const invited = members.filter(m => m.status === 'invited').length

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Team</h1>
          <p>Manage your agency's staff and contractors.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Plus size={14} /> Invite Member</button>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: members.length, color: 'var(--text)' },
          { label: 'Active', value: active, color: '#10b981' },
          { label: 'Invited', value: invited, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: '90px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em', color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : members.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No team members yet. Invite your first member to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {members.map(m => {
            const roleInfo = ROLES.find(r => r.key === m.role) ?? ROLES[2]
            const statusInfo = STATUS_COLORS[m.status] ?? STATUS_COLORS.inactive
            const color = avatarColor(m.name)
            return (
              <div
                key={m.id}
                className="card"
                style={{ padding: '1.25rem', cursor: 'pointer', borderColor: selected?.id === m.id ? 'var(--border-strong)' : undefined }}
                onClick={() => setSelected(m)}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    {initials(m.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{m.name}</p>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: '100px', background: roleInfo.bg, color: roleInfo.color }}>{roleInfo.label}</span>
                    </div>
                    {m.title && <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>{m.title}</p>}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: statusInfo.bg, color: statusInfo.color, flexShrink: 0 }}>
                    {m.status === 'active' ? <><UserCheck size={10} style={{ display: 'inline', marginRight: 2 }} />Active</> :
                     m.status === 'invited' ? 'Invited' :
                     <><UserX size={10} style={{ display: 'inline', marginRight: 2 }} />Inactive</>}
                  </span>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                    <Mail size={13} />{m.email}
                  </a>
                  {m.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      <Phone size={13} />{m.phone}
                    </div>
                  )}
                  {m.hourly_rate > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      <DollarSign size={13} />${m.hourly_rate}/hr
                    </div>
                  )}
                </div>

                {m.notes && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit slide-over */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setSelected(null)}>
          <div
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '400px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(selected.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {initials(selected.name)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700 }}>{selected.name}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Name</label>
                <input className="input" style={{ width: '100%' }} value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Title</label>
                <input className="input" style={{ width: '100%' }} placeholder="e.g. Video Editor" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Role</label>
                  <select className="input" style={{ width: '100%' }} value={editRole} onChange={e => setEditRole(e.target.value)}>
                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Status</label>
                  <select className="input" style={{ width: '100%' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Phone</label>
                  <input className="input" style={{ width: '100%' }} placeholder="(555) 000-0000" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Hourly Rate</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>$</span>
                    <input className="input" style={{ width: '100%', paddingLeft: '1.5rem' }} type="number" min="0" step="0.01" value={editRate} onChange={e => setEditRate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Notes</label>
                <textarea className="input" rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Internal notes…" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save'}
              </button>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '0.5rem' }}
                onClick={() => deleteMember(selected.id, selected.name)}
                title="Remove member"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowInvite(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', maxHeight: '90dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={invite} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Name *</label>
                  <input className="input" style={{ width: '100%' }} required value={invName} onChange={e => setInvName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Email *</label>
                  <input className="input" style={{ width: '100%' }} type="email" required value={invEmail} onChange={e => setInvEmail(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Role</label>
                  <select className="input" style={{ width: '100%' }} value={invRole} onChange={e => setInvRole(e.target.value)}>
                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Title</label>
                  <input className="input" style={{ width: '100%' }} placeholder="e.g. Video Editor" value={invTitle} onChange={e => setInvTitle(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Phone</label>
                  <input className="input" style={{ width: '100%' }} placeholder="(555) 000-0000" value={invPhone} onChange={e => setInvPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Hourly Rate</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>$</span>
                    <input className="input" style={{ width: '100%', paddingLeft: '1.5rem' }} type="number" min="0" step="0.01" value={invRate} onChange={e => setInvRate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Notes</label>
                <textarea className="input" rows={2} style={{ width: '100%', resize: 'vertical' }} placeholder="Skills, specialties, notes…" value={invNotes} onChange={e => setInvNotes(e.target.value)} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.25rem' }}>
                An invitation email will be sent to the address above.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
