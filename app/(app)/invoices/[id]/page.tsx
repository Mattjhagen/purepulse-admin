'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { InvoiceLineItem } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass } from '@/lib/utils'
import { Printer, Plus, Trash2, ChevronLeft, Save, Send, Link2, CheckCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoice, setInvoice] = useState<any>(null)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const load = useCallback(async () => {
    const [invRes, itemsRes] = await Promise.all([
      supabase.from('invoices').select('*, clients(*)').eq('id', id).single(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
    ])
    setInvoice(invRes.data)
    setTaxRate(invRes.data?.tax_rate ?? 0)
    setDiscount(invRes.data?.discount ?? 0)
    setNotes(invRes.data?.notes ?? '')
    setLineItems(itemsRes.data ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  function addLineItem() {
    const newItem: InvoiceLineItem = {
      id: `temp-${Date.now()}`,
      invoice_id: id,
      type: 'other',
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      sort_order: lineItems.length,
      created_at: new Date().toISOString(),
    }
    setLineItems(items => [...items, newItem])
  }

  function updateItem(itemId: string, k: string, v: string | number) {
    setLineItems(items => items.map(item => {
      if (item.id !== itemId) return item
      const updated = { ...item, [k]: v }
      if (k === 'quantity' || k === 'unit_price') {
        updated.total = updated.quantity * updated.unit_price
      }
      return updated
    }))
  }

  function removeItem(itemId: string) {
    setLineItems(items => items.filter(i => i.id !== itemId))
  }

  async function save() {
    setSaving(true)
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount - discount

    await supabase.from('invoices').update({
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, discount, total,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    const existing = lineItems.filter(i => !i.id.startsWith('temp-'))
    const newItems = lineItems.filter(i => i.id.startsWith('temp-'))

    for (const item of existing) {
      await supabase.from('invoice_line_items').update({
        type: item.type, description: item.description, quantity: item.quantity, unit_price: item.unit_price, total: item.total,
      }).eq('id', item.id)
    }
    if (newItems.length > 0) {
      await supabase.from('invoice_line_items').insert(newItems.map(({ id: _, ...rest }) => ({ ...rest, invoice_id: id })))
    }

    await load()
    setSaving(false)
  }

  async function updateStatus(status: string) {
    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  async function generatePayLink() {
    setActionError('')
    setGeneratingLink(true)
    try {
      const res = await fetch(`/api/invoices/${id}/pay-link`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to generate payment link.')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed.')
    } finally {
      setGeneratingLink(false)
    }
  }

  async function sendToClient() {
    setActionError('')
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to send invoice.')
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 3000)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed.')
    } finally {
      setSendingEmail(false)
    }
  }

  function copyLink() {
    if (!invoice?.stripe_payment_link) return
    navigator.clipboard.writeText(invoice.stripe_payment_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!invoice) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Invoice not found.</div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients as any
  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - discount
  const isEditable = !['paid', 'void'].includes(invoice.status)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/invoices" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Invoices</Link>
        <span className={statusBadgeClass(invoice.status)}>{invoice.status}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: 'auto', fontFamily: 'monospace' }}>{invoice.invoice_number}</span>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isEditable && (
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>

          {/* Generate Stripe link */}
          {isEditable && !invoice.stripe_payment_link && total > 0 && (
            <button className="btn btn-ghost" onClick={generatePayLink} disabled={generatingLink}>
              {generatingLink ? <span className="spinner" /> : <><Link2 size={14} /> Generate payment link</>}
            </button>
          )}

          {/* Send to client (generates link + emails) */}
          {isEditable && total > 0 && (
            <button className="btn btn-success" onClick={sendToClient} disabled={sendingEmail} style={emailSent ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' } : {}}>
              {sendingEmail
                ? <span className="spinner" />
                : emailSent
                  ? <><CheckCircle size={14} /> Sent!</>
                  : <><Mail size={14} /> {invoice.status === 'draft' ? 'Send to client' : 'Resend to client'}</>}
            </button>
          )}

          {/* Mark paid manually */}
          {invoice.status === 'sent' && (
            <button className="btn btn-ghost" onClick={() => updateStatus('paid')}>Mark paid</button>
          )}

          {/* Void */}
          {!['void', 'paid'].includes(invoice.status) && (
            <button className="btn btn-danger" onClick={() => updateStatus('void')}>Void</button>
          )}
        </div>

        {actionError && <p className="error-msg" style={{ marginTop: '0.5rem' }}>{actionError}</p>}

        {/* Payment link bar */}
        {invoice.stripe_payment_link && invoice.status !== 'paid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
            <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>Payment link ready —</span>
            <a href={invoice.stripe_payment_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>open in Stripe</a>
            <button className="btn btn-ghost btn-sm" onClick={copyLink} type="button" style={{ marginLeft: 'auto' }}>{copied ? 'Copied!' : <><Link2 size={12} /> Copy</>}</button>
          </div>
        )}

        {invoice.status === 'paid' && invoice.paid_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#22c55e' }}>
            <CheckCircle size={14} style={{ flexShrink: 0 }} />
            Paid on {formatDate(invoice.paid_at)}
          </div>
        )}
      </div>

      {/* Invoice document */}
      <div id="invoice-print" className="card-elevated" style={{ maxWidth: '760px', padding: '2.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>matty@purepulse.one</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>purepulse.one</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.04em' }}>INVOICE</h2>
            <p style={{ fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{invoice.invoice_number}</p>
          </div>
        </div>

        <hr className="divider" />

        {/* Client + dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Bill To</p>
            <p style={{ fontWeight: 600 }}>{client?.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{client?.email}</p>
            {client?.company && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{client.company}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue Date</p>
              <p style={{ fontWeight: 500 }}>{formatDate(invoice.issue_date)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</p>
              <p style={{ fontWeight: 500, color: invoice.status === 'overdue' ? '#ef4444' : 'inherit' }}>{formatDate(invoice.due_date)}</p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Total</th>
              {isEditable && <th style={{ width: '32px' }} />}
            </tr>
          </thead>
          <tbody>
            {lineItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.625rem 0.25rem' }}>
                  {isEditable
                    ? <input className="input input-sm" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description" style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.9375rem', width: '100%' }} />
                    : <span style={{ fontSize: '0.9375rem' }}>{item.description}</span>}
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'right' }}>
                  {isEditable
                    ? <input className="input input-sm" type="number" step="0.001" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} style={{ textAlign: 'right', border: 'none', background: 'transparent', width: '60px', padding: 0 }} />
                    : <span>{item.quantity}</span>}
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'right' }}>
                  {isEditable
                    ? <input className="input input-sm" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))} style={{ textAlign: 'right', border: 'none', background: 'transparent', width: '80px', padding: 0 }} />
                    : <span>{formatMoney(item.unit_price)}</span>}
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.total)}</td>
                {isEditable && (
                  <td style={{ padding: '0.625rem 0' }}>
                    <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.4 }}><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {isEditable && (
          <button className="btn btn-ghost btn-sm" onClick={addLineItem} style={{ marginBottom: '2rem' }}>
            <Plus size={14} /> Add line item
          </button>
        )}

        {/* Totals */}
        <div style={{ maxWidth: '320px', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <span>Subtotal</span><span>{formatMoney(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <span>Tax rate (%)</span>
            {isEditable
              ? <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ width: '70px', textAlign: 'right', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', color: 'var(--text)', fontSize: '0.875rem' }} />
              : <span>{taxRate}%</span>}
          </div>
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <span>Tax ({taxRate}%)</span><span>{formatMoney(taxAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <span>Discount ($)</span>
            {isEditable
              ? <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))} style={{ width: '70px', textAlign: 'right', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', color: '#22c55e', fontSize: '0.875rem' }} />
              : discount > 0 ? <span style={{ color: '#22c55e' }}>−{formatMoney(discount)}</span> : <span>—</span>}
          </div>
          <hr className="divider" style={{ margin: '0.75rem 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem' }}>
            <span>Total</span><span>{formatMoney(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <hr className="divider" style={{ marginTop: '2rem' }} />
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Notes</p>
          {isEditable
            ? <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, instructions…" style={{ minHeight: '70px' }} />
            : notes ? <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{notes}</p> : <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>None</p>}
        </div>
      </div>

      <style>{`
        @media print {
          .btn, nav, aside, header { display: none !important; }
          #invoice-print { box-shadow: none !important; border: none !important; max-width: 100% !important; }
        }
      `}</style>
    </>
  )
}
