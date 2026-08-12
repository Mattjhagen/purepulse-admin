'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X, ChevronRight, Mail, Phone, Trash2 } from 'lucide-react'

type Lead = {
  id: string
  name: string
  email: string
  phone: string | null
  plan: string | null
  status: string
  source: string | null
  project: string | null
  notes: string | null
  created_at: string
}

const COLUMNS = [
  { key: 'new',       label: 'New',       color: '#3b82f6', bg: 'rgba(59,130,246,0.08)'  },
  { key: 'contacted', label: 'Contacted', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
  { key: 'qualified', label: 'Qualified', color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
  { key: 'converted', label: 'Converted', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
]

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  premium: 'Premium',
  business: 'Business',
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  social: 'Social',
  ad: 'Ad',
  other: 'Other',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)

  // slide-over editable fields
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editSource, setEditSource] = useState('')

  // add-lead form
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addPlan, setAddPlan] = useState('')
  const [addSource, setAddSource] = useState('website')
  const [addProject, setAddProject] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const selected = leads.find(l => l.id === selectedId) ?? null

  // Sync slide-over fields when selection changes
  useEffect(() => {
    if (!selected) return
    setEditPhone(selected.phone ?? '')
    setEditNotes(selected.notes ?? '')
    setEditStatus(selected.status)
    setEditSource(selected.source ?? 'website')
  }, [selected])

  const filtered = useMemo(() => {
    if (!search) return leads
    const q = search.toLowerCase()
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.project ?? '').toLowerCase().includes(q)
    )
  }, [leads, search])

  async function moveLead(id: string, status: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    await supabase.from('leads').update({ status }).eq('id', id)
  }

  async function saveSelected() {
    if (!selectedId) return
    setSaving(true)
    await supabase.from('leads').update({
      phone: editPhone || null,
      notes: editNotes || null,
      status: editStatus,
      source: editSource,
    }).eq('id', selectedId)
    setLeads(prev => prev.map(l => l.id === selectedId ? {
      ...l, phone: editPhone || null, notes: editNotes || null, status: editStatus, source: editSource
    } : l))
    setSaving(false)
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function convertToClient() {
    if (!selected) return
    if (!confirm(`Convert ${selected.name} to a client?`)) return
    setConverting(true)
    await supabase.from('clients').insert({
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
      plan: selected.plan ?? 'starter',
      status: 'prospect',
    })
    await moveLead(selected.id, 'converted')
    setSelectedId(null)
    setConverting(false)
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('leads').insert({
      name: addName.trim(),
      email: addEmail.trim(),
      phone: addPhone.trim() || null,
      plan: addPlan || null,
      source: addSource,
      project: addProject.trim() || null,
      status: 'new',
    }).select().single()
    if (data) setLeads(prev => [data as Lead, ...prev])
    setAddName(''); setAddEmail(''); setAddPhone(''); setAddPlan(''); setAddProject('')
    setShowAdd(false)
    setSaving(false)
  }

  const totalUnconverted = leads.filter(l => l.status !== 'converted').length

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Leads {totalUnconverted > 0 && <span className="badge badge-blue" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>{totalUnconverted}</span>}</h1>
          <p>Consultation requests and prospects</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input className="input input-sm" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '180px' }} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Lead</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const colLeads = filtered.filter(l => col.key === 'new'
              ? (l.status === 'new' || !COLUMNS.some(c => c.key === l.status))
              : l.status === col.key
            )
            return (
              <div key={col.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.25rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{colLeads.length}</span>
                </div>

                {/* Cards */}
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="card"
                    onClick={() => setSelectedId(lead.id)}
                    style={{ padding: '0.875rem 1rem', cursor: 'pointer', background: selectedId === lead.id ? 'var(--bg-card-hover)' : undefined, borderColor: selectedId === lead.id ? col.color : undefined, borderWidth: selectedId === lead.id ? '2px' : undefined }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.25rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{lead.name}</p>
                      {lead.plan && (
                        <span className="badge badge-dim" style={{ fontSize: '0.65rem', flexShrink: 0 }}>{PLAN_LABELS[lead.plan] ?? lead.plan}</span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{lead.email}</p>
                    {lead.project && (
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.775rem', marginTop: '0.375rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {lead.project}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{timeAgo(lead.created_at)}</span>
                      {lead.source && lead.source !== 'website' && (
                        <span style={{ fontSize: '0.65rem', background: col.bg, color: col.color, padding: '1px 6px', borderRadius: '100px', fontWeight: 600 }}>{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                      )}
                    </div>
                    {/* Quick move pills */}
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      {COLUMNS.filter(c => c.key !== col.key).map(c => (
                        <button
                          key={c.key}
                          onClick={() => moveLead(lead.id, c.key)}
                          style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: '100px', border: `1px solid ${c.color}`, color: c.color, background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {c.label} <ChevronRight size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                    No leads
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-over detail panel */}
      {selectedId && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setSelectedId(null)}>
          <div
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '420px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{selected.name}</h2>
                {selected.plan && <span className="badge badge-dim">{PLAN_LABELS[selected.plan] ?? selected.plan}</span>}
              </div>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {/* Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', textDecoration: 'none' }}>
                  <Mail size={14} color="var(--text-muted)" />{selected.email}
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} color="var(--text-muted)" />
                  <input
                    className="input input-sm"
                    style={{ flex: 1 }}
                    placeholder="Phone number…"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Stage + Source */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Stage</label>
                  <select className="input input-sm" style={{ width: '100%' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Source</label>
                  <select className="input input-sm" style={{ width: '100%' }} value={editSource} onChange={e => setEditSource(e.target.value)}>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Project */}
              {selected.project && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.375rem' }}>Project</label>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>{selected.project}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Notes</label>
                <textarea
                  className="input"
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Add notes…"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                />
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Added {timeAgo(selected.created_at)}</span>
            </div>

            {/* Actions */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSelected} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save'}
              </button>
              {selected.status !== 'converted' && (
                <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', flex: 1 }} onClick={convertToClient} disabled={converting}>
                  {converting ? <span className="spinner" /> : 'Convert to Client'}
                </button>
              )}
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '0.5rem' }}
                onClick={() => deleteLead(selected.id)}
                title="Delete lead"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add lead modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAdd(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Add Lead</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={addLead} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input" placeholder="Name *" required value={addName} onChange={e => setAddName(e.target.value)} />
              <input className="input" type="email" placeholder="Email *" required value={addEmail} onChange={e => setAddEmail(e.target.value)} />
              <input className="input" placeholder="Phone" value={addPhone} onChange={e => setAddPhone(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <select className="input" value={addPlan} onChange={e => setAddPlan(e.target.value)}>
                  <option value="">Plan…</option>
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className="input" value={addSource} onChange={e => setAddSource(e.target.value)}>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <textarea className="input" rows={3} placeholder="Project description / notes…" value={addProject} onChange={e => setAddProject(e.target.value)} style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
