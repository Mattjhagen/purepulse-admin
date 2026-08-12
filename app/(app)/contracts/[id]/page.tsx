'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Client } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, planBadgeClass, planLabel } from '@/lib/utils'
import { ChevronLeft, Printer, Send, CheckCircle, XCircle, Edit3, Save, Mail, Link2, Copy, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

function TerminateDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Terminate Contract</h2>
        </div>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          This will mark the contract as terminated. The client will no longer be bound by this agreement. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Yes, terminate</button>
        </div>
      </div>
    </div>
  )
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showTerminate, setShowTerminate] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('contracts').select('*, clients(*)').eq('id', id).single()
    setContract(data)
    setContent(data?.content ?? '')
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  async function saveContent() {
    setSaving(true)
    await supabase.from('contracts').update({ content, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
    setEditing(false)
    setSaving(false)
  }

  async function sendForSigning() {
    setSending(true)
    setSendMsg(null)
    const res = await fetch(`/api/contracts/${id}/send`, { method: 'POST' })
    const data = await res.json()
    if (data.error) {
      setSendMsg({ type: 'err', text: data.error })
    } else {
      setSendMsg({ type: 'ok', text: 'Email sent — contract is now awaiting signature.' })
      await load()
    }
    setSending(false)
  }

  async function updateStatus(status: string, extra: Record<string, unknown> = {}) {
    await supabase.from('contracts').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', id)
    await load()
  }

  function copySigningLink() {
    const url = `${window.location.origin}/sign/${contract.signature_token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!contract) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Contract not found.</div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients as Client | null

  const isSigned = ['signed', 'active'].includes(contract.status)
  const isTerminated = ['terminated', 'expired'].includes(contract.status)
  const canSend = ['draft', 'sent'].includes(contract.status)
  const hasSigningLink = !!contract.signature_token && !isSigned && !isTerminated

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Breadcrumb + badges */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/contracts" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Contracts</Link>
        <span className={statusBadgeClass(contract.status)}>{contract.status}</span>
        <span className={planBadgeClass(contract.plan)}>{planLabel(contract.plan)}</span>
      </div>

      {/* Signing link banner */}
      {hasSigningLink && (
        <div className="no-print" style={{ marginBottom: '1rem', padding: '12px 16px', borderRadius: 8, background: 'rgba(123,47,255,0.08)', border: '1px solid rgba(123,47,255,0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link2 size={15} style={{ color: '#7B2FFF', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {window?.location?.origin ?? ''}/sign/{contract.signature_token}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={copySigningLink}
            style={copiedLink ? { color: '#22c55e' } : {}}
          >
            {copiedLink ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
          </button>
        </div>
      )}

      {/* Signed / active notice */}
      {isSigned && (
        <div style={{ marginBottom: '1rem', padding: '12px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: '#22c55e', fontWeight: 500 }}>
            {contract.status === 'active' ? 'Active — signed' : 'Signed'} by <strong>{contract.signed_by}</strong>
            {contract.signed_at && <> on {new Date(contract.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</>}
          </span>
        </div>
      )}

      {/* Feedback message */}
      {sendMsg && (
        <div style={{
          marginBottom: '1rem', padding: '10px 16px', borderRadius: 8, fontSize: '0.875rem',
          background: sendMsg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: sendMsg.type === 'ok' ? '#22c55e' : '#ef4444',
          border: `1px solid ${sendMsg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {sendMsg.text}
        </div>
      )}

      {/* Actions */}
      <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {!editing ? (
          <button className="btn btn-ghost" onClick={() => setEditing(true)} disabled={isSigned || isTerminated}>
            <Edit3 size={14} /> Edit content
          </button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={saveContent} disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setContent(contract.content) }}>Cancel</button>
          </>
        )}

        <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>

        {canSend && (
          <button className="btn btn-ghost" onClick={sendForSigning} disabled={sending}>
            <Mail size={14} /> {sending ? 'Sending…' : contract.status === 'sent' ? 'Resend email' : 'Email to client'}
          </button>
        )}

        {contract.status === 'draft' && (
          <button className="btn btn-ghost" onClick={() => updateStatus('sent')}>
            <Send size={14} /> Mark sent
          </button>
        )}

        {contract.status === 'sent' && (
          <button className="btn btn-ghost" onClick={() => updateStatus('signed', { signed_at: new Date().toISOString(), signed_by: client?.name })}>
            <CheckCircle size={14} /> Mark signed
          </button>
        )}

        {(contract.status === 'signed') && (
          <button className="btn btn-ghost" onClick={() => updateStatus('active')}>
            <CheckCircle size={14} /> Mark active
          </button>
        )}

        {!isTerminated && (
          <button className="btn btn-danger" onClick={() => setShowTerminate(true)}>
            <XCircle size={14} /> Terminate
          </button>
        )}
      </div>

      {/* Contract document */}
      <div id="contract-print" className="card-elevated" style={{ maxWidth: '760px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.5rem 1.5rem 0' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Client</p>
            <p style={{ fontWeight: 600 }}>{client?.name}</p>
            {client?.email && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{client.email}</p>}
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Plan</p>
            <p style={{ fontWeight: 600 }}>{planLabel(contract.plan)} — {formatMoney(contract.monthly_rate)}/mo</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Hourly Rate</p>
            <p style={{ fontWeight: 600 }}>{formatMoney(contract.hourly_rate)}/hr</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Start Date</p>
            <p style={{ fontWeight: 600 }}>{formatDate(contract.start_date)}</p>
          </div>
          {contract.end_date && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>End Date</p>
              <p style={{ fontWeight: 600 }}>{formatDate(contract.end_date)}</p>
            </div>
          )}
          {contract.signed_at && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Signed</p>
              <p style={{ fontWeight: 600, color: '#22c55e' }}>{formatDate(contract.signed_at)}</p>
            </div>
          )}
          {contract.signature_data && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Signature</p>
              <img
                src={contract.signature_data}
                alt={`Signature of ${contract.signed_by}`}
                style={{ maxWidth: 280, height: 80, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6, background: '#fff', padding: '4px 8px' }}
              />
            </div>
          )}
        </div>

        <hr className="divider" style={{ margin: '0 1.5rem' }} />

        <div style={{ padding: '1.5rem' }}>
          {editing ? (
            <textarea
              className="input"
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ minHeight: '600px', fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.8 }}
            />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9375rem', lineHeight: 1.8, color: 'var(--text)' }}>
              {contract.content}
            </pre>
          )}
        </div>
      </div>

      {showTerminate && (
        <TerminateDialog
          onConfirm={async () => { setShowTerminate(false); await updateStatus('terminated') }}
          onCancel={() => setShowTerminate(false)}
        />
      )}
    </>
  )
}
