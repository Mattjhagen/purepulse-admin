'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Contract, Client } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass, planBadgeClass, planLabel } from '@/lib/utils'
import { ChevronLeft, Printer, Send, CheckCircle, XCircle, Edit3, Save, Mail, Link2 } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

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

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!contract) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Contract not found.</div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(contract.clients) ? (contract.clients as any[])[0] : contract.clients as Client | null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/contracts" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Contracts</Link>
        <span className={statusBadgeClass(contract.status)}>{contract.status}</span>
        <span className={planBadgeClass(contract.plan)}>{planLabel(contract.plan)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {!editing ? (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit content</button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={saveContent} disabled={saving}>{saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}</button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setContent(contract.content) }}>Cancel</button>
          </>
        )}
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
        {['draft', 'sent'].includes(contract.status) && (
          <button className="btn btn-success" onClick={sendForSigning} disabled={sending}>
            <Mail size={14} /> {sending ? 'Sending…' : 'Email to Client'}
          </button>
        )}
        {contract.signature_token && (
          <button className="btn btn-ghost" onClick={() => {
            const url = `${window.location.origin}/sign/${contract.signature_token}`
            navigator.clipboard.writeText(url)
            setSendMsg({ type: 'ok', text: 'Signing link copied to clipboard.' })
          }}>
            <Link2 size={14} /> Copy Signing Link
          </button>
        )}
        {contract.status === 'draft' && <button className="btn btn-ghost" onClick={() => updateStatus('sent')}><Send size={14} /> Mark Sent</button>}
        {contract.status === 'sent' && (
          <>
            <button className="btn btn-success" onClick={() => updateStatus('signed', { signed_at: new Date().toISOString(), signed_by: client?.name })}>
              <CheckCircle size={14} /> Mark Signed
            </button>
          </>
        )}
        {!['terminated', 'expired'].includes(contract.status) && (
          <button className="btn btn-danger" onClick={() => updateStatus('terminated')}><XCircle size={14} /> Terminate</button>
        )}
      </div>

      {/* Send feedback */}
      {sendMsg && (
        <div style={{
          marginBottom: '1rem',
          padding: '10px 16px',
          borderRadius: 8,
          fontSize: '0.875rem',
          background: sendMsg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: sendMsg.type === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
          border: `1px solid ${sendMsg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {sendMsg.text}
        </div>
      )}

      {/* Signed notice */}
      {contract.status === 'signed' && (
        <div style={{ marginBottom: '1rem', padding: '12px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--accent-green)', fontWeight: 500 }}>
            Signed by <strong>{contract.signed_by}</strong> on {new Date(contract.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      )}

      {/* Contract doc */}
      <div id="contract-print" className="card-elevated" style={{ maxWidth: '760px' }}>
        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.5rem 1.5rem 0' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Client</p>
            <p style={{ fontWeight: 600 }}>{client?.name}</p>
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
          {contract.signed_at && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Signed</p>
              <p style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{formatDate(contract.signed_at)}</p>
            </div>
          )}
        </div>

        <hr className="divider" style={{ margin: '0 1.5rem' }} />

        {/* Content */}
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
    </>
  )
}
