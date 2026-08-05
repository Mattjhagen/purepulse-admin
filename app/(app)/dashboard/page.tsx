import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formatMoney, formatDateTime } from '@/lib/utils'
import { PLAN_PRICES } from '@/lib/types'
import Link from 'next/link'
import { Clock, Users, Ticket, FileText, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const [clientsRes, entriesRes, ticketsRes, invoicesRes] = await Promise.all([
    supabase.from('clients').select('id, name, plan, status').eq('status', 'active'),
    supabase.from('time_entries').select('id, clock_in, clock_out, hourly_rate, client_id, clients(name)').eq('status', 'open').order('clock_in', { ascending: false }).limit(5),
    supabase.from('tickets').select('id, subject, status, priority, created_at, clients(name)').in('status', ['open','in_progress']).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id, invoice_number, status, total, clients(name)').in('status', ['sent','overdue']).order('created_at', { ascending: false }).limit(5),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients = (clientsRes.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeEntries = (entriesRes.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openTickets = (ticketsRes.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingInvoices = (invoicesRes.data ?? []) as any[]

  const mrr = clients.reduce((sum, c) => sum + (PLAN_PRICES[c.plan as keyof typeof PLAN_PRICES] ?? 0), 0)
  const pendingRevenue = pendingInvoices.reduce((sum, i) => sum + (i.total ?? 0), 0)

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back — here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-tile">
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Active Clients</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatMoney(mrr)}</div>
          <div className="stat-label">Monthly Recurring</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{activeEntries.length}</div>
          <div className="stat-label">Active Timers</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{openTickets.length}</div>
          <div className="stat-label">Open Tickets</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{formatMoney(pendingRevenue)}</div>
          <div className="stat-label">Pending Revenue</div>
        </div>
      </div>

      {/* Active timers */}
      {activeEntries.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} />
              Active Timers
            </h2>
            <Link href="/time-clock" className="btn btn-ghost btn-sm">View all <ArrowRight size={13} /></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Clocked In</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {activeEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.clients?.name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(e.clock_in)}</td>
                    <td>{formatMoney(e.hourly_rate)}/hr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Open Tickets */}
        <div>
          <div className="section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={16} />
              Open Tickets
            </h2>
            <Link href="/tickets" className="btn btn-ghost btn-sm">All <ArrowRight size={13} /></Link>
          </div>
          {openTickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No open tickets</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {openTickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="card" style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{t.subject}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{t.clients?.name}</p>
                    </div>
                    <span className={t.priority === 'urgent' ? 'badge badge-red' : t.priority === 'high' ? 'badge badge-amber' : 'badge badge-white'}>
                      {t.priority}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invoices */}
        <div>
          <div className="section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} />
              Pending Invoices
            </h2>
            <Link href="/invoices" className="btn btn-ghost btn-sm">All <ArrowRight size={13} /></Link>
          </div>
          {pendingInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No pending invoices</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingInvoices.map((i) => (
                <Link key={i.id} href={`/invoices/${i.id}`} className="card" style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{i.clients?.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{i.invoice_number as string}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700 }}>{formatMoney(i.total)}</p>
                      <span className={i.status === 'overdue' ? 'badge badge-red' : 'badge badge-amber'} style={{ marginTop: '0.25rem' }}>
                        {i.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <Link href="/time-clock" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Clock size={20} />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Clock In</span>
        </Link>
        <Link href="/clients" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={20} />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Add Client</span>
        </Link>
        <Link href="/invoices" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={20} />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>New Invoice</span>
        </Link>
        <Link href="/contracts" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={20} />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>New Contract</span>
        </Link>
      </div>
    </>
  )
}
