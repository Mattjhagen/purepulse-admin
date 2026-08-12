'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, Plan, PLAN_PRICES } from '@/lib/types'
import { formatDate, formatMoney, planBadgeClass, planLabel, statusBadgeClass } from '@/lib/utils'
import { Plus, Search, X, CheckCircle, Users, TrendingUp, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'

const PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']
const STATUSES = ['active', 'inactive', 'prospect']

// ─── New Client Modal ─────────────────────────────────────────────────────────

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
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
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
            <div className="form-group"><label>Name *</label><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Doe" /></div>
            <div className="form-group"><label>Company</label><input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label>Email *</label><input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" /></div>
            <div className="form-group"><label>Phone</label><input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(402) 555-0000" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Plan *</label>
              <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLANS.map(p => <option key={p} value={p}>{planLabel(p)} — ${PLAN_PRICES[p]}/mo</option>)}
              </select>
            </div>
            <div className="form-group"><label>Hourly Rate *</label><input className="input" type="number" min={0} step={0.01} required value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="85.00" /></div>
            <div className="form-group">
              <label>Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Notes</label><textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" /></div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : client ? 'Save changes' : 'Create client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [linkedClientIds, setLinkedClientIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modal, setModal] = useState<{ open: boolean; client?: Client | null }>({ open: false })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: portalUsers }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('portal_users').select('client_id'),
    ])
    setClients(data ?? [])
    setLinkedClientIds(new Set((portalUsers ?? []).map(pu => pu.client_id).filter(Boolean)))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = clients.filter(c => {
    const matchSearch = search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || (c.company ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const activeClients = clients.filter(c => c.status === 'active')
  const prospects = clients.filter(c => c.status === 'prospect')
  const inactive = clients.filter(c => c.status === 'inactive')
  const mrr = activeClients.reduce((s, c) => s + (PLAN_PRICES[c.plan] ?? 0), 0)

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

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCheck size={18} color="#22c55e" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{activeClients.length}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={18} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{prospects.length}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Prospects</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserX size={18} style={{ opacity: 0.4 }} />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{inactive.length}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Inactive</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={18} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(mrr)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>MRR</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="btn btn-ghost btn-sm"
              style={{
                fontWeight: statusFilter === s ? 700 : 400,
                background: statusFilter === s ? 'var(--bg-card-hover)' : undefined,
                borderColor: statusFilter === s ? 'var(--border-strong)' : undefined,
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
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
                <th>Hourly</th>
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
                      <p style={{ fontWeight: 600 }}>{c.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{c.company ? `${c.company} · ` : ''}{c.email}</p>
                    </div>
                  </td>
                  <td>
                    <span className={planBadgeClass(c.plan)}>{planLabel(c.plan)}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.375rem' }}>{formatMoney(PLAN_PRICES[c.plan])}/mo</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatMoney(c.hourly_rate)}/hr</td>
                  <td><span className={statusBadgeClass(c.status)}>{c.status}</span></td>
                  <td>
                    {linkedClientIds.has(c.id)
                      ? <span className="badge badge-green"><CheckCircle size={11} style={{ marginRight: 3 }} />Linked</span>
                      : <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(c.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <Link href={`/clients/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, client: c })}>Edit</button>
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
