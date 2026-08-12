'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, Plan, PLAN_PRICES } from '@/lib/types'
import { formatDate, formatMoney, planBadgeClass, planLabel, statusBadgeClass } from '@/lib/utils'
import { Plus, Search, X, Link2, Check } from 'lucide-react'
import Link from 'next/link'

const PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']
const STATUSES = ['active', 'inactive', 'prospect']

function ClientModal({ client, onClose, onSave }: {
  client?: Client | null
  onClose: () => void
  onSave: () => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: client?.name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    company: client?.company ?? '',
    plan: (client?.plan ?? 'starter') as Plan,
    hourly_rate: client?.hourly_rate ?? 85,
    status: client?.status ?? 'prospect',
    notes: client?.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const payload = { ...form, hourly_rate: Number(form.hourly_rate), updated_at: new Date().toISOString() }
    const { error: err } = client?.id
      ? await supabase.from('clients').update(payload).eq('id', client.id)
      : await supabase.from('clients').insert(payload)
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>{client ? 'Edit Client' : 'New Client'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Name *</label>
              <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Email *</label>
              <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(402) 555-0000" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Plan *</label>
              <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLANS.map(p => <option key={p} value={p}>{planLabel(p)} — ${PLAN_PRICES[p]}/mo</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Hourly Rate *</label>
              <input className="input" type="number" min={0} step={0.01} required value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="85.00" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : client ? 'Save changes' : 'Create client'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [linkedClientIds, setLinkedClientIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; client?: Client | null }>({ open: false })
  const [inviting, setInviting] = useState<Set<string>>(new Set())
  const [inviteError, setInviteError] = useState<{ id: string; message: string } | null>(null)

  async function load() {
    setLoading(true)
    const [{ data }, { data: portalUsers }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('portal_users').select('client_id'),
    ])
    setClients(data ?? [])
    setLinkedClientIds(new Set((portalUsers ?? []).map(pu => pu.client_id).filter(Boolean)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function invitePortal(clientId: string) {
    setInviteError(null)
    setInviting(prev => new Set(prev).add(clientId))
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-invite`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to link portal access.')
      setLinkedClientIds(prev => new Set(prev).add(clientId))
    } catch (err) {
      setInviteError({ id: clientId, message: err instanceof Error ? err.message : 'Failed to link portal access.' })
    } finally {
      setInviting(prev => { const next = new Set(prev); next.delete(clientId); return next })
    }
  }

  const filtered = clients.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Clients</h1>
            <p>Manage your client roster, plans, and rates.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, client: null })}>
            <Plus size={16} /> New client
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No clients found.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal({ open: true, client: null })}>
            <Plus size={16} /> Add your first client
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Hourly Rate</th>
                <th>Status</th>
                <th>Portal</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div>
                      <p style={{ fontWeight: 500 }}>{c.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{c.email}</p>
                    </div>
                  </td>
                  <td><span className={planBadgeClass(c.plan)}>{planLabel(c.plan)} — {formatMoney(PLAN_PRICES[c.plan])}/mo</span></td>
                  <td>{formatMoney(c.hourly_rate)}/hr</td>
                  <td><span className={statusBadgeClass(c.status)}>{c.status}</span></td>
                  <td>
                    {linkedClientIds.has(c.id) ? (
                      <span className="badge badge-green"><Check size={12} /> Linked</span>
                    ) : (
                      <div>
                        <button className="btn btn-ghost btn-sm" disabled={inviting.has(c.id)} onClick={() => invitePortal(c.id)}>
                          {inviting.has(c.id) ? <span className="spinner" /> : <><Link2 size={13} /> Invite</>}
                        </button>
                        {inviteError?.id === c.id && (
                          <p className="error-msg" style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '160px' }}>{inviteError.message}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, client: c })}>Edit</button>
                      <Link href={`/time-clock?client=${c.id}`} className="btn btn-ghost btn-sm">Clock In</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <ClientModal
          client={modal.client}
          onClose={() => setModal({ open: false })}
          onSave={() => { setModal({ open: false }); load() }}
        />
      )}
    </>
  )
}
