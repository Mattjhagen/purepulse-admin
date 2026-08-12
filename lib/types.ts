export type Plan = 'starter' | 'growth' | 'premium' | 'business'

export const PLAN_PRICES: Record<Plan, number> = {
  starter: 20,
  growth: 50,
  premium: 75,
  business: 100,
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  premium: 'Premium',
  business: 'Business',
}

export type ClientStatus = 'active' | 'inactive' | 'prospect'

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  plan: Plan
  hourly_rate: number
  status: ClientStatus
  notes?: string
  referral_code?: string | null
  suspended?: boolean
  suspended_at?: string | null
  suspension_reason?: string | null
  warning_sent_at?: string | null
  created_at: string
  updated_at: string
}

export type TimeEntryStatus = 'open' | 'closed' | 'voided'

export interface TimeEntry {
  id: string
  user_id: string
  client_id: string
  client?: Client
  clock_in: string
  clock_out?: string
  hourly_rate: number
  description?: string
  status: TimeEntryStatus
  needs_review: boolean
  auto_clock_out: boolean
  manual_entry: boolean
  created_at: string
  updated_at: string
  breaks?: TimeEntryBreak[]
}

export interface TimeEntryBreak {
  id: string
  time_entry_id: string
  break_start: string
  break_end?: string
  created_at: string
}

export type TimesheetStatus = 'open' | 'submitted' | 'amended'

export interface TimesheetPeriod {
  id: string
  user_id: string
  period_start: string
  period_end: string
  status: TimesheetStatus
  submitted_at?: string
  total_hours?: number
  total_regular_hours?: number
  total_overtime_hours?: number
  total_earnings?: number
  created_at: string
}

export type TicketStatus = 'open' | 'in_progress' | 'blocked' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: string
  client_id: string
  client?: Client
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void'

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client?: Client
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount: number
  total: number
  notes?: string
  paid_at?: string
  created_at: string
  updated_at: string
  line_items?: InvoiceLineItem[]
}

export type LineItemType = 'monthly_plan' | 'hourly' | 'project' | 'expense' | 'other'

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  type: LineItemType
  description: string
  quantity: number
  unit_price: number
  total: number
  sort_order: number
  created_at: string
}

export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated'

export interface Contract {
  id: string
  client_id: string
  client?: Client
  title: string
  status: ContractStatus
  plan: Plan
  monthly_rate: number
  hourly_rate: number
  start_date: string
  end_date?: string
  signed_at?: string
  signed_by?: string
  signature_token?: string
  signature_data?: string
  signature_ip?: string
  content: string
  created_at: string
  updated_at: string
}

export interface Document1099 {
  id: string
  client_id: string
  client?: Client
  tax_year: number
  total_paid: number
  status: 'draft' | 'filed'
  generated_at: string
  filed_at?: string
}

export interface ContractorSettings {
  id: string
  user_id: string
  overtime_threshold_hours: number
  overtime_multiplier: number
  default_hourly_rate: number
  timezone: string
  auto_clock_out: boolean
  auto_clock_out_hours: number
}
