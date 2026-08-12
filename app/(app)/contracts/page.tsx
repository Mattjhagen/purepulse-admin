'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Contract, Client, Plan, PLAN_PRICES, ContractStatus } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, planBadgeClass, planLabel } from '@/lib/utils'
import { generateContractContent } from '@/lib/contract-template'
import { Plus, Search, X, FileText, Send, Link2, CheckCircle, FileCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']
const STATUSES: ContractStatus[] = ['draft', 'sent', 'signed', 'active', 'expired', 'terminated']

function ContractModal({ clients, onClose, onSave }: { clients: Client[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    client_id: '',
    title: 'Web Services Agreement',
    plan: 'starter' as Plan,
    hourly_rate: 85,
    start_date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const client = clients.find(c => c.id === form.client_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    if (!client) { setError('Select a client'); setLoading(false); return }

    const content = generateContractContent(client, form.plan, Number(form.hourly_rate), form.start_date)

    const { error: err } = await supabase.from('contracts').insert({
      client_id: form.client_id,
      title: form.title,
      plan: form.plan,
      monthly_rate: PLAN_PRICES[form.plan],
      hourly_rate: Number(form.hourly_rate),
      start_date: form.start_date,
      content,
      status: 'draft',
    })
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Generate Contract</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Client *</label>
            <select className="input" required value={form.client_id} onChange={e => {
              set('client_id', e.target.value)
              const c = clients.find(cl => cl.id === e.target.value)
              if (c) { set('plan', c.plan); set('hourly_rate', c.hourly_rate) }
            }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Contract Title</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Plan *</label>
              <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLANS.map(p => <option key={p} value={p}>{planLabel(p)} — {formatMoney(PLAN_PRICES[p])}/mo</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Hourly Rate *</label>
              <input className="input" type="number" min={0} step={0.01} value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Start Date</label>
            <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          {form.client_id && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Generates a 12-month Web Services Agreement — <strong style={{ color: 'var(--text)' }}>{planLabel(form.plan)}</strong> plan at <strong style={{ color: 'var(--text)' }}>{formatMoney(PLAN_PRICES[form.plan])}/mo</strong> + {formatMoney(Number(form.hourly_rate))}/hr for extra work.
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : <><FileText size={14} /> Generate</>}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContractsPage() {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contracts, setContracts] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [contRes, clientsRes] = await Promise.all([
      supabase.from('contracts').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
    ])
    setContracts(contRes.data ?? [])
    setClients(clientsRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function quickSend(contractId: string) {
    setSendingId(contractId)
    const res = await fetch(`/api/contracts/${contractId}/send`, { method: 'POST' })
    if (res.ok) {
      setSentId(contractId)
      setTimeout(() => setSentId(null), 3000)
      await load()
    }
    setSendingId(null)
  }

  function copySigningLink(token: string, contractId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`)
    setCopiedId(contractId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const today = new Date()

  const filtered = contracts.filter(c => {
    const matchSearch = search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || (c.clients?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchPlan = planFilter === 'all' || c.plan === planFilter
    return matchSearch && matchStatus && matchPlan
  })

  // Stats
  const activeCount = contracts.filter(c => ['signed', 'active'].includes(c.status)).length
  const pendingCount = contracts.filter(c => c.status === 'sent').length
  const draftCount = contracts.filter(c => c.status === 'draft').length
  const mrr = contracts.filter(c => ['signed', 'active'].includes(c.status)).reduce((s, c) => s + (c.monthly_rate ?? 0), 0)

  // Contracts expiring within 30 days
  const expiringSoon = contracts.filter(c => {
    if (!c.end_date || !['signed', 'active'].includes(c.status)) return false
    const end = new Date(c.end_date)
    const diff = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  })

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Contracts</h1>
            <p>Generate, send, and track client agreements.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Generate contract
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileCheck size={18} color="#22c55e" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{activeCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{pendingCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Pending signature</p>
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
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} style={{ opacity: 0.4 }} />
            </div>
            <div>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1 }}>{draftCount}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Drafts</p>
            </div>
          </div>
        </div>
      )}

      {/* Expiring soon alert */}
      {expiringSoon.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '12px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>{expiringSoon.length} contract{expiringSoon.length > 1 ? 's' : ''}</strong> expiring within 30 days: {expiringSoon.map(c => c.clients?.name ?? c.title).join(', ')}
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search contracts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
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
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {(['all', ...PLANS] as string[]).map(p => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className="btn btn-ghost btn-sm"
              style={{
                fontWeight: planFilter === p ? 700 : 400,
                background: planFilter === p ? 'var(--bg-card-hover)' : undefined,
                borderColor: planFilter === p ? 'var(--border-strong)' : undefined,
                textTransform: 'capitalize',
              }}
            >
              {p === 'all' ? 'Any plan' : planLabel(p as Plan)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No contracts found.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal(true)}><Plus size={16} /> Generate first contract</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Contract</th><th>Client</th><th>Plan</th><th>Monthly</th><th>Status</th><th>Start Date</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isSending = sendingId === c.id
                const wasSent = sentId === c.id
                const wasCopied = copiedId === c.id
                const canSend = ['draft', 'sent'].includes(c.status)
                const hasToken = !!c.signature_token
                const isExpiringSoon = c.end_date && ['signed', 'active'].includes(c.status) && (() => {
                  const diff = (new Date(c.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  return diff >= 0 && diff <= 30
                })()
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{c.title}</span>
                        {isExpiringSoon && <span title="Expiring soon"><AlertTriangle size={13} color="#f59e0b" /></span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.clients?.name ?? '—'}</td>
                    <td><span className={planBadgeClass(c.plan)}>{planLabel(c.plan)}</span></td>
                    <td>{formatMoney(c.monthly_rate)}/mo</td>
                    <td><span className={statusBadgeClass(c.status)}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{c.start_date ? formatDate(c.start_date) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        <Link href={`/contracts/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                        {canSend && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={isSending}
                            title={c.status === 'sent' ? 'Resend signing email' : 'Send for signing'}
                            onClick={() => quickSend(c.id)}
                            style={wasSent ? { color: '#22c55e' } : {}}
                          >
                            {isSending ? <span className="spinner" style={{ width: 12, height: 12 }} /> : wasSent ? <CheckCircle size={13} /> : <Send size={13} />}
                          </button>
                        )}
                        {hasToken && c.status !== 'signed' && c.status !== 'active' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Copy signing link"
                            onClick={() => copySigningLink(c.signature_token, c.id)}
                            style={wasCopied ? { color: '#22c55e' } : {}}
                          >
                            {wasCopied ? <CheckCircle size={13} /> : <Link2 size={13} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ContractModal clients={clients} onClose={() => setModal(false)} onSave={() => { setModal(false); load() }} />}
    </>
  )
}
