import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLAN_PRICES: Record<string, number> = { starter: 20, growth: 50, premium: 75, business: 100 }

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `PP-${year}${month}-${rand}`
}

// GET — preview: return clients that don't yet have an invoice this month
export async function GET() {
  const supabase = adminSupabase()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [{ data: clients }, { data: existingInvoices }] = await Promise.all([
    supabase.from('clients').select('id, name, plan').eq('status', 'active').order('name'),
    supabase.from('invoices')
      .select('client_id')
      .gte('issue_date', monthStart)
      .lte('issue_date', monthEnd)
      .neq('status', 'void'),
  ])

  const alreadyBilled = new Set((existingInvoices ?? []).map(i => i.client_id))
  const pending = (clients ?? []).filter(c => !alreadyBilled.has(c.id))

  return NextResponse.json({ pending, total: pending.length })
}

// POST — generate invoices for all unbilled active clients this month
export async function POST() {
  const supabase = adminSupabase()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const issueDate = now.toISOString().split('T')[0]
  const dueDate = (() => { const d = new Date(now); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })()

  const [{ data: clients }, { data: existingInvoices }] = await Promise.all([
    supabase.from('clients').select('id, name, plan, hourly_rate').eq('status', 'active').order('name'),
    supabase.from('invoices')
      .select('client_id')
      .gte('issue_date', monthStart)
      .lte('issue_date', monthEnd)
      .neq('status', 'void'),
  ])

  const alreadyBilled = new Set((existingInvoices ?? []).map(i => i.client_id))
  const unbilled = (clients ?? []).filter(c => !alreadyBilled.has(c.id))

  const created: string[] = []
  for (const client of unbilled) {
    const planPrice = PLAN_PRICES[client.plan] ?? 0
    if (planPrice === 0) continue

    const { data: inv } = await supabase.from('invoices').insert({
      invoice_number: generateInvoiceNumber(),
      client_id: client.id,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate,
      subtotal: planPrice,
      tax_rate: 0,
      tax_amount: 0,
      discount: 0,
      total: planPrice,
    }).select('id').single()

    if (inv) {
      await supabase.from('invoice_line_items').insert({
        invoice_id: inv.id,
        type: 'monthly_plan',
        description: `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan — Monthly fee`,
        quantity: 1,
        unit_price: planPrice,
        total: planPrice,
        sort_order: 0,
      })
      created.push(inv.id)
    }
  }

  return NextResponse.json({ created: created.length, ids: created })
}
