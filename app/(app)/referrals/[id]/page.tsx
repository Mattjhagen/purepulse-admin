'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { formatDate, formatMoney } from '@/lib/utils'
import {
  ChevronLeft, Gift, MousePointer, CheckCircle, DollarSign,
  Edit3, Save, X, AlertTriangle, Printer, Copy, ToggleLeft, ToggleRight,
  TrendingUp, Landmark, Eye, EyeOff, ExternalLink, Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

type Referral = {
  id: string; name: string; email: string | null; phone: string | null
  code: string; clicks: number; conversions: number
  commission_per_conversion: number; total_earned: number; total_paid: number
  notes: string | null; active: boolean; created_at: string; updated_at: string
  stripe_account_id: string | null; stripe_payouts_enabled: boolean
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
    if (!clientName.trim()) return
    setSaving(true)
    await onConfirm(clientName.trim(), plan)
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Record Client Signup</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Record a new client attributed to this referrer.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="label">Client Name / Business *</label>
            <input className="input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Inc." />
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const printMode = searchParams.get('print') === '1'
  const [referral, setReferral] = useState<Referral | null>(null)
  const [clicks, setClicks] = useState<Click[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', commission: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConversion, setShowConversion] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrError, setQrError] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectMsg, setConnectMsg] = useState('')
  const [payingViaStripe, setPayingViaStripe] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/referrals/${id}`)
      if (!res.ok) { setLoading(false); return }
      const { referral: r, clicks: c } = await res.json()
      setReferral(r as Referral)
      setClicks((c ?? []) as Click[])
      if (r) setForm({ name: r.name, email: r.email ?? '', phone: r.phone ?? '', commission: r.commission_per_conversion.toString(), notes: r.notes ?? '' })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (printMode && referral) setTimeout(() => window.print(), 600)
  }, [printMode, referral])

  async function saveEdits() {
    setSaving(true)
    try {
      const res = await fetch(`/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          commission_per_conversion: parseFloat(form.commission) || 50,
          notes: form.notes.trim() || null,
        }),
      })
      if (res.ok) {
        await load()
        setEditing(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    if (!referral || togglingActive) return
    const newActive = !referral.active
    setTogglingActive(true)
    setReferral(r => r ? { ...r, active: newActive } : null)
    try {
      const res = await fetch(`/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      })
      if (!res.ok) {
        throw new Error('Failed to update status')
      }
      await load()
    } catch (e) {
      console.error(e)
      setReferral(r => r ? { ...r, active: !newActive } : null)
    } finally {
      setTogglingActive(false)
    }
  }

  async function recordConversion(clientName: string, plan: string) {
    if (!referral) return
    try {
      const res = await fetch(`/api/referrals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, plan }),
      })
      if (res.ok) {
        await load()
        setShowConversion(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function sendConnectLink() {
    setConnecting(true)
    setConnectMsg('')
    try {
      const res = await fetch(`/api/referrals/${id}/connect`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to create payout setup link.')
      setConnectMsg(result.emailed ? 'Setup link emailed to them.' : 'Setup link created — copy it from their email, or share it directly.')
      if (!result.emailed && result.url) {
        navigator.clipboard.writeText(result.url)
        setConnectMsg('No email on file — link copied to your clipboard instead.')
      }
      await load()
    } catch (err) {
      setConnectMsg(err instanceof Error ? err.message : 'Failed to create payout setup link.')
    } finally {
      setConnecting(false)
    }
  }

  async function payViaStripe() {
    if (!referral || owed <= 0) return
    if (!confirm(`Send ${formatMoney(owed)} to ${referral.name} via Stripe?`)) return
    setPayingViaStripe(true)
    setPayoutError('')
    try {
      const res = await fetch(`/api/referrals/${id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: owed }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Payout failed.')
      await load()
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : 'Payout failed.')
    } finally {
      setPayingViaStripe(false)
    }
  }

  async function markPaid(amount: number) {
    if (!referral) return
    try {
      const res = await fetch(`/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_paid: (referral.total_paid || 0) + amount,
        }),
      })
      if (res.ok) {
        await load()
        setShowPay(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteAffiliate() {
    if (!referral || deleting) return
    if (!confirm(`Are you sure you want to delete "${referral.name}" and all associated test records? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/referrals/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error || 'Failed to delete affiliate.')
        setDeleting(false)
      } else {
        router.push('/referrals')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to delete affiliate.')
      setDeleting(false)
    }
  }

  function copyLink() {
    if (!referral) return
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://login.purepulse.one')
    navigator.clipboard.writeText(`${appOrigin}/ref/${referral.code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!referral) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Referrer not found.</div>

  const owed = referral.total_earned - referral.total_paid
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://login.purepulse.one')
  const refUrl = `${appOrigin}/ref/${referral.code}`
  const qrUrl = `/api/qr?data=${encodeURIComponent(refUrl)}`

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            background: #08060d !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          .no-print,
          nav,
          aside,
          header,
          .desktop-nav,
          .app-header {
            display: none !important;
          }
          .app-main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .print-flyer-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-flyer {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 3.5rem 3.75rem 2.25rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            border-radius: 0 !important;
            background: #08060d !important;
            position: relative !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* ADMIN PORTAL VIEW (HIDDEN ON PRINT) */}
      {/* ========================================================================= */}
      <div className="no-print">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/referrals" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Affiliates</Link>
          <button
            onClick={toggleActive}
            disabled={togglingActive}
            className={`badge ${referral.active ? 'badge-green' : 'badge-white'}`}
            style={{ cursor: 'pointer', border: 'none', background: referral.active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)' }}
            title="Click to toggle active/inactive status"
          >
            {togglingActive ? 'UPDATING...' : referral.active ? 'ACTIVE' : 'INACTIVE'}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
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

          <button className="btn btn-ghost" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <><EyeOff size={14} /> Hide flyer</> : <><Eye size={14} /> Preview flyer</>}
          </button>

          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={14} /> Print flyer
          </button>

          <button className="btn btn-ghost" onClick={() => setShowConversion(true)}>
            <TrendingUp size={14} /> Record signup
          </button>

          {referral.stripe_payouts_enabled ? (
            owed > 0 && (
              <button className="btn btn-primary" onClick={payViaStripe} disabled={payingViaStripe}>
                {payingViaStripe ? <span className="spinner" /> : <><Landmark size={14} /> Pay {formatMoney(owed)} via Stripe</>}
              </button>
            )
          ) : (
            <button className="btn btn-ghost" onClick={sendConnectLink} disabled={connecting}>
              {connecting ? <span className="spinner" /> : <><Landmark size={14} /> {referral.stripe_account_id ? 'Resend payout setup link' : 'Set up payouts'}</>}
            </button>
          )}

          {owed > 0 && (
            <button className="btn btn-ghost" onClick={() => setShowPay(true)}>
              <DollarSign size={14} /> Mark {formatMoney(owed)} paid manually
            </button>
          )}

          <button
            className="btn btn-ghost"
            onClick={deleteAffiliate}
            disabled={deleting}
            style={{ color: '#ef4444' }}
            title="Delete this affiliate and associated test records"
          >
            {deleting ? <span className="spinner" /> : <><Trash2 size={14} /> Delete</>}
          </button>

          <button
            className="btn btn-ghost"
            onClick={toggleActive}
            disabled={togglingActive}
            style={{ marginLeft: 'auto' }}
            title="Toggle affiliate active / inactive"
          >
            {togglingActive ? (
              <span className="spinner" />
            ) : referral.active ? (
              <><ToggleRight size={16} color="#22c55e" /> <span style={{ color: '#22c55e', fontWeight: 600 }}>Active</span></>
            ) : (
              <><ToggleLeft size={16} color="var(--text-muted)" /> <span style={{ color: 'var(--text-muted)' }}>Inactive</span></>
            )}
          </button>
        </div>

        {(connectMsg || payoutError) && (
          <div style={{ marginTop: '-1.25rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: payoutError ? '#ef4444' : 'var(--text-muted)' }}>
            {payoutError || connectMsg}
          </div>
        )}

        {/* Live On-Screen Preview of Full Flyer */}
        {showPreview && (
          <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Flyer Preview (Full Letter Page)
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={13} /> Print Full Page
              </button>
            </div>
            <div style={{ maxWidth: 640, margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', borderRadius: 20, overflow: 'hidden' }}>
              {renderFlyerContent(referral, refUrl, qrUrl, qrError, setQrError)}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Unique QR Affiliate Link</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '0.8125rem', color: '#00D4FF', background: 'rgba(0,212,255,0.06)', padding: '4px 8px', borderRadius: 4 }}>
                      {refUrl}
                    </code>
                    <a href={refUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      Visit <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
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

        {/* Activity log */}
        <div>
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
      </div>

      {/* ========================================================================= */}
      {/* FULL-PAGE PRINTABLE FLYER (EXACTLY 1 LETTER PAGE) */}
      {/* ========================================================================= */}
      <div className="print-flyer-wrapper" style={{ display: 'none' }}>
        {renderFlyerContent(referral, refUrl, qrUrl, qrError, setQrError)}
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

function renderFlyerContent(
  referral: Referral,
  refUrl: string,
  qrUrl: string,
  qrError: boolean,
  setQrError: (val: boolean) => void
) {
  return (
    <div
      className="print-flyer"
      style={{
        width: '100%',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Space Grotesk", sans-serif',
        background: '#08060d',
        color: '#ffffff',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 3.25rem 2rem',
        minHeight: '100%',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 75% 10%, rgba(123,47,255,0.32), transparent 55%), radial-gradient(circle at 10% 65%, rgba(0,212,255,0.18), transparent 50%), radial-gradient(circle at 50% 95%, rgba(123,47,255,0.2), transparent 50%)',
        }}
      />

      {/* TOP SECTION */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Brand Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
            Pure<span style={{ color: '#A066FF' }}>Pulse</span>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
            WEB DESIGN &amp; DEVELOPMENT
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.12em', color: '#A066FF', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            YOUR NEXT WEBSITE SHOULD
          </div>
          <div style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.035em', marginBottom: '1.25rem' }}>
            MOVE<br />
            <span style={{ color: '#A066FF' }}>PEOPLE</span><br />
            FORWARD.
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.0625rem', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 1.5rem' }}>
            Sharp aesthetics. Clean code. A website built to perform<br />and built to last.
          </div>
          <div>
            <span style={{ display: 'inline-block', background: 'rgba(123,47,255,0.2)', border: '1px solid rgba(160,102,255,0.5)', borderRadius: 100, padding: '0.625rem 1.75rem', fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.06em', color: '#ffffff' }}>
              PROFESSIONAL WEBSITES FROM A $150 DEPOSIT
            </span>
          </div>
        </div>

        {/* 3 Step Process */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'DESIGN', desc: 'A distinctive digital presence', color: '#A066FF' },
            { label: 'BUILD', desc: 'Fast, clean, responsive foundations', color: '#00D4FF' },
            { label: 'LAUNCH', desc: 'A site ready to make an impression', color: '#A066FF' },
          ].map(step => (
            <div key={step.label} style={{ textAlign: 'left', minWidth: 140, maxWidth: 165 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: step.color, display: 'inline-block' }} />
                {step.label}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM SECTION: CTA Card + QR + Tracking Footer */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* CTA Card with unique Affiliate QR */}
        <div
          style={{
            background: 'rgba(123,47,255,0.12)',
            border: '1px solid rgba(160,102,255,0.4)',
            borderRadius: 22,
            padding: '1.5rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '1rem',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              Make your next move.
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              Scan to explore our work and start a conversation.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#00D4FF', letterSpacing: '-0.01em' }}>
                purepulse.one
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}>
                Partner Code: <strong style={{ color: '#A066FF' }}>{referral.code}</strong>
              </span>
            </div>
          </div>

          {/* Mascot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/referral-mascot.png" alt="" width={85} height={108} style={{ flexShrink: 0, objectFit: 'contain' }} />

          {/* QR Code Container */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '0.75rem',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {!qrError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt={`Referral QR Code for ${referral.code}`}
                width={130}
                height={130}
                onError={() => setQrError(true)}
                style={{ display: 'block' }}
              />
            ) : (
              <div style={{ width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                <AlertTriangle size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Footer Brand & Partner Info */}
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.85rem' }}>
          <div style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            PUREPULSE.ONE · DESIGN THAT MOVES PEOPLE FORWARD
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Referred by <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{referral.name}</strong> · Partner Code <strong style={{ color: '#A066FF' }}>{referral.code}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
