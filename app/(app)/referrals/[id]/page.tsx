'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, formatMoney } from '@/lib/utils'
import {
  ChevronLeft, Gift, MousePointer, CheckCircle, DollarSign,
  Edit3, Save, X, AlertTriangle, Printer, Copy, ToggleLeft, ToggleRight,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'

type Referral = {
  id: string; name: string; email: string | null; phone: string | null
  code: string; clicks: number; conversions: number
  commission_per_conversion: number; total_earned: number; total_paid: number
  notes: string | null; active: boolean; created_at: string; updated_at: string
}

type Click = {
  id: string; referral_id: string; converted: boolean; converted_at: string | null
  client_name: string | null; plan: string | null; created_at: string
}

function ConversionModal({
  onConfirm, onCancel
}: { onConfirm: (clientName: string, plan: string) => Promise<void>; onCancel: () => void }) {
  const [clientName, setClientName] = useState('')
  const [plan, setPlan] = useState('starter')
  const [saving, setSaving] = useState(false)

  async function go() {
    setSaving(true)
    await onConfirm(clientName, plan)
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Record Conversion</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          This will add one conversion and increment commission owed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="label">Client Name</label>
            <input className="input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="New client name" />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={go} disabled={saving || !clientName.trim()}>
            {saving ? <span className="spinner" /> : <><CheckCircle size={14} /> Record</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function PayCommissionModal({
  owed, onConfirm, onCancel
}: { owed: number; onConfirm: (amount: number) => Promise<void>; onCancel: () => void }) {
  const [amount, setAmount] = useState(owed.toFixed(2))
  const [saving, setSaving] = useState(false)

  async function go() {
    setSaving(true)
    await onConfirm(parseFloat(amount))
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Mark Commission Paid</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Record a payment to this referrer.
        </p>
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">Amount Paid</label>
          <input className="input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={go} disabled={saving || parseFloat(amount) <= 0}>
            {saving ? <span className="spinner" /> : <><DollarSign size={14} /> Mark Paid</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const printMode = searchParams.get('print') === '1'
  const supabase = createClient()

  const [referral, setReferral] = useState<Referral | null>(null)
  const [clicks, setClicks] = useState<Click[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', commission: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [showConversion, setShowConversion] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrError, setQrError] = useState(false)

  const load = useCallback(async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('referrals').select('*').eq('id', id).single(),
      supabase.from('referral_clicks').select('*').eq('referral_id', id).order('created_at', { ascending: false }),
    ])
    setReferral(r as Referral)
    setClicks((c ?? []) as Click[])
    if (r) setForm({ name: r.name, email: r.email ?? '', phone: r.phone ?? '', commission: r.commission_per_conversion.toString(), notes: r.notes ?? '' })
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (printMode && referral) setTimeout(() => window.print(), 600)
  }, [printMode, referral])

  async function saveEdits() {
    setSaving(true)
    await supabase.from('referrals').update({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      commission_per_conversion: parseFloat(form.commission) || 50,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await load()
    setEditing(false)
    setSaving(false)
  }

  async function toggleActive() {
    if (!referral) return
    await supabase.from('referrals').update({ active: !referral.active, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  async function recordConversion(clientName: string, plan: string) {
    if (!referral) return
    const newConversions = referral.conversions + 1
    const newEarned = referral.total_earned + referral.commission_per_conversion
    await supabase.from('referrals').update({
      conversions: newConversions,
      total_earned: newEarned,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await supabase.from('referral_clicks').insert({
      referral_id: id,
      converted: true,
      converted_at: new Date().toISOString(),
      client_name: clientName,
      plan,
    })
    await load()
    setShowConversion(false)
  }

  async function markPaid(amount: number) {
    if (!referral) return
    await supabase.from('referrals').update({
      total_paid: referral.total_paid + amount,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await load()
    setShowPay(false)
  }

  function copyLink() {
    if (!referral) return
    navigator.clipboard.writeText(`${window.location.origin}/ref/${referral.code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!referral) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Referrer not found.</div>

  const owed = referral.total_earned - referral.total_paid
  const refUrl = typeof window !== 'undefined' ? `${window.location.origin}/ref/${referral.code}` : `/ref/${referral.code}`
  const qrUrl = `/api/qr?data=${encodeURIComponent(refUrl)}`

  return (
    <>
      <style>{`@media print {
        .no-print { display: none !important; }
        .print-flyer { display: block !important; }
        body { background: white !important; color: black !important; }
        .card-elevated { box-shadow: none !important; border: 1px solid #ddd !important; }
      }`}</style>

      {/* Breadcrumb */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/referrals" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Referrals</Link>
        <span className={`badge ${referral.active ? 'badge-green' : 'badge-white'}`}>{referral.active ? 'Active' : 'Inactive'}</span>
      </div>

      {/* Actions */}
      <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {!editing ? (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={saveEdits} disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); }}>Cancel</button>
          </>
        )}

        <button className="btn btn-ghost" onClick={copyLink} style={copied ? { color: '#22c55e' } : {}}>
          {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy link</>}
        </button>

        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Printer size={14} /> Print flyer
        </button>

        <button className="btn btn-ghost" onClick={() => setShowConversion(true)}>
          <TrendingUp size={14} /> Record signup
        </button>

        {owed > 0 && (
          <button className="btn btn-primary" onClick={() => setShowPay(true)}>
            <DollarSign size={14} /> Pay {formatMoney(owed)}
          </button>
        )}

        <button className="btn btn-ghost" onClick={toggleActive} style={{ marginLeft: 'auto' }}>
          {referral.active ? <><ToggleRight size={14} color="#22c55e" /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
        </button>
      </div>

      {/* Stats */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-tile">
          <div className="stat-value">{referral.clicks}</div>
          <div className="stat-label">Link Clicks</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{referral.conversions}</div>
          <div className="stat-label">Signups</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatMoney(referral.total_earned)}</div>
          <div className="stat-label">Total Earned</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatMoney(referral.total_paid)}</div>
          <div className="stat-label">Paid Out</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: owed > 0 ? '#f59e0b' : undefined }}>{formatMoney(owed)}</div>
          <div className="stat-label">Owed</div>
        </div>
      </div>

      {/* Detail card */}
      <div className="card-elevated" style={{ maxWidth: 720, marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem' }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Commission per Signup</label><input className="input" type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} /></div>
                <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div><label className="label">Notes</label><textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Name</p>
                <p style={{ fontWeight: 600 }}>{referral.name}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Code</p>
                <code style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{referral.code}</code>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Commission</p>
                <p style={{ fontWeight: 600 }}>{formatMoney(referral.commission_per_conversion)} / signup</p>
              </div>
              {referral.email && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Email</p>
                  <p>{referral.email}</p>
                </div>
              )}
              {referral.phone && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Phone</p>
                  <p>{referral.phone}</p>
                </div>
              )}
              {referral.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Notes</p>
                  <p style={{ color: 'var(--text-muted)' }}>{referral.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click log */}
      <div className="no-print">
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Activity Log</h2>
        {clicks.length === 0 ? (
          <div className="empty-state"><p>No clicks tracked yet. Share the link to start.</p></div>
        ) : (
          <div className="table-wrap" style={{ marginBottom: '2rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Converted</th>
                  <th>Client</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(c.created_at)}</td>
                    <td>
                      {c.converted
                        ? <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}><CheckCircle size={13} /> Yes</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: c.converted ? 500 : 400 }}>{c.client_name ?? '—'}</td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{c.plan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======= PRINTABLE FLYER ======= */}
      <div style={{
        display: 'none',
        maxWidth: 600,
        margin: '0 auto',
        padding: '3rem 2.5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'white',
        color: '#0d0d0d',
        textAlign: 'center',
      }}
        className="print-flyer"
      >
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '0.5rem' }}>PurePulse</div>
          <div style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: '2rem' }}>AI Agency Management</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Grow your business on autopilot.</div>
          <div style={{ fontSize: '1rem', color: '#444', lineHeight: 1.6 }}>
            AI-powered client management, invoicing, contracts, time tracking,<br />and more — built for modern agencies.
          </div>
        </div>

        {/* QR Code */}
        <div style={{ margin: '2.5rem auto', display: 'inline-block', padding: '1.25rem', border: '2px solid #e5e7eb', borderRadius: 16 }}>
          {!qrError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="Referral QR Code"
              width={220}
              height={220}
              onError={() => setQrError(true)}
            />
          ) : (
            <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8, fontSize: '0.75rem', color: '#888' }}>
              <div><AlertTriangle size={24} style={{ display: 'block', margin: '0 auto 0.5rem' }} />QR unavailable</div>
            </div>
          )}
        </div>

        {/* URL */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.375rem' }}>Scan or visit</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '0.02em', color: '#1a1a1a', background: '#f5f5f5', padding: '0.75rem 1.5rem', borderRadius: 10, display: 'inline-block' }}>
            {refUrl}
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          {[
            { name: 'Starter', price: '$299/mo' },
            { name: 'Growth', price: '$599/mo' },
            { name: 'Pro', price: '$999/mo' },
            { name: 'Elite', price: '$1,499/mo' },
          ].map(plan => (
            <div key={plan.name} style={{ padding: '0.75rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 10, minWidth: 110 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{plan.name}</div>
              <div style={{ color: '#555', fontSize: '0.875rem' }}>{plan.price}</div>
            </div>
          ))}
        </div>

        {/* Footer with referrer name */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', fontSize: '0.8125rem', color: '#888' }}>
          Referred by <strong style={{ color: '#1a1a1a' }}>{referral.name}</strong> · Code: <strong>{referral.code}</strong>
        </div>
      </div>

      {showConversion && (
        <ConversionModal onConfirm={recordConversion} onCancel={() => setShowConversion(false)} />
      )}
      {showPay && (
        <PayCommissionModal owed={owed} onConfirm={markPaid} onCancel={() => setShowPay(false)} />
      )}
    </>
  )
}
