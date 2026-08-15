'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, formatMoney } from '@/lib/utils'
import { Plus, Gift, TrendingUp, MousePointer, CheckCircle, DollarSign, Copy, Printer, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Referral = {
  id: string
  name: string
  email: string | null
  phone: string | null
  code: string
  clicks: number
  conversions: number
  commission_per_conversion: number
  total_earned: number
  total_paid: number
  notes: string | null
  active: boolean
  created_at: string
}

function genCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return base ? `${base}${suffix}` : suffix
}

function NewReferralModal({ onClose, onSaved }: { onClose: () => void; onSaved: (newId: string) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', commission: '50', notes: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, code: genCode(name) }))
  }

  async function save() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    if (!form.code.trim()) { setErr('Code is required'); return }
    setSaving(true)
    setErr('')
    const res = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        code: form.code,
        commission_per_conversion: form.commission,
        notes: form.notes,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setErr(json.error ?? 'Failed to create referrer'); return }
    onSaved(json.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>New Referrer</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        {err && <div style={{ marginBottom: '1rem', padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.875rem' }}>{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Referral Code *</label>
              <input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="JANE123" style={{ fontFamily: 'monospace' }} />
            </div>
            <div>
              <label className="label">Commission per Signup</label>
              <input className="input" type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} placeholder="50" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Where they're hanging flyers, etc." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : <><Plus size={14} /> Create</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReferralsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const load = useCallback(async () => {
    const { data } = await supabase.from('referrals').select('*').order('created_at', { ascending: false })
    setReferrals((data ?? []) as Referral[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function handleNewReferralSaved(newId: string) {
    router.push(`/referrals/${newId}?print=1`)
  }

  function copyLink(code: string) {
    const origin = window.location.origin
    navigator.clipboard.writeText(`${origin}/ref/${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = referrals.filter(r =>
    filter === 'all' ? true : filter === 'active' ? r.active : !r.active
  )

  const totalClicks = referrals.reduce((s, r) => s + r.clicks, 0)
  const totalConversions = referrals.reduce((s, r) => s + r.conversions, 0)
  const totalEarned = referrals.reduce((s, r) => s + r.total_earned, 0)
  const totalPaid = referrals.reduce((s, r) => s + r.total_paid, 0)
  const totalOwed = totalEarned - totalPaid

  return (
    <>
      {/* Affiliate intro video */}
      <div style={{ marginBottom: '2rem', borderRadius: 12, overflow: 'hidden', background: '#07070D', aspectRatio: '16/9', maxHeight: 480 }}>
        <video
          src="https://ouwyuxqlvjvxdobjnezu.supabase.co/storage/v1/object/public/media/affiliate-video.mp4"
          controls
          playsInline
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        />
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Referrals</h1>
            <p>Track people who promote PurePulse and pay their commissions.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Referrer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-tile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={14} color="#6366f1" />
            </div>
          </div>
          <div className="stat-value">{referrals.filter(r => r.active).length}</div>
          <div className="stat-label">Active Referrers</div>
        </div>
        <div className="stat-tile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MousePointer size={14} color="#6366f1" />
            </div>
          </div>
          <div className="stat-value">{totalClicks}</div>
          <div className="stat-label">Total Clicks</div>
        </div>
        <div className="stat-tile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} color="#22c55e" />
            </div>
          </div>
          <div className="stat-value">{totalConversions}</div>
          <div className="stat-label">Conversions</div>
        </div>
        <div className="stat-tile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} color="#f59e0b" />
            </div>
          </div>
          <div className="stat-value" style={{ color: totalOwed > 0 ? '#f59e0b' : undefined }}>{formatMoney(totalOwed)}</div>
          <div className="stat-label">Commissions Owed</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Gift size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p>No referrers yet. Add someone who&apos;s promoting PurePulse.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Referrer</th>
                <th>Code</th>
                <th>Clicks</th>
                <th>Signups</th>
                <th>Earned</th>
                <th>Paid</th>
                <th>Owed</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const owed = r.total_earned - r.total_paid
                return (
                  <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.email && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{r.email}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontSize: '0.8125rem', background: 'var(--surface)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{r.code}</code>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => copyLink(r.code)}
                          style={{ padding: '2px 6px', fontSize: '0.75rem', color: copied === r.code ? '#22c55e' : undefined }}
                          title="Copy referral link"
                        >
                          {copied === r.code ? <CheckCircle size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.clicks}</td>
                    <td>{r.conversions > 0 ? <span style={{ color: '#22c55e', fontWeight: 600 }}>{r.conversions}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontWeight: r.total_earned > 0 ? 600 : 400 }}>{r.total_earned > 0 ? formatMoney(r.total_earned) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.total_paid > 0 ? formatMoney(r.total_paid) : '—'}</td>
                    <td style={{ fontWeight: owed > 0 ? 700 : 400, color: owed > 0 ? '#f59e0b' : undefined }}>{owed > 0 ? formatMoney(owed) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(r.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/referrals/${r.id}`} className="btn btn-ghost btn-sm">View</Link>
                        <Link href={`/referrals/${r.id}?print=1`} className="btn btn-ghost btn-sm" title="Print flyer">
                          <Printer size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewReferralModal onClose={() => setShowNew(false)} onSaved={handleNewReferralSaved} />}
    </>
  )
}
