'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Invoice, InvoiceLineItem, Client } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass } from '@/lib/utils'
import { Printer, Plus, Trash2, ChevronLeft, Save, Send, Link2 } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoice, setInvoice] = useState<any>(null)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const [invRes, itemsRes] = await Promise.all([
      supabase.from('invoices').select('*, clients(*)').eq('id', id).single(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
    ])
    setInvoice(invRes.data)
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
    const taxAmount = subtotal * ((invoice?.tax_rate ?? 0) / 100)
    const total = subtotal + taxAmount - (invoice?.discount ?? 0)

    await supabase.from('invoices').update({ subtotal, tax_amount: taxAmount, total, updated_at: new Date().toISOString() }).eq('id', id)

    // Upsert line items
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

  async function sendInvoice() {
    setLinkError('')
    setSendingLink(true)
    try {
      const res = await fetch(`/api/invoices/${id}/pay-link`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to generate payment link.')
      await supabase.from('invoices').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id)
      await load()
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to generate payment link.')
    } finally {
      setSendingLink(false)
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
  const taxAmount = subtotal * ((invoice.tax_rate ?? 0) / 100)
  const total = subtotal + taxAmount - (invoice.discount ?? 0)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/invoices" className="btn btn-ghost btn-sm"><ChevronLeft size={14} /> Invoices</Link>
        <span className={statusBadgeClass(invoice.status)}>{invoice.status}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: 'auto' }}>{invoice.invoice_number}</span>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}</button>
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
          {invoice.status === 'draft' && (
            <button className="btn btn-success" onClick={sendInvoice} disabled={sendingLink}>
              {sendingLink ? <span className="spinner" /> : <><Send size={14} /> Mark Sent &amp; Generate Payment Link</>}
            </button>
          )}
          {invoice.status === 'sent' && !invoice.stripe_payment_link && (
            <button className="btn btn-ghost" onClick={sendInvoice} disabled={sendingLink}>
              {sendingLink ? <span className="spinner" /> : <><Link2 size={14} /> Generate Payment Link</>}
            </button>
          )}
          {invoice.status === 'sent' && <button className="btn btn-success" onClick={() => updateStatus('paid')}>Mark Paid Manually</button>}
          {!['void', 'paid'].includes(invoice.status) && <button className="btn btn-danger" onClick={() => updateStatus('void')}>Void</button>}
        </div>
        {linkError && <p className="error-msg" style={{ marginTop: '0.5rem' }}>{linkError}</p>}
        {invoice.stripe_payment_link && invoice.status !== 'paid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span>Payment link ready —</span>
            <a href={invoice.stripe_payment_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>open</a>
            <button className="btn btn-ghost btn-sm" onClick={copyLink} type="button">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        )}
      </div>

      {/* Invoice doc */}
      <div id="invoice-print" className="card-elevated" style={{ maxWidth: '760px', padding: '2.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>contact@purepulse.one</p>
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
              <p style={{ fontWeight: 500, color: invoice.status === 'overdue' ? 'var(--accent-red)' : 'inherit' }}>{formatDate(invoice.due_date)}</p>
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
              <th style={{ width: '32px' }} />
            </tr>
          </thead>
          <tbody>
            {lineItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.625rem 0.25rem' }}>
                  <input className="input input-sm" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description" style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '0.9375rem' }} />
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'right' }}>
                  <input className="input input-sm" type="number" step="0.001" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} style={{ textAlign: 'right', border: 'none', background: 'transparent', width: '60px', padding: '0' }} />
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'right' }}>
                  <input className="input input-sm" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))} style={{ textAlign: 'right', border: 'none', background: 'transparent', width: '80px', padding: '0' }} />
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.total)}</td>
                <td style={{ padding: '0.625rem 0' }}>
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.5 }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn btn-ghost btn-sm" onClick={addLineItem} style={{ marginBottom: '2rem' }}>
          <Plus size={14} /> Add line item
        </button>

        {/* Totals */}
        <div style={{ maxWidth: '280px', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <span>Subtotal</span><span>{formatMoney(subtotal)}</span>
          </div>
          {invoice.tax_rate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <span>Tax ({invoice.tax_rate}%)</span><span>{formatMoney(taxAmount)}</span>
            </div>
          )}
          {invoice.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--accent-green)', fontSize: '0.875rem' }}>
              <span>Discount</span><span>−{formatMoney(invoice.discount)}</span>
            </div>
          )}
          <hr className="divider" style={{ margin: '0.75rem 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem' }}>
            <span>Total</span><span>{formatMoney(total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <>
            <hr className="divider" />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>Notes:</strong> {invoice.notes}</p>
          </>
        )}
      </div>
    </>
  )
}
