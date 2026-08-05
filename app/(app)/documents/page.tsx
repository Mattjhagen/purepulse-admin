'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Document1099, Client } from '@/lib/types'
import { formatDate, formatMoney, statusBadgeClass } from '@/lib/utils'
import { Plus, Download, X, FileText } from 'lucide-react'

function Generate1099Modal({ clients, onClose, onSave }: { clients: Client[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [clientId, setClientId] = useState('')
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1)
  const [totalPaid, setTotalPaid] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoCalc, setAutoCalc] = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)

  async function calculateFromTimeEntries() {
    if (!clientId) return
    setCalcLoading(true)
    const { data } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, hourly_rate')
      .eq('client_id', clientId)
      .eq('status', 'closed')
      .gte('clock_in', `${taxYear}-01-01`)
      .lt('clock_in', `${taxYear + 1}-01-01`)

    if (data) {
      let total = 0
      for (const e of data) {
        if (!e.clock_out) continue
        const hours = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3_600_000
        total += hours * e.hourly_rate
      }
      setTotalPaid(total.toFixed(2))
      setAutoCalc(true)
    }
    setCalcLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error: err } = await supabase.from('documents_1099').upsert({
      client_id: clientId, tax_year: taxYear, total_paid: Number(totalPaid), status: 'draft',
    }, { onConflict: 'client_id,tax_year' })
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Generate 1099</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Client *</label>
              <select className="input" required value={clientId} onChange={e => { setClientId(e.target.value); setAutoCalc(false) }}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tax Year *</label>
              <select className="input" value={taxYear} onChange={e => { setTaxYear(Number(e.target.value)); setAutoCalc(false) }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Total Paid *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" type="number" min={0} step={0.01} required value={totalPaid} onChange={e => { setTotalPaid(e.target.value); setAutoCalc(false) }} placeholder="0.00" />
              {clientId && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={calculateFromTimeEntries} disabled={calcLoading} style={{ whiteSpace: 'nowrap' }}>
                  {calcLoading ? <span className="spinner" /> : 'Auto-calc'}
                </button>
              )}
            </div>
            {autoCalc && <p style={{ fontSize: '0.8125rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>Calculated from time entries for {taxYear}</p>}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            A 1099-NEC document will be generated for payments of {totalPaid ? formatMoney(Number(totalPaid)) : '$0.00'} made to this client in {taxYear}. IRS requires 1099 for payments ≥ $600.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : <><FileText size={14} /> Generate</>}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<(Document1099 & { clients: { name: string; email: string } | null })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [docsRes, clientsRes] = await Promise.all([
      supabase.from('documents_1099').select('*, clients(name, email)').order('tax_year', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
    ])
    setDocs(docsRes.data ?? [])
    setClients(clientsRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function markFiled(docId: string) {
    await supabase.from('documents_1099').update({ status: 'filed', filed_at: new Date().toISOString() }).eq('id', docId)
    load()
  }

  function print1099(doc: (typeof docs)[0]) {
    const w = window.open('', '_blank')
    if (!w) return
    const client = doc.clients
    w.document.write(`<!DOCTYPE html><html><head><title>1099-NEC ${doc.tax_year}</title>
    <style>body{font-family:Arial,sans-serif;padding:2rem;color:#000;background:#fff}
    h1{font-size:1.5rem;font-weight:bold;margin-bottom:0.5rem}
    .box{border:1px solid #000;padding:0.75rem;margin:0.5rem 0}
    .label{font-size:0.75rem;text-transform:uppercase;color:#555;margin-bottom:0.25rem}
    .value{font-size:1.125rem;font-weight:bold}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1rem 0}
    </style></head><body>
    <h1>1099-NEC — Nonemployee Compensation</h1>
    <p>Tax Year: <strong>${doc.tax_year}</strong></p>
    <hr/>
    <div class="grid">
    <div><div class="label">Payer / Service Provider</div><div class="value">PurePulse</div><p>contact@purepulse.one<br/>purepulse.one<br/>Omaha, NE</p></div>
    <div><div class="label">Recipient / Client</div><div class="value">${client?.name ?? 'N/A'}</div><p>${client?.email ?? ''}</p></div>
    </div>
    <div class="box">
    <div class="label">Box 1 — Nonemployee Compensation</div>
    <div class="value" style="font-size:2rem">${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(doc.total_paid)}</div>
    </div>
    <p style="font-size:0.875rem;color:#555;margin-top:2rem">This form reports nonemployee compensation paid during the ${doc.tax_year} tax year. Please include this amount on your federal tax return. This document was generated by PurePulse.</p>
    <p style="font-size:0.75rem;color:#888;margin-top:1rem">Generated: ${new Date(doc.generated_at).toLocaleDateString()}</p>
    </body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>1099 Documents</h1>
            <p>Generate and track 1099-NEC forms for client payments.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Generate 1099
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--accent-amber)' }}>
          <strong>Note:</strong> 1099-NEC forms are required for clients paid $600 or more during a tax year. Deadline to file with the IRS is January 31. This tool generates and stores the documents — you are responsible for actual filing with the IRS.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <p>No 1099 documents yet.</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setModal(true)}><Plus size={16} /> Generate first 1099</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Tax Year</th><th>Total Paid</th><th>Status</th><th>Generated</th><th>Filed</th><th></th></tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500 }}>{doc.clients?.name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{doc.tax_year}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(doc.total_paid)}</td>
                  <td><span className={statusBadgeClass(doc.status)}>{doc.status}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(doc.generated_at)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{doc.filed_at ? formatDate(doc.filed_at) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => print1099(doc)}><Download size={13} /> Print</button>
                      {doc.status === 'draft' && <button className="btn btn-success btn-sm" onClick={() => markFiled(doc.id)}>Mark Filed</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <Generate1099Modal clients={clients} onClose={() => setModal(false)} onSave={() => { setModal(false); load() }} />}
    </>
  )
}
