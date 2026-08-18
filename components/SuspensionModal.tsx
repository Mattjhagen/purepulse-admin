'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Client } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { renderSuspensionEmailHtml, SuspensionEmailData } from '@/lib/suspension-email'
import { X, Ban, AlertTriangle, Eye, Settings2, Mail, CheckCircle2, ShieldAlert, DollarSign, Calculator } from 'lucide-react'

interface SuspensionModalProps {
  client: Client
  onClose: () => void
  onSuccess: (message: string) => void
}

export function SuspensionModal({ client, onClose, onSuccess }: SuspensionModalProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [error, setError] = useState('')

  // Form inputs
  const [websiteDomain, setWebsiteDomain] = useState('')
  const [amountDue, setAmountDue] = useState('1000')
  const [invoiceRef, setInvoiceRef] = useState('10-Month Term Unfulfilled ($100/mo × 10)')
  const [reason, setReason] = useState('Unfulfilled contract terms & delinquent account')
  const [customReason, setCustomReason] = useState('')
  const [terminationDays, setTerminationDays] = useState(14)
  const [paymentUrl, setPaymentUrl] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)

  // Server state
  const [detectedTotal, setDetectedTotal] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoices, setInvoices] = useState<any[]>([])

  // Load initial preview data from server
  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/clients/${client.id}/suspend`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load suspension preview')

      const initialDomain = data.emailData?.websiteDomain ?? ''
      setWebsiteDomain(initialDomain)
      setPaymentUrl(data.emailData?.paymentUrl ?? '')
      setDetectedTotal(data.totalOwed ?? 0)
      setInvoices(data.invoices ?? [])

      // If overdue invoices exist, use their total; otherwise default to 10-mo contract buyout ($1,000)
      if (data.totalOwed && data.totalOwed > 0) {
        setAmountDue(String(data.totalOwed))
        setInvoiceRef(data.invoices?.[0]?.invoiceNumber ?? 'INV-DELINQUENT')
      } else {
        setAmountDue('1000')
        setInvoiceRef('10-Month Contract Non-Fulfillment ($100/mo × 10)')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading preview')
    } finally {
      setLoading(false)
    }
  }, [client.id])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  // Real-time computed email HTML for Live Preview
  const computedPreviewHtml = useMemo(() => {
    const numAmount = Number(String(amountDue).replace(/[^0-9.]/g, '')) || 0
    const now = new Date()
    const suspensionDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const terminationDate = new Date(Date.now() + terminationDays * 86_400_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const finalReason = reason === 'custom' ? (customReason.trim() || 'Contractual non-fulfillment') : reason

    const emailData: SuspensionEmailData = {
      clientName: client.name,
      clientEmail: client.email,
      companyName: client.company,
      websiteDomain: websiteDomain || 'yourdomain.com',
      invoiceNumber: invoiceRef.trim() || 'CONTRACT-DELINQUENT',
      totalOwed: numAmount,
      maxDaysOverdue: 15,
      suspensionDate,
      terminationDate,
      reason: finalReason,
      paymentUrl: paymentUrl || 'https://login.purepulse.one/portal',
      portalUrl: 'https://login.purepulse.one/portal',
      invoices: [{
        invoiceNumber: invoiceRef.trim() || 'CONTRACT-DELINQUENT',
        total: numAmount,
        dueDate: now.toISOString(),
        daysOverdue: 15,
        paymentLink: paymentUrl || 'https://login.purepulse.one/portal',
      }],
      customNote: customNote.trim(),
    }

    return renderSuspensionEmailHtml(emailData)
  }, [amountDue, invoiceRef, client, websiteDomain, terminationDays, reason, customReason, paymentUrl, customNote])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const finalReason = reason === 'custom' ? (customReason.trim() || 'Contractual non-fulfillment') : reason

    try {
      const res = await fetch(`/api/clients/${client.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: finalReason,
          websiteDomain: websiteDomain.trim(),
          amountDue: Number(String(amountDue).replace(/[^0-9.]/g, '')) || 0,
          invoiceRef: invoiceRef.trim(),
          terminationDays,
          paymentUrl: paymentUrl.trim(),
          customNote: customNote.trim(),
          sendEmail,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to suspend client')

      const emailNote = data.emailSent
        ? 'Suspension notice email sent to client.'
        : sendEmail && data.emailError
          ? `Suspended, but email error: ${data.emailError}`
          : 'Suspended (email delivery skipped).'

      onSuccess(`Client suspended. ${emailNote}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend client')
      setSubmitting(false)
    }
  }

  async function handleSendTest() {
    setSendingTest(true)
    setTestMsg('')
    setError('')
    const finalReason = reason === 'custom' ? (customReason.trim() || 'Contractual non-fulfillment') : reason

    try {
      const res = await fetch(`/api/clients/${client.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTest: true,
          reason: finalReason,
          websiteDomain: websiteDomain.trim(),
          amountDue: Number(String(amountDue).replace(/[^0-9.]/g, '')) || 0,
          invoiceRef: invoiceRef.trim(),
          terminationDays,
          paymentUrl: paymentUrl.trim(),
          customNote: customNote.trim(),
          sendEmail: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed sending test email')
      setTestMsg('✅ Test email sent to your inbox (matty@purepulse.one)!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed sending test email')
    } finally {
      setSendingTest(false)
    }
  }

  const currentNumAmount = Number(String(amountDue).replace(/[^0-9.]/g, '')) || 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: activeTab === 'preview' ? '880px' : '640px',
          width: '95%',
          transition: 'max-width 0.25s ease',
          padding: '1.75rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <ShieldAlert size={18} color="#ef4444" />
            </div>
            <div>
              <h2 className="modal-title" style={{ marginBottom: '2px', fontSize: '1.25rem', fontWeight: 800 }}>
                Suspend Client Services
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {client.name} &middot; <span style={{ color: '#ef4444', fontWeight: 700 }}>{formatMoney(currentNumAmount)} balance due</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'config' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('config')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Settings2 size={13} /> Configure Details
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('preview')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Eye size={13} /> Live Email Preview ({formatMoney(currentNumAmount)})
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <span className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Preparing suspension details &amp; invoices...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {activeTab === 'config' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                {/* Warning Alert */}
                <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'rgba(244, 244, 255, 0.8)' }}>
                    Suspending this client will take their public website offline, halt maintenance, and notify <strong style={{ color: '#fff' }}>{client.email}</strong> with settlement instructions for <strong style={{ color: '#FF6B6B' }}>{formatMoney(currentNumAmount)}</strong>.
                  </div>
                </div>

                {/* Amount Due & Reference Inputs */}
                <div style={{ background: 'rgba(123, 47, 255, 0.06)', border: '1px solid rgba(123, 47, 255, 0.25)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FF6B6B', marginBottom: '0.375rem' }}>
                        Total Balance Due ($ USD) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        required
                        value={amountDue}
                        onChange={e => setAmountDue(e.target.value)}
                        placeholder="1000.00"
                        style={{ fontSize: '1.125rem', fontWeight: 800, color: '#FF6B6B' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                        Item / Contract Description *
                      </label>
                      <input
                        type="text"
                        className="input"
                        required
                        value={invoiceRef}
                        onChange={e => setInvoiceRef(e.target.value)}
                        placeholder="e.g. 10-Month Contract Term ($100/mo × 10)"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Quick Presets:</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#A066FF', borderColor: 'rgba(160, 102, 255, 0.3)' }}
                      onClick={() => {
                        setAmountDue('1000')
                        setInvoiceRef('10-Month Contract Term Non-Fulfillment ($100/mo × 10)')
                      }}
                    >
                      $1,000 (10 Months Left @ $100/mo)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '3px 8px', color: 'var(--text-muted)' }}
                      onClick={() => {
                        setAmountDue('100')
                        setInvoiceRef('Monthly Maintenance & Hosting ($100.00)')
                      }}
                    >
                      $100 (1 Month)
                    </button>
                    {detectedTotal > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#f59e0b' }}
                        onClick={() => {
                          setAmountDue(String(detectedTotal))
                          setInvoiceRef(invoices[0]?.invoiceNumber ?? 'INV-DELINQUENT')
                        }}
                      >
                        {formatMoney(detectedTotal)} (Delinquent Invoices)
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid row 1: Target Domain & Termination Grace Period */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Target Website / Domain *
                    </label>
                    <input
                      className="input"
                      required
                      value={websiteDomain}
                      onChange={e => setWebsiteDomain(e.target.value)}
                      placeholder="e.g. schmidtconstruction.com"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Data Retention Deadline
                    </label>
                    <select
                      className="input"
                      value={terminationDays}
                      onChange={e => setTerminationDays(Number(e.target.value))}
                    >
                      <option value={7}>7 Days (Immediate risk)</option>
                      <option value={14}>14 Days (Standard grace)</option>
                      <option value={30}>30 Days (Extended)</option>
                      <option value={60}>60 Days</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Reason for Suspension *
                  </label>
                  <select
                    className="input"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  >
                    <option value="Unfulfilled contract terms & delinquent account">Unfulfilled contract terms &amp; delinquent account</option>
                    <option value="Overdue balance & contractual non-fulfillment">Overdue balance &amp; contractual non-fulfillment</option>
                    <option value="Breach of PurePulse Website Service Agreement">Breach of PurePulse Website Service Agreement</option>
                    <option value="Non-payment of monthly maintenance & hosting plan">Non-payment of monthly maintenance &amp; hosting plan</option>
                    <option value="custom">Custom Reason...</option>
                  </select>
                </div>

                {reason === 'custom' && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Custom Reason Details
                    </label>
                    <input
                      className="input"
                      required
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      placeholder="Specify custom contractual or payment violation..."
                    />
                  </div>
                )}

                {/* Payment Checkout URL */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment Checkout / Stripe / Portal Link
                  </label>
                  <input
                    className="input"
                    value={paymentUrl}
                    onChange={e => setPaymentUrl(e.target.value)}
                    placeholder="https://buy.stripe.com/... or https://login.purepulse.one/portal"
                  />
                </div>

                {/* Optional Custom Note */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Optional Note in Email (Client-facing)
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    placeholder="e.g. Contract buyout terms require settling the remaining 10 months of services ($1,000.00) to transfer website files."
                  />
                </div>

                {/* Checkbox: Send Email */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={e => setSendEmail(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#7B2FFF' }}
                  />
                  <span>Send official suspension notice email to <strong style={{ color: '#00D4FF' }}>{client.email}</strong></span>
                </label>
              </div>
            ) : (
              /* Tab 2: Live HTML Email Preview */
              <div>
                <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Recipient: <strong style={{ color: 'var(--text)' }}>{client.email}</strong> &middot; Subject: <strong style={{ color: '#ef4444' }}>URGENT: Website Services Suspended — {websiteDomain}</strong>
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FF6B6B' }}>
                    Total: {formatMoney(currentNumAmount)}
                  </span>
                </div>
                <div style={{ width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: '#07070D' }}>
                  <iframe
                    title="Suspension Email Preview"
                    srcDoc={computedPreviewHtml}
                    style={{ width: '100%', height: '100%', border: 'none', background: '#07070D' }}
                  />
                </div>
              </div>
            )}

            {testMsg && (
              <div style={{ marginTop: '1rem', padding: '8px 12px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.8125rem' }}>
                {testMsg}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap' }}>
              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSendTest}
                  disabled={sendingTest || submitting}
                  style={{ color: '#00D4FF', borderColor: 'rgba(0, 212, 255, 0.3)' }}
                >
                  {sendingTest ? <span className="spinner" /> : <><Mail size={13} style={{ marginRight: '4px' }} /> Send test to my email</>}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting}
                  style={{
                    background: '#ef4444',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  {submitting ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      <Ban size={14} style={{ marginRight: '4px' }} />
                      {sendEmail ? `Suspend & Send Notice (${formatMoney(currentNumAmount)})` : 'Suspend Without Email'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
