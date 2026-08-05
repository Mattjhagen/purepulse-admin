'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Contract, Client, Plan, PLAN_PRICES } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, planBadgeClass, planLabel } from '@/lib/utils'
import { generateContractContent } from '@/lib/contract-template'
import { Plus, Search, X, FileText } from 'lucide-react'
import Link from 'next/link'

const PLANS: Plan[] = ['starter', 'growth', 'premium', 'business']

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
              Will generate a full 12-month Web Services Agreement with the {planLabel(form.plan)} plan at {formatMoney(PLAN_PRICES[form.plan])}/mo and {formatMoney(Number(form.hourly_rate))}/hr for extra work.
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
  const [contracts, setContracts] = useState<(Contract & { clients: { name: string } | null })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)

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

  const filtered = contracts.filter(c =>
    search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || (c.clients?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Contracts</h1>
            <p>Generate, store, and track client agreements.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Generate contract
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search contracts…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No contracts yet.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal(true)}><Plus size={16} /> Generate first contract</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Contract</th><th>Client</th><th>Plan</th><th>Monthly</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.clients?.name ?? '—'}</td>
                  <td><span className={planBadgeClass(c.plan)}>{planLabel(c.plan)}</span></td>
                  <td>{formatMoney(c.monthly_rate)}/mo</td>
                  <td><span className={statusBadgeClass(c.status)}>{c.status}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                  <td>
                    <Link href={`/contracts/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ContractModal clients={clients} onClose={() => setModal(false)} onSave={() => { setModal(false); load() }} />}
    </>
  )
}
