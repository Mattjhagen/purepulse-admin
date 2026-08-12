'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, formatMoney } from '@/lib/utils'
import {
  ChevronLeft, Gift, MousePointer, CheckCircle, DollarSign,
  Edit3, Save, X, AlertTriangle, Printer, Copy, ToggleLeft, ToggleRight,
  TrendingUp, Landmark
} from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'

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
  const [connecting, setConnecting] = useState(false)
  const [connectMsg, setConnectMsg] = useState('')
  const [payingViaStripe, setPayingViaStripe] = useState(false)
  const [payoutError, setPayoutError] = useState('')

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

        <button className="btn btn-ghost" onClick={toggleActive} style={{ marginLeft: 'auto' }}>
          {referral.active ? <><ToggleRight size={14} color="#22c55e" /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
        </button>
      </div>

      {(connectMsg || payoutError) && (
        <div className="no-print" style={{ marginTop: '-1.25rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: payoutError ? '#ef4444' : 'var(--text-muted)' }}>
          {payoutError || connectMsg}
        </div>
      )}

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

      {/* ======= PRINTABLE FLYER — matches marketing/purepulse-web-design-poster-letter.pdf ======= */}
      <div style={{
        display: 'none',
        width: 600,
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
        background: '#08060d',
        color: '#fff',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
      }}
        className="print-flyer"
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(circle at 72% 8%, rgba(123,47,255,0.28), transparent 55%), radial-gradient(circle at 8% 60%, rgba(0,212,255,0.14), transparent 50%)',
        }} />

        <div style={{ position: 'relative', padding: '2.5rem 2.5rem 0' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.12)', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Pure<span style={{ color: '#A066FF' }}>Pulse</span></div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>WEB DESIGN &amp; DEVELOPMENT</div>
          </div>

          {/* Headline */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.08em', color: '#A066FF', marginBottom: '0.75rem' }}>YOUR NEXT WEBSITE SHOULD</div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
              MOVE<br /><span style={{ color: '#A066FF' }}>PEOPLE</span><br />FORWARD.
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Sharp aesthetics. Clean code. A website built to perform<br />and built to last.
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
            <span style={{ display: 'inline-block', background: 'rgba(123,47,255,0.18)', border: '1px solid rgba(123,47,255,0.4)', borderRadius: 100, padding: '0.625rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              PROFESSIONAL WEBSITES FROM A $150 DEPOSIT
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '2.25rem' }}>
            {[
              { label: 'DESIGN', desc: 'A distinctive digital presence', color: '#A066FF' },
              { label: 'BUILD', desc: 'Fast, clean, responsive foundations', color: '#00D4FF' },
              { label: 'LAUNCH', desc: 'A site ready to make an impression', color: '#A066FF' },
            ].map(step => (
              <div key={step.label} style={{ textAlign: 'left', maxWidth: 150 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: step.color, display: 'inline-block' }} />
                  {step.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA card — QR is unique per referrer, encodes /ref/{code} for commission tracking */}
        <div style={{ position: 'relative', margin: '0 1.5rem 1.5rem', background: 'rgba(123,47,255,0.1)', border: '1px solid rgba(123,47,255,0.3)', borderRadius: 20, padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>Make your next move.</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>Scan to explore the work and start a conversation.</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#00D4FF' }}>purepulse.one</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/referral-mascot.png" alt="" width={80} height={102} style={{ flexShrink: 0, objectFit: 'contain' }} />
          <div style={{ background: '#fff', borderRadius: 14, padding: '0.75rem', flexShrink: 0, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {!qrError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="Referral QR Code" width={130} height={130} onError={() => setQrError(true)} />
            ) : (
              <div style={{ width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                <AlertTriangle size={20} />
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'relative', textAlign: 'center', fontSize: '0.6875rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.35)', paddingBottom: '1.25rem' }}>
          PUREPULSE.ONE · DESIGN THAT MOVES PEOPLE FORWARD
        </div>

        {/* Referrer attribution — not part of the brand poster, kept for your own tracking reference */}
        <div style={{ position: 'relative', textAlign: 'center', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0 1.5rem', padding: '0.75rem 0 1.5rem' }}>
          Referred by <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{referral.name}</strong> · Code <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{referral.code}</strong>
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
