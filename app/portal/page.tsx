'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, statusBadgeClass } from '@/lib/utils'
import { Plus, X, LogOut, CheckCircle, Circle, Clock, MessageCircle, FileText, CreditCard, LifeBuoy, Sparkles, ThumbsUp, RotateCcw, ChevronDown, ChevronRight, ClipboardList, Pencil } from 'lucide-react'
import HandoffStatusCard from './handoff-status-card'

type Tab = 'home' | 'progress' | 'campaign' | 'brief' | 'messages' | 'invoices' | 'tickets' | 'posts'

type Stage = { id: string; name: string; status: 'pending' | 'in_progress' | 'complete'; note?: string; completed_at?: string; sort_order: number }
type Message = { id: string; sender: 'admin' | 'client'; sender_name: string; body: string; read_at: string | null; created_at: string }
type Invoice = { id: string; invoice_number: string; status: string; issue_date: string; due_date: string; total: number; stripe_payment_link?: string }
type Ticket = { id: string; subject: string; description: string; status: string; priority: string; created_at: string }
type TicketComment = { id: string; ticket_id: string; is_client: boolean; body: string; created_at: string }

type Deliverable = {
  id: string
  title: string
  type: string
  platform: string
  status: string
  ai_content: Record<string, unknown> | null
  final_content: Record<string, unknown> | null
  client_notes: string | null
  revision_count: number
  created_at: string
}

type SocialPost = {
  id: string
  title: string
  platform: string
  status: string
  social_caption: string | null
  social_image_url: string | null
  created_at: string
  campaign_name?: string
}

type Milestone = {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  sort_order: number
  due_date: string | null
  deliverables: Deliverable[]
}

type Campaign = {
  id: string
  name: string
  plan: string
  status: string
  milestones: Milestone[]
}

type CampaignBrief = {
  id: string
  campaign_id: string
  business_name: string | null
  industry: string | null
  location: string | null
  target_audience: string | null
  unique_value_prop: string | null
  tone: string[]
  competitors: string[]
  goals: string[]
  ai_summary: string | null
}

const TONE_OPTIONS = ['professional', 'friendly', 'bold', 'playful', 'minimal', 'luxury', 'educational', 'humorous']
const GOAL_OPTIONS = [
  'Grow brand awareness',
  'Generate leads',
  'Drive sales',
  'Improve SEO rankings',
  'Grow social following',
  'Launch a new product or service',
  'Build email list',
  'Increase website traffic',
]

export default function CustomerPortalPage() {
  const supabase = createClient()
  const [session, setSession] = useState<{ user: { email?: string; id: string } } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [tab, setTab] = useState<Tab>('home')

  // Data
  const [stages, setStages] = useState<Stage[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketComments, setTicketComments] = useState<Record<string, TicketComment[]>>({})
  const [openTicketId, setOpenTicketId] = useState<string | null>(null)
  const [ticketReply, setTicketReply] = useState('')
  const [sendingTicketReply, setSendingTicketReply] = useState(false)
  const [loading, setLoading] = useState(false)

  // Campaign data
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [revisionDeliverable, setRevisionDeliverable] = useState<Deliverable | null>(null)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [submittingApproval, setSubmittingApproval] = useState<string | null>(null)

  // Brief state
  const [brief, setBrief] = useState<CampaignBrief | null>(null)
  const [briefEditing, setBriefEditing] = useState(false)
  const [briefSubmitting, setBriefSubmitting] = useState(false)
  const [briefSuccess, setBriefSuccess] = useState(false)
  // Form fields
  const [bfBusinessName, setBfBusinessName] = useState('')
  const [bfIndustry, setBfIndustry] = useState('')
  const [bfLocation, setBfLocation] = useState('')
  const [bfTargetAudience, setBfTargetAudience] = useState('')
  const [bfUniqueValueProp, setBfUniqueValueProp] = useState('')
  const [bfTone, setBfTone] = useState<string[]>([])
  const [bfGoals, setBfGoals] = useState<string[]>([])
  const [bfCompetitors, setBfCompetitors] = useState<string[]>([])
  const [bfCompetitorInput, setBfCompetitorInput] = useState('')
  const [bfNotes, setBfNotes] = useState('')

  // New ticket
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketDesc, setTicketDesc] = useState('')
  const [ticketPriority, setTicketPriority] = useState('medium')
  const [submittingTicket, setSubmittingTicket] = useState(false)

  // New message
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const msgBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession({ user: { email: data.session.user.email, id: data.session.user.id } })
    })
  }, [supabase])

  const loadData = useCallback(async () => {
    if (!session) return
    setLoading(true)

    const { data: pu } = await supabase.from('portal_users').select('client_id').eq('auth_user_id', session.user.id).single()
    if (!pu?.client_id) {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('id')
        .or(`auth_user_id.eq.${session.user.id},email.eq.${session.user.email?.toLowerCase().trim()}`)
        .single()
      if (aff) {
        window.location.href = '/affiliates/dashboard'
        return
      }
      setLoading(false)
      return
    }
    setClientId(pu.client_id)

    const { data: client } = await supabase.from('clients').select('name').eq('id', pu.client_id).single()
    if (client) setClientName(client.name)

    const [{ data: s }, { data: m }, { data: inv }, { data: t }, { data: camp }] = await Promise.all([
      supabase.from('project_stages').select('*').eq('client_id', pu.client_id).order('sort_order'),
      supabase.from('client_messages').select('id,sender,sender_name,body,read_at,created_at').eq('client_id', pu.client_id).order('created_at'),
      supabase.from('invoices').select('id,invoice_number,status,issue_date,due_date,total,stripe_payment_link').eq('client_id', pu.client_id).order('issue_date', { ascending: false }),
      supabase.from('tickets').select('*').eq('client_id', pu.client_id).order('created_at', { ascending: false }),
      supabase.from('campaigns').select('id,name,plan,status').eq('client_id', pu.client_id).eq('status', 'active').order('created_at'),
    ])

    setStages(s ?? [])
    setMessages(m ?? [])
    setInvoices(inv ?? [])
    setTickets(t ?? [])

    if (t && t.length > 0) {
      const { data: tc } = await supabase.from('ticket_comments').select('id,ticket_id,is_client,body,created_at').in('ticket_id', t.map(x => x.id)).order('created_at')
      const grouped: Record<string, TicketComment[]> = {}
      for (const c of tc ?? []) { (grouped[c.ticket_id] ??= []).push(c) }
      setTicketComments(grouped)
    }

    if (camp && camp.length > 0) {
      const campIds = camp.map(c => c.id)

      // Load brief for the first campaign
      const { data: briefData } = await supabase
        .from('campaign_briefs')
        .select('*')
        .eq('campaign_id', campIds[0])
        .single()
      if (briefData) {
        setBrief(briefData as CampaignBrief)
        // Pre-fill form fields
        setBfBusinessName(briefData.business_name ?? '')
        setBfIndustry(briefData.industry ?? '')
        setBfLocation(briefData.location ?? '')
        setBfTargetAudience(briefData.target_audience ?? '')
        setBfUniqueValueProp(briefData.unique_value_prop ?? '')
        setBfTone(briefData.tone ?? [])
        setBfGoals(briefData.goals ?? [])
        setBfCompetitors(briefData.competitors ?? [])
      } else {
        setBrief(null)
      }
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id,campaign_id,title,description,status,sort_order,due_date')
        .in('campaign_id', campIds)
        .order('sort_order')

      const milestoneIds = (milestones ?? []).map(m => m.id)
      const deliverablesByMilestone: Record<string, Deliverable[]> = {}

      if (milestoneIds.length > 0) {
        const { data: delivs } = await supabase
          .from('deliverables')
          .select('id,milestone_id,title,type,platform,status,ai_content,final_content,client_notes,revision_count,created_at')
          .in('milestone_id', milestoneIds)
          .in('status', ['in_review', 'revision_requested', 'approved', 'scheduled', 'published'])
          .order('created_at')

        for (const d of delivs ?? []) {
          if (!d.milestone_id) continue
          ;(deliverablesByMilestone[d.milestone_id] ??= []).push(d as Deliverable)
        }
      }

      const builtCampaigns: Campaign[] = camp.map(c => ({
        ...c,
        milestones: (milestones ?? [])
          .filter(m => m.campaign_id === c.id)
          .map(m => ({
            ...m,
            deliverables: deliverablesByMilestone[m.id] ?? [],
          })),
      }))

      setCampaigns(builtCampaigns)

      // Load social posts for this client's campaigns
      if (milestoneIds.length > 0) {
        const { data: posts } = await supabase
          .from('deliverables')
          .select('id,milestone_id,title,platform,status,social_caption,social_image_url,created_at')
          .in('milestone_id', milestoneIds)
          .eq('type', 'social_post')
          .in('status', ['scheduled', 'published'])
          .order('created_at', { ascending: false })

        const milestoneTocamp: Record<string, string> = {}
        for (const m of milestones ?? []) milestoneTocamp[m.id] = m.campaign_id
        const campNameMap: Record<string, string> = {}
        for (const c of camp) campNameMap[c.id] = c.name

        setSocialPosts((posts ?? []).map(p => ({
          ...p,
          campaign_name: campNameMap[milestoneTocamp[p.milestone_id]] ?? '',
        }) as SocialPost))
      }

      // Auto-expand the first in_progress milestone
      const firstActive = (milestones ?? []).find(m => m.status === 'in_progress')
      if (firstActive) setExpandedMilestones(new Set([firstActive.id]))
    }

    setLoading(false)
  }, [session, supabase])

  useEffect(() => {
    if (!session) return
    const t = setTimeout(loadData, 0)
    return () => clearTimeout(t)
  }, [session, loadData])

  // Real-time: append new messages instantly when they arrive
  useEffect(() => {
    if (!clientId) return
    const channel = supabase
      .channel(`portal-messages:${clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` },
        (payload) => {
          setMessages(prev => {
            const m = payload.new as Message
            if (prev.some(x => x.id === m.id)) return prev
            return [...prev, m]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, clientId])

  // Mark admin messages as read when Messages tab is opened
  useEffect(() => {
    if (tab !== 'messages' || !clientId) return
    const unread = messages.filter(m => m.sender === 'admin' && !m.read_at)
    if (unread.length === 0) return
    supabase
      .from('client_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('sender', 'admin')
      .is('read_at', null)
      .then(() => {
        const now = new Date().toISOString()
        setMessages(prev => prev.map(m => m.sender === 'admin' && !m.read_at ? { ...m, read_at: now } : m))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, clientId])

  // Scroll messages to bottom on new messages
  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthError(''); setAuthLoading(true)
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) {
          const { data: aff } = await supabase
            .from('affiliates')
            .select('id')
            .or(`auth_user_id.eq.${data.user.id},email.eq.${email.toLowerCase().trim()}`)
            .single()
          if (aff) {
            window.location.href = '/affiliates/dashboard'
            return
          }
          setSession({ user: { email: data.user.email, id: data.user.id } })
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('portal_users').insert({ auth_user_id: data.user.id, email })
          setSession({ user: { email: data.user.email, id: data.user.id } })
        }
      }
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'Auth failed') }
    setAuthLoading(false)
  }


  async function approveDeliverable(deliverable: Deliverable) {
    setSubmittingApproval(deliverable.id)
    await supabase.from('approvals').insert({
      deliverable_id: deliverable.id,
      decision: 'approved',
      approved_by: clientName || session?.user.email || 'Client',
    })
    await supabase.from('deliverables').update({ status: 'approved' }).eq('id', deliverable.id)
    await loadData()
    setSubmittingApproval(null)
  }

  async function submitRevision() {
    if (!revisionDeliverable) return
    setSubmittingApproval(revisionDeliverable.id)
    await supabase.from('approvals').insert({
      deliverable_id: revisionDeliverable.id,
      decision: 'revision_requested',
      notes: revisionNotes,
      approved_by: clientName || session?.user.email || 'Client',
    })
    await supabase.from('deliverables').update({
      status: 'revision_requested',
      client_notes: revisionNotes,
      revision_count: (revisionDeliverable.revision_count ?? 0) + 1,
    }).eq('id', revisionDeliverable.id)
    setRevisionDeliverable(null)
    setRevisionNotes('')
    await loadData()
    setSubmittingApproval(null)
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setSubmittingTicket(true)
    await supabase.from('tickets').insert({ client_id: clientId, subject: ticketSubject, description: ticketDesc, priority: ticketPriority, status: 'open' })
    setTicketSubject(''); setTicketDesc(''); setShowNewTicket(false)
    await loadData()
    setSubmittingTicket(false)
  }

  async function sendTicketReply(e: React.FormEvent, ticketId: string) {
    e.preventDefault()
    if (!ticketReply.trim()) return
    setSendingTicketReply(true)
    await supabase.from('ticket_comments').insert({ ticket_id: ticketId, user_id: session?.user.id, is_client: true, body: ticketReply.trim() })
    setTicketReply('')
    await loadData()
    setSendingTicketReply(false)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !newMessage.trim()) return
    setSendingMessage(true)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        sender: 'client',
        sender_name: clientName || session?.user.email || 'Client',
        body: newMessage.trim(),
      }),
    })
    setNewMessage('')
    setSendingMessage(false)
    // Realtime will append the new message
  }

  function toggleTone(t: string) {
    setBfTone(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleGoal(g: string) {
    setBfGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }
  function addCompetitor() {
    const val = bfCompetitorInput.trim()
    if (val && !bfCompetitors.includes(val)) setBfCompetitors(prev => [...prev, val])
    setBfCompetitorInput('')
  }
  function removeCompetitor(c: string) {
    setBfCompetitors(prev => prev.filter(x => x !== c))
  }

  async function submitBrief(e: React.FormEvent) {
    e.preventDefault()
    if (!campaigns[0]) return
    setBriefSubmitting(true)
    setBriefSuccess(false)

    const payload = {
      business_name: bfBusinessName,
      industry: bfIndustry,
      location: bfLocation,
      target_audience: bfTargetAudience,
      unique_value_prop: bfUniqueValueProp,
      tone: bfTone,
      goals: bfGoals,
      competitors: bfCompetitors,
      notes: bfNotes,
    }

    const res = await fetch(`/api/campaigns/${campaigns[0].id}/brief-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setBriefSuccess(true)
      setBriefEditing(false)
      await loadData()
    }
    setBriefSubmitting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null); setClientId(null); setStages([]); setMessages([]); setInvoices([]); setTickets([]); setCampaigns([]); setBrief(null); setBriefSuccess(false)
  }

  function toggleMilestone(id: string) {
    setExpandedMilestones(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderAiContent(deliverable: Deliverable) {
    const content = deliverable.final_content ?? deliverable.ai_content
    if (!content) return null
    const c = content as Record<string, unknown>

    switch (deliverable.type) {
      case 'social_post':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.caption && <p style={{ lineHeight: 1.7, color: 'var(--text)' }}>{String(c.caption)}</p>}
            {Array.isArray(c.hashtags) && c.hashtags.length > 0 && (
              <p style={{ color: '#7B2FFF', fontSize: '0.875rem' }}>{(c.hashtags as string[]).map(h => `#${h}`).join(' ')}</p>
            )}
            {!!c.cta && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>CTA: {String(c.cta)}</p>}
            {!!c.visual_direction && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Visual: {String(c.visual_direction)}
              </div>
            )}
          </div>
        )
      case 'blog_post':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.headline && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{String(c.headline)}</h3>}
            {!!c.subheadline && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{String(c.subheadline)}</p>}
            {!!c.intro && <p style={{ lineHeight: 1.7 }}>{String(c.intro)}</p>}
            {Array.isArray(c.outline) && c.outline.length > 0 && (
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outline</p>
                <ol style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text)', lineHeight: 2, fontSize: '0.9rem' }}>
                  {(c.outline as string[]).map((item, i) => <li key={i}>{item}</li>)}
                </ol>
              </div>
            )}
            {!!c.cta && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>CTA: {String(c.cta)}</p>}
          </div>
        )
      case 'webpage':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.headline && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{String(c.headline)}</h3>}
            {!!c.subheadline && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{String(c.subheadline)}</p>}
            {!!c.body && <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{String(c.body)}</p>}
            {!!c.cta && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>CTA: {String(c.cta)}</p>}
          </div>
        )
      case 'ad_copy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.headline && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{String(c.headline)}</h3>}
            {!!c.description && <p style={{ lineHeight: 1.7 }}>{String(c.description)}</p>}
            {!!c.cta && <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#7B2FFF' }}>CTA: {String(c.cta)}</p>}
            {Array.isArray(c.keywords) && c.keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {(c.keywords as string[]).map((k, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '100px', padding: '2px 10px', fontSize: '0.8125rem' }}>{k}</span>
                ))}
              </div>
            )}
          </div>
        )
      case 'email':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.subject && <p style={{ fontWeight: 700, margin: 0 }}>Subject: {String(c.subject)}</p>}
            {!!c.preview_text && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Preview: {String(c.preview_text)}</p>}
            {!!c.headline && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{String(c.headline)}</h3>}
            {!!c.body && <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{String(c.body)}</p>}
            {!!c.cta && <p style={{ fontSize: '0.875rem', color: '#7B2FFF', fontWeight: 600 }}>CTA: {String(c.cta)}</p>}
          </div>
        )
      case 'seo_report':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.page_title && <p style={{ fontWeight: 700 }}>{String(c.page_title)}</p>}
            {!!c.meta_description && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{String(c.meta_description)}</p>}
            {!!c.h1 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>H1: {String(c.h1)}</p>}
            {Array.isArray(c.focus_keywords) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {(c.focus_keywords as string[]).map((k, i) => (
                  <span key={i} style={{ background: 'rgba(123,47,255,0.1)', color: '#7B2FFF', borderRadius: '100px', padding: '2px 10px', fontSize: '0.8125rem' }}>{k}</span>
                ))}
              </div>
            )}
            {Array.isArray(c.recommendations) && c.recommendations.length > 0 && (
              <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text)', lineHeight: 2, fontSize: '0.9rem' }}>
                {(c.recommendations as string[]).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        )
      case 'strategy_doc':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.executive_summary && <p style={{ lineHeight: 1.7 }}>{String(c.executive_summary)}</p>}
            {Array.isArray(c.goals) && c.goals.length > 0 && (
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goals</p>
                <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 2, fontSize: '0.9rem' }}>
                  {(c.goals as string[]).map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(c.content_pillars) && c.content_pillars.length > 0 && (
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Pillars</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {(c.content_pillars as string[]).map((p, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '100px', padding: '2px 10px', fontSize: '0.8125rem' }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      case 'analytics_report':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!c.summary && <p style={{ lineHeight: 1.7 }}>{String(c.summary)}</p>}
            {Array.isArray(c.highlights) && c.highlights.length > 0 && (
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highlights</p>
                <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 2, fontSize: '0.9rem' }}>
                  {(c.highlights as string[]).map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}
          </div>
        )
      default:
        return <pre style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(content, null, 2)}</pre>
    }
  }

  function deliverableStatusColor(status: string) {
    switch (status) {
      case 'approved':           return { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e' }
      case 'revision_requested': return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
      case 'ai_generated':       return { bg: 'rgba(123,47,255,0.1)', color: '#7B2FFF' }
      case 'in_review':          return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' }
      default:                   return { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }
    }
  }

  function milestoneIcon(status: Milestone['status']) {
    if (status === 'completed') return <CheckCircle size={20} color="#22c55e" />
    if (status === 'in_progress') return <Clock size={20} color="#f59e0b" />
    if (status === 'skipped') return <Circle size={20} style={{ opacity: 0.2 }} />
    return <Circle size={20} style={{ opacity: 0.3 }} />
  }

  const pendingReviewCount = campaigns.flatMap(c => c.milestones.flatMap(m => m.deliverables)).filter(d => d.status === 'in_review').length

  if (!session) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <a href="https://purepulse.one" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
            </a>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Client Portal</p>
          </div>
          <div className="card-elevated" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem' }}>
              {(['login', 'signup'] as const).map(m => (
                <button key={m} className="btn btn-ghost" style={{ flex: 1, borderRadius: m === 'login' ? 'var(--radius-full) 0 0 var(--radius-full)' : '0 var(--radius-full) var(--radius-full) 0', background: authMode === m ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  onClick={() => setAuthMode(m)}>{m === 'login' ? 'Sign in' : 'Sign up'}</button>
              ))}
            </div>
            {authError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>{authError}</div>}
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Email</label>
                <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ width: '100%', justifyContent: 'center' }}>
                {authLoading ? <span className="spinner" /> : authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Admin? <a href="/login" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Admin portal</a>
            {' · '}
            Affiliate? <a href="/affiliates/login" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Affiliate portal</a>
          </p>
        </div>
      </div>
    )
  }


  const unreadMessages = messages.filter(m => m.sender === 'admin' && !m.read_at).length

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'home', label: 'Home', icon: <CheckCircle size={16} /> },
    { id: 'progress', label: 'Progress', icon: <Clock size={16} /> },
    { id: 'campaign', label: 'Campaign', icon: <Sparkles size={16} />, count: pendingReviewCount || undefined },
    { id: 'brief', label: 'Brief', icon: <ClipboardList size={16} />, count: campaigns.length > 0 && !brief ? 1 : undefined },
    { id: 'posts', label: 'Posts', icon: <FileText size={16} />, count: socialPosts.length || undefined },
    { id: 'messages', label: 'Messages', icon: <MessageCircle size={16} />, count: unreadMessages || undefined },
    { id: 'invoices', label: 'Invoices', icon: <CreditCard size={16} />, count: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length || undefined },
    { id: 'tickets', label: 'Tickets', icon: <LifeBuoy size={16} />, count: tickets.filter(t => t.status === 'open').length || undefined },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.05em' }}>PurePulse</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.75rem' }}>Client Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{clientName || session.user.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}><LogOut size={14} /> Sign out</button>
        </div>
      </header>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem', display: 'flex', gap: '0.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 0.875rem', fontSize: '0.875rem', fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? 'var(--text)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: tab === t.id ? 'var(--text)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.icon} {t.label}
            {t.count ? <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, padding: '0 5px', borderRadius: '100px', minWidth: '18px', textAlign: 'center' }}>{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : !clientId ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Your account isn&apos;t linked to a project yet. Contact <a href="mailto:matty@purepulse.one" style={{ color: 'var(--text)' }}>matty@purepulse.one</a> to get set up.</p>
          </div>
        ) : (
          <>
            {/* HOME TAB */}
            {tab === 'home' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.375rem' }}>
                  Welcome back{clientName ? `, ${clientName}` : ''}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Here&apos;s what needs your attention.</p>

                <HandoffStatusCard />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {pendingReviewCount > 0 && (
                    <button onClick={() => setTab('campaign')} style={{ background: 'rgba(123,47,255,0.08)', border: '1px solid rgba(123,47,255,0.25)', borderRadius: 'var(--radius)', padding: '1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 800, color: '#7B2FFF', lineHeight: 1 }}>{pendingReviewCount}</p>
                      <p style={{ fontWeight: 600, marginTop: '0.375rem' }}>Pending Review{pendingReviewCount !== 1 ? 's' : ''}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Deliverables waiting for your approval</p>
                    </button>
                  )}

                  {unreadMessages > 0 && (
                    <button onClick={() => setTab('messages')} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 'var(--radius)', padding: '1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{unreadMessages}</p>
                      <p style={{ fontWeight: 600, marginTop: '0.375rem' }}>New Message{unreadMessages !== 1 ? 's' : ''}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>From the PurePulse team</p>
                    </button>
                  )}

                  {invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length > 0 && (
                    <button onClick={() => setTab('invoices')} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius)', padding: '1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length}</p>
                      <p style={{ fontWeight: 600, marginTop: '0.375rem' }}>Invoice{invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length !== 1 ? 's' : ''} Due</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Awaiting payment</p>
                    </button>
                  )}

                  {tickets.filter(t => t.status === 'open').length > 0 && (
                    <button onClick={() => setTab('tickets')} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius)', padding: '1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{tickets.filter(t => t.status === 'open').length}</p>
                      <p style={{ fontWeight: 600, marginTop: '0.375rem' }}>Open Ticket{tickets.filter(t => t.status === 'open').length !== 1 ? 's' : ''}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Support requests in progress</p>
                    </button>
                  )}

                  {pendingReviewCount === 0 && unreadMessages === 0 && invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length === 0 && tickets.filter(t => t.status === 'open').length === 0 && (
                    <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                      <CheckCircle size={32} style={{ margin: '0 auto 1rem', color: '#22c55e' }} />
                      <p style={{ fontWeight: 600, marginBottom: '0.375rem' }}>All caught up!</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nothing needs your attention right now.</p>
                    </div>
                  )}
                </div>

                {/* Quick nav */}
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Quick access</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
                  {([
                    { id: 'progress', label: 'Project Progress', icon: <Clock size={18} /> },
                    { id: 'campaign', label: 'Campaign', icon: <Sparkles size={18} /> },
                    { id: 'posts', label: 'Social Posts', icon: <FileText size={18} /> },
                    { id: 'messages', label: 'Messages', icon: <MessageCircle size={18} /> },
                    { id: 'invoices', label: 'Invoices', icon: <CreditCard size={18} /> },
                    { id: 'tickets', label: 'Tickets', icon: <LifeBuoy size={18} /> },
                  ] as const).map(item => (
                    <button key={item.id} onClick={() => setTab(item.id)} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--text-muted)', transition: 'all 0.15s', textAlign: 'left' }}>
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROGRESS TAB */}
            {tab === 'progress' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Project Progress</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Track where your project stands.</p>
                {stages.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Clock size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>Your project stages will appear here once we kick things off.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {stages.map((stage, i) => (
                      <div key={stage.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', opacity: stage.status === 'pending' && i > 0 && stages[i-1].status !== 'complete' ? 0.5 : 1 }}>
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                          {stage.status === 'complete' ? <CheckCircle size={20} color="#22c55e" /> : stage.status === 'in_progress' ? <Clock size={20} color="#f59e0b" /> : <Circle size={20} style={{ opacity: 0.3 }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <p style={{ fontWeight: 600 }}>{stage.name}</p>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '100px', background: stage.status === 'complete' ? 'rgba(34,197,94,0.1)' : stage.status === 'in_progress' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', color: stage.status === 'complete' ? '#22c55e' : stage.status === 'in_progress' ? '#f59e0b' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {stage.status.replace('_', ' ')}
                            </span>
                          </div>
                          {stage.note && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{stage.note}</p>}
                          {stage.completed_at && <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Completed {formatDate(stage.completed_at)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CAMPAIGN TAB */}
            {tab === 'campaign' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Your Campaign</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Review and approve your AI-generated marketing deliverables.</p>

                {campaigns.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Sparkles size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>Your marketing campaign will appear here once it&apos;s set up.</p>
                  </div>
                ) : campaigns.map(campaign => (
                  <div key={campaign.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <span style={{ background: 'rgba(123,47,255,0.12)', color: '#7B2FFF', border: '1px solid rgba(123,47,255,0.25)', borderRadius: '100px', padding: '3px 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', letterSpacing: '0.03em' }}>
                        {campaign.plan} plan
                      </span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{campaign.name}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {campaign.milestones.map((milestone, mi) => {
                        const isExpanded = expandedMilestones.has(milestone.id)
                        const deliverablesPending = milestone.deliverables.filter(d => d.status === 'in_review').length

                        return (
                          <div key={milestone.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            {/* Milestone header */}
                            <button
                              onClick={() => toggleMilestone(milestone.id)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: milestone.status === 'in_progress' ? 'rgba(245,158,11,0.04)' : 'var(--card)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <div style={{ flexShrink: 0 }}>{milestoneIcon(milestone.status)}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                    {mi + 1}. {milestone.title}
                                  </span>
                                  {deliverablesPending > 0 && (
                                    <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                                      {deliverablesPending} to review
                                    </span>
                                  )}
                                </div>
                                {milestone.due_date && (
                                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Due {formatDate(milestone.due_date)}</p>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '100px', background: milestone.status === 'completed' ? 'rgba(34,197,94,0.1)' : milestone.status === 'in_progress' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', color: milestone.status === 'completed' ? '#22c55e' : milestone.status === 'in_progress' ? '#f59e0b' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                                  {milestone.status.replace('_', ' ')}
                                </span>
                                {isExpanded ? <ChevronDown size={16} style={{ opacity: 0.4 }} /> : <ChevronRight size={16} style={{ opacity: 0.4 }} />}
                              </div>
                            </button>

                            {/* Milestone description + deliverables */}
                            {isExpanded && (
                              <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem' }}>
                                {milestone.description && (
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: milestone.deliverables.length > 0 ? '1.25rem' : 0, lineHeight: 1.6 }}>{milestone.description}</p>
                                )}

                                {milestone.deliverables.length === 0 ? (
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                    {milestone.status === 'pending' ? 'Deliverables will appear here when this phase begins.' : 'No deliverables for this milestone.'}
                                  </p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {milestone.deliverables.map(d => {
                                      const statusStyle = deliverableStatusColor(d.status)
                                      const canReview = d.status === 'in_review'
                                      const isProcessing = submittingApproval === d.id

                                      return (
                                        <div key={d.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.125rem' }}>
                                          {/* Deliverable header */}
                                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.875rem' }}>
                                            <div>
                                              <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{d.title}</p>
                                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '100px', padding: '1px 8px', textTransform: 'capitalize' }}>
                                                  {d.type.replace('_', ' ')}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '100px', padding: '1px 8px', textTransform: 'capitalize' }}>
                                                  {d.platform}
                                                </span>
                                              </div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: statusStyle.bg, color: statusStyle.color, whiteSpace: 'nowrap', textTransform: 'capitalize', flexShrink: 0 }}>
                                              {d.status.replace(/_/g, ' ')}
                                            </span>
                                          </div>

                                          {/* Content preview */}
                                          <div style={{ marginBottom: '1rem' }}>
                                            {renderAiContent(d)}
                                          </div>

                                          {/* Client notes if revision was requested */}
                                          {d.client_notes && d.status === 'revision_requested' && (
                                            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.875rem', color: '#f59e0b' }}>
                                              <strong>Your notes:</strong> {d.client_notes}
                                            </div>
                                          )}

                                          {/* Action buttons */}
                                          {canReview && (
                                            <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                              <button
                                                className="btn btn-sm"
                                                disabled={isProcessing}
                                                onClick={() => approveDeliverable(d)}
                                                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                                              >
                                                {isProcessing ? <span className="spinner" /> : <><ThumbsUp size={14} /> Approve</>}
                                              </button>
                                              <button
                                                className="btn btn-sm btn-ghost"
                                                disabled={isProcessing}
                                                onClick={() => { setRevisionDeliverable(d); setRevisionNotes(d.client_notes ?? '') }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                                              >
                                                <RotateCcw size={14} /> Request revision
                                              </button>
                                            </div>
                                          )}

                                          {d.status === 'approved' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', color: '#22c55e', fontSize: '0.875rem' }}>
                                              <CheckCircle size={16} /> Approved
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BRIEF TAB */}
            {tab === 'brief' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Brand Brief</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {brief ? 'Your brand brief is on file and guides all AI-generated content.' : 'Help us understand your business so we can create content that hits.'}
                    </p>
                  </div>
                  {brief && !briefEditing && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setBriefEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Pencil size={14} /> Edit
                    </button>
                  )}
                </div>

                {campaigns.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <ClipboardList size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>Your campaign brief will be available once your campaign is set up.</p>
                  </div>
                ) : brief && !briefEditing ? (
                  // READ VIEW
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {briefSuccess && (
                      <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', color: '#22c55e', fontSize: '0.875rem' }}>
                        Brief saved! Your AI brand summary has been updated.
                      </div>
                    )}

                    {brief.ai_summary && (
                      <div style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B2FFF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>AI Brand Summary</p>
                        <p style={{ lineHeight: 1.75, color: 'var(--text)' }}>{brief.ai_summary}</p>
                      </div>
                    )}

                    <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      {[
                        { label: 'Business name', value: brief.business_name },
                        { label: 'Industry', value: brief.industry },
                        { label: 'Location', value: brief.location },
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</p>
                          <p>{value}</p>
                        </div>
                      ) : null)}
                    </div>

                    {brief.target_audience && (
                      <div className="card">
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Target audience</p>
                        <p style={{ lineHeight: 1.65 }}>{brief.target_audience}</p>
                      </div>
                    )}

                    {brief.unique_value_prop && (
                      <div className="card">
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>What makes you different</p>
                        <p style={{ lineHeight: 1.65 }}>{brief.unique_value_prop}</p>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {brief.tone?.length > 0 && (
                        <div className="card">
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Brand tone</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                            {brief.tone.map(t => (
                              <span key={t} style={{ background: 'rgba(123,47,255,0.1)', color: '#7B2FFF', borderRadius: '100px', padding: '2px 10px', fontSize: '0.8125rem', textTransform: 'capitalize' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {brief.goals?.length > 0 && (
                        <div className="card">
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Goals</p>
                          <ul style={{ paddingLeft: '1.125rem', margin: 0, lineHeight: 2, fontSize: '0.875rem' }}>
                            {brief.goals.map(g => <li key={g}>{g}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    {brief.competitors?.length > 0 && (
                      <div className="card">
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Competitors</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {brief.competitors.map(c => (
                            <span key={c} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '100px', padding: '2px 10px', fontSize: '0.8125rem' }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // FORM VIEW
                  <form onSubmit={submitBrief} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Section 1 – Business basics */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Business basics</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label>Business name *</label>
                          <input className="input" required value={bfBusinessName} onChange={e => setBfBusinessName(e.target.value)} placeholder="Acme Plumbing Co." />
                        </div>
                        <div className="form-group">
                          <label>Industry *</label>
                          <input className="input" required value={bfIndustry} onChange={e => setBfIndustry(e.target.value)} placeholder="Home services, retail, restaurant…" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Location</label>
                        <input className="input" value={bfLocation} onChange={e => setBfLocation(e.target.value)} placeholder="City, State — or 'nationwide'" />
                      </div>
                    </div>

                    {/* Section 2 – Audience & positioning */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Audience & positioning</p>
                      <div className="form-group">
                        <label>Who is your target customer? *</label>
                        <textarea className="input" required value={bfTargetAudience} onChange={e => setBfTargetAudience(e.target.value)} style={{ minHeight: '80px' }} placeholder="e.g. Homeowners aged 30–55 in the suburbs who value quality over price and want a trustworthy contractor" />
                      </div>
                      <div className="form-group">
                        <label>What makes you different from competitors? *</label>
                        <textarea className="input" required value={bfUniqueValueProp} onChange={e => setBfUniqueValueProp(e.target.value)} style={{ minHeight: '80px' }} placeholder="e.g. We're the only plumber in town with same-day guarantees and upfront pricing — no surprises" />
                      </div>
                    </div>

                    {/* Section 3 – Brand tone */}
                    <div className="card">
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.875rem' }}>Brand tone</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Select all that match your brand voice.</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {TONE_OPTIONS.map(t => {
                          const active = bfTone.includes(t)
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleTone(t)}
                              style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: active ? 'rgba(123,47,255,0.15)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(123,47,255,0.5)' : '1px solid var(--border)', color: active ? '#7B2FFF' : 'var(--text)', textTransform: 'capitalize', transition: 'all 0.15s' }}
                            >
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Section 4 – Goals */}
                    <div className="card">
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.875rem' }}>Marketing goals</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>What do you most want to achieve in the next 12 months?</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {GOAL_OPTIONS.map(g => {
                          const active = bfGoals.includes(g)
                          return (
                            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', background: active ? 'rgba(123,47,255,0.06)' : 'transparent', border: active ? '1px solid rgba(123,47,255,0.2)' : '1px solid transparent', transition: 'all 0.15s' }}>
                              <input type="checkbox" checked={active} onChange={() => toggleGoal(g)} style={{ accentColor: '#7B2FFF', width: '16px', height: '16px', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.9rem' }}>{g}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Section 5 – Competitors */}
                    <div className="card">
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>Competitors</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Who are your main competitors? (optional)</p>
                      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.75rem' }}>
                        <input
                          className="input"
                          style={{ flex: 1 }}
                          value={bfCompetitorInput}
                          onChange={e => setBfCompetitorInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor() } }}
                          placeholder="Competitor name — press Enter to add"
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addCompetitor}>Add</button>
                      </div>
                      {bfCompetitors.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {bfCompetitors.map(c => (
                            <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '100px', padding: '2px 10px 2px 12px', fontSize: '0.8125rem' }}>
                              {c}
                              <button type="button" onClick={() => removeCompetitor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}><X size={12} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 6 – Additional notes */}
                    <div className="card">
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>Anything else?</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.875rem' }}>Awards, origin story, must-avoids, seasonal focus — whatever helps us tell your story.</p>
                      <textarea className="input" value={bfNotes} onChange={e => setBfNotes(e.target.value)} style={{ minHeight: '90px' }} placeholder="e.g. We've been family-owned since 1987. We don't want to mention competitors by name…" />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {briefEditing && (
                        <button type="button" className="btn btn-ghost" onClick={() => setBriefEditing(false)}>Cancel</button>
                      )}
                      <button type="submit" className="btn btn-primary" disabled={briefSubmitting} style={{ minWidth: '160px', justifyContent: 'center' }}>
                        {briefSubmitting ? (
                          <><span className="spinner" /> Generating summary…</>
                        ) : brief ? 'Save changes' : 'Submit brief'}
                      </button>
                    </div>

                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      After submitting, we&apos;ll generate an AI brand summary that guides all your content.
                    </p>
                  </form>
                )}
              </div>
            )}

            {/* POSTS TAB */}
            {tab === 'posts' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Social Posts</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your scheduled and published social media content.</p>
                {socialPosts.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No scheduled or published posts yet. They&apos;ll appear here once your social content is ready.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {socialPosts.map(post => {
                      const isPublished = post.status === 'published'
                      return (
                        <div key={post.id} className="card">
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: post.social_caption ? '0.875rem' : 0 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{post.title}</p>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '100px', padding: '1px 8px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                  {post.platform}
                                </span>
                                {post.campaign_name && (
                                  <span style={{ fontSize: '0.75rem', background: 'rgba(123,47,255,0.08)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: '100px', padding: '1px 8px', color: '#7B2FFF' }}>
                                    {post.campaign_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: isPublished ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: isPublished ? '#22c55e' : '#3b82f6', whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'capitalize' }}>
                              {post.status}
                            </span>
                          </div>
                          {post.social_image_url && (
                            <div style={{ marginBottom: '0.875rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '240px' }}>
                              <img src={post.social_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                          )}
                          {post.social_caption && (
                            <p style={{ fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{post.social_caption}</p>
                          )}
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{formatDate(post.created_at)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES TAB */}
            {tab === 'messages' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Messages</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Communicate directly with the PurePulse team.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {messages.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                      <MessageCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p style={{ color: 'var(--text-muted)' }}>No messages yet. Send one below!</p>
                    </div>
                  ) : messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '75%', background: m.sender === 'client' ? 'var(--accent-primary, #7B2FFF)' : 'var(--card)', border: '1px solid var(--border)', borderRadius: m.sender === 'client' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: m.sender === 'client' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: '0.25rem' }}>{m.sender_name}</p>
                        <p style={{ color: m.sender === 'client' ? '#fff' : 'var(--text)', lineHeight: 1.6, fontSize: '0.9375rem' }}>{m.body}</p>
                        <p style={{ fontSize: '0.75rem', color: m.sender === 'client' ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', marginTop: '0.375rem' }}>{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={msgBottomRef} />
                </div>
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                  <input className="input" style={{ flex: 1 }} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message…" required />
                  <button type="submit" className="btn btn-primary" disabled={sendingMessage}>
                    {sendingMessage ? <span className="spinner" /> : 'Send'}
                  </button>
                </form>
              </div>
            )}

            {/* INVOICES TAB */}
            {tab === 'invoices' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Invoices</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>View and pay your invoices.</p>
                {invoices.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No invoices yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {invoices.map(inv => (
                      <div key={inv.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontWeight: 600 }}>{inv.invoice_number}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>${inv.total.toFixed(2)}</p>
                          <span className={statusBadgeClass(inv.status)}>{inv.status}</span>
                          {(inv.status === 'sent' || inv.status === 'overdue') && inv.stripe_payment_link && (
                            <a href={inv.stripe_payment_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                              <CreditCard size={14} /> Pay Now
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TICKETS TAB */}
            {tab === 'tickets' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Support Tickets</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Submit and track support requests.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowNewTicket(true)}><Plus size={16} /> New ticket</button>
                </div>
                {tickets.length === 0 ? (
                  <div className="empty-state"><p>No tickets yet. Submit one if you need help!</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tickets.map(t => {
                      const isOpen = openTicketId === t.id
                      const thread = ticketComments[t.id] ?? []
                      return (
                        <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpenTicketId(isOpen ? null : t.id)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, marginBottom: '0.375rem' }}>{t.subject}</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{t.description}</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                Opened {formatDate(t.created_at)}
                                {thread.length > 0 && ` · ${thread.length} repl${thread.length === 1 ? 'y' : 'ies'}`}
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end' }}>
                              <span className={statusBadgeClass(t.status)}>{t.status.replace('_', ' ')}</span>
                              <span className={t.priority === 'urgent' ? 'badge badge-red' : t.priority === 'high' ? 'badge badge-amber' : 'badge badge-white'}>{t.priority}</span>
                            </div>
                          </div>

                          {isOpen && (
                            <div onClick={e => e.stopPropagation()} style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                {thread.length === 0 ? (
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No replies yet.</p>
                                ) : thread.map(c => (
                                  <div key={c.id} style={{ display: 'flex', justifyContent: c.is_client ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ maxWidth: '80%', background: c.is_client ? 'var(--accent-primary, #7B2FFF)' : 'var(--card)', border: '1px solid var(--border)', borderRadius: c.is_client ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.625rem 0.875rem' }}>
                                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: c.is_client ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: '0.2rem' }}>{c.is_client ? 'You' : 'Matty'}</p>
                                      <p style={{ color: c.is_client ? '#fff' : 'var(--text)', fontSize: '0.875rem', lineHeight: 1.5 }}>{c.body}</p>
                                      <p style={{ fontSize: '0.7rem', color: c.is_client ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', marginTop: '0.2rem' }}>{formatDate(c.created_at)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <form onSubmit={e => sendTicketReply(e, t.id)} style={{ display: 'flex', gap: '0.625rem' }}>
                                <input className="input" style={{ flex: 1 }} value={ticketReply} onChange={e => setTicketReply(e.target.value)} placeholder="Add a reply…" required />
                                <button type="submit" className="btn btn-primary btn-sm" disabled={sendingTicketReply}>
                                  {sendingTicketReply ? <span className="spinner" /> : 'Reply'}
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New ticket modal */}
      {showNewTicket && (
        <div className="modal-backdrop" onClick={() => setShowNewTicket(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>New Support Ticket</h2>
              <button onClick={() => setShowNewTicket(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={submitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Subject *</label>
                <input className="input" required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Brief summary" />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea className="input" required value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="Describe the issue…" style={{ minHeight: '100px' }} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="input" value={ticketPriority} onChange={e => setTicketPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewTicket(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingTicket}>{submittingTicket ? <span className="spinner" /> : 'Submit ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision request modal */}
      {revisionDeliverable && (
        <div className="modal-backdrop" onClick={() => setRevisionDeliverable(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Request Revision</h2>
              <button onClick={() => setRevisionDeliverable(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              <strong style={{ color: 'var(--text)' }}>{revisionDeliverable.title}</strong> — tell us what needs to change and we&apos;ll update it for you.
            </p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>What should be changed? *</label>
              <textarea
                className="input"
                required
                value={revisionNotes}
                onChange={e => setRevisionNotes(e.target.value)}
                placeholder="e.g. Make the tone more casual, swap out the call-to-action, update the headline…"
                style={{ minHeight: '110px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRevisionDeliverable(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!revisionNotes.trim() || !!submittingApproval}
                onClick={submitRevision}
              >
                {submittingApproval ? <span className="spinner" /> : 'Submit revision request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
