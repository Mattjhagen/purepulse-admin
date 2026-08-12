'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Client, Plan, PLAN_PRICES } from '@/lib/types'
import { formatDate, formatMoney, planBadgeClass, planLabel, statusBadgeClass } from '@/lib/utils'
import { Plus, Search, X, CheckCircle, Users, TrendingUp, UserCheck, UserX, Ban, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']
const STATUSES = ['active', 'inactive', 'prospect']

const PLAN_COLORS: Record<Plan, string> = {
  starter:  '#6366f1',
  growth:   '#8b5cf6',
  premium:  '#a855f7',
  business: '#22c55e',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, plan }: { name: string; plan: Plan }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  const color = PLAN_COLORS[plan]
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: `${color}22`, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6875rem', fontWeight: 800, color, flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

// ─── Plan distribution bar ────────────────────────────────────────────────────

function PlanDistributionBar({ clients }: { clients: Client[] }) {
  const active = clients.filter(c => c.status === 'active')
  if (active.length === 0) return null
  const byPlan = PLANS.map(p => ({ plan: p, count: active.filter(c => c.plan === p).length })).filter(x => x.count > 0)
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.5rem' }}>Active clients by plan</p>
      <div style={{ display: 'flex', height: 7, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
        {byPlan.map(({ plan, count }) => (
          <div key={plan} style={{ flex: count, background: PLAN_COLORS[plan] }} title={`${planLabel(plan)}: ${count}`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {byPlan.map(({ plan, count }) => (
          <span key={plan} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: PLAN_COLORS[plan], display: 'inline-block' }} />
            {planLabel(plan)} · {count}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── New / Edit Client Modal ──────────────────────────────────────────────────

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

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = 'name' | 'plan' | 'mrr' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
  return dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [linkedClientIds, setLinkedClientIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [modal, setModal] = useState<{ open: boolean; client?: Client | null }>({ open: false })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, portalRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      fetch('/api/portal-users').then(r => r.json()),
    ])
    setClients(data ?? [])
    setLinkedClientIds(new Set((portalRes.clientIds ?? []) as string[]))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = clients.filter(c => {
      const matchSearch = search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || (c.company ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      const matchPlan = planFilter === 'all' || c.plan === planFilter
      return matchSearch && matchStatus && matchPlan
    })
    list = [...list].sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      else if (sortKey === 'plan') { av = PLANS.indexOf(a.plan); bv = PLANS.indexOf(b.plan) }
      else if (sortKey === 'mrr') { av = PLAN_PRICES[a.plan]; bv = PLAN_PRICES[b.plan] }
      else if (sortKey === 'status') { av = a.status; bv = b.status }
      else if (sortKey === 'created_at') { av = a.created_at; bv = b.created_at }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [clients, search, statusFilter, planFilter, sortKey, sortDir])

  // Stats
  const activeClients = clients.filter(c => c.status === 'active')
  const prospects = clients.filter(c => c.status === 'prospect')
  const inactive = clients.filter(c => c.status === 'inactive')
  const suspended = clients.filter(c => c.suspended)
  const mrr = activeClients.reduce((s, c) => s + (PLAN_PRICES[c.plan] ?? 0), 0)

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
  const thInner = (label: string, key: SortKey) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }} onClick={() => toggleSort(key)}>
      {label}
      <SortIcon col={key} active={sortKey === key} dir={sortDir} />
    </span>
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

      {/* Stats */}
      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Active */}
            <button
              onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', textAlign: 'left', width: '100%', cursor: 'pointer', background: statusFilter === 'active' ? 'rgba(34,197,94,0.07)' : undefined, borderColor: statusFilter === 'active' ? 'rgba(34,197,94,0.3)' : undefined }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserCheck size={18} color="#22c55e" />
              </div>
              <div>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{activeClients.length}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active</p>
              </div>
            </button>

            {/* Prospects */}
            <button
              onClick={() => setStatusFilter(statusFilter === 'prospect' ? 'all' : 'prospect')}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', textAlign: 'left', width: '100%', cursor: 'pointer', background: statusFilter === 'prospect' ? 'rgba(245,158,11,0.07)' : undefined, borderColor: statusFilter === 'prospect' ? 'rgba(245,158,11,0.3)' : undefined }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={18} color="#f59e0b" />
              </div>
              <div>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{prospects.length}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Prospects</p>
              </div>
            </button>

            {/* MRR */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={18} color="#6366f1" />
              </div>
              <div>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{formatMoney(mrr)}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>MRR</p>
              </div>
            </div>

            {/* Inactive */}
            <button
              onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', textAlign: 'left', width: '100%', cursor: 'pointer', background: statusFilter === 'inactive' ? 'rgba(255,255,255,0.04)' : undefined, borderColor: statusFilter === 'inactive' ? 'var(--border-strong)' : undefined }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserX size={18} style={{ opacity: 0.4 }} />
              </div>
              <div>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{inactive.length}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Inactive</p>
              </div>
            </button>

            {/* Suspended — only show if any */}
            {suspended.length > 0 && (
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ban size={18} color="#ef4444" />
                </div>
                <div>
                  <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1, color: '#ef4444' }}>{suspended.length}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Suspended</p>
                </div>
              </div>
            )}
          </div>

          <PlanDistributionBar clients={clients} />
        </>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Plan pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          <button onClick={() => setPlanFilter('all')} className={`btn btn-sm ${planFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All plans</button>
          {PLANS.map(p => (
            <button
              key={p}
              onClick={() => setPlanFilter(planFilter === p ? 'all' : p)}
              className={`btn btn-sm ${planFilter === p ? 'btn-primary' : 'btn-ghost'}`}
            >
              {planLabel(p)}
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
                <th style={thStyle}>{thInner('Client', 'name')}</th>
                <th style={thStyle}>{thInner('Plan', 'plan')}</th>
                <th style={thStyle}>{thInner('MRR', 'mrr')}</th>
                <th style={thStyle}>{thInner('Status', 'status')}</th>
                <th>Portal</th>
                <th style={thStyle}>{thInner('Since', 'created_at')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ opacity: c.suspended ? 0.65 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar name={c.name} plan={c.plan} />
                      <div>
                        <p style={{ fontWeight: 600 }}>{c.name}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          {c.company ? `${c.company} · ` : ''}{c.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={planBadgeClass(c.plan)}>{planLabel(c.plan)}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatMoney(PLAN_PRICES[c.plan])}<span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>/mo</span>
                    <br />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatMoney(c.hourly_rate)}/hr</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span className={statusBadgeClass(c.status)}>{c.status}</span>
                      {c.suspended && <span className="badge badge-red"><Ban size={10} style={{ marginRight: 2 }} />Suspended</span>}
                    </div>
                  </td>
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

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'right' }}>
          Showing {filtered.length} of {clients.length} clients
        </p>
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
