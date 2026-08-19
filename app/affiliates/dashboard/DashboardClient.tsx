'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Gift, DollarSign, MousePointer, Copy, CheckCircle,
  Printer, Download, Share2, Landmark, Sparkles, ExternalLink,
  QrCode, FileText, Image as ImageIcon, Check, RefreshCw, Send,
  Layers, CreditCard, ChevronRight, HelpCircle, ArrowUpRight
} from 'lucide-react'

export type Affiliate = {
  id: string
  name: string
  email: string
  phone: string | null
  referral_code: string
  status: string
  stripe_account_id: string | null
  stripe_payouts_enabled: boolean
  payout_method: string
  payout_details: {
    bank_name?: string
    account_holder_name?: string
    routing_number?: string
    account_number_last4?: string
    paypal_email?: string
    venmo_handle?: string
    notes?: string
  } | null
  clicks: number
  created_at: string
}

export type Referral = {
  id: string
  client_id: string
  plan: string
  status: string
  commission_rate: number
  monthly_commission: number
  created_at: string
  activated_at: string | null
  clients: {
    name: string
    email: string
    company?: string
  } | null
}

export type Commission = {
  id: string
  period_month: string
  amount: number
  status: string
  paid_at: string | null
  created_at: string
}

export type Stats = {
  total_referrals: number
  active_referrals: number
  monthly_earnings: number
  lifetime_earnings: number
  pending_commissions: number
  total_clicks: number
  conversion_rate: number
  free_plan_eligible: boolean
}

type TabKey = 'overview' | 'printable' | 'social' | 'commissions' | 'payouts'
type FlyerTheme = 'dark-neon' | 'clean-light' | 'business-roi' | 'tear-off'
type SocialFormat = 'square' | 'story' | 'banner'

const COMMISSION_TIERS = [
  { plan: 'Starter', price: 20, rate: 10, monthly: 2.00, desc: 'Essential site hosting & maintenance' },
  { plan: 'Growth', price: 50, rate: 40, monthly: 20.00, desc: 'Unlimited updates, SEO & analytics' },
  { plan: 'Premium', price: 75, rate: 45, monthly: 33.75, desc: 'Custom dev, phone support & SEO' },
  { plan: 'Business', price: 100, rate: 50, monthly: 50.00, desc: 'Dedicated website partner & priority' },
]

export default function AffiliateDashboardClient({
  affiliate,
  referrals,
  commissions,
  recentClicks,
  sourceBreakdown,
  stats,
}: {
  affiliate: Affiliate
  referrals: Referral[]
  commissions: Commission[]
  recentClicks: Array<{ id: string; source: string; converted: boolean; created_at: string }>
  sourceBreakdown: Record<string, number>
  stats: Stats
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Printable state
  const [selectedFlyerTheme, setSelectedFlyerTheme] = useState<FlyerTheme>('dark-neon')
  const [showFlyerPreview, setShowFlyerPreview] = useState(true)

  // Social Studio state
  const [socialFormat, setSocialFormat] = useState<SocialFormat>('square')
  const [socialHeadline, setSocialHeadline] = useState('Professional Websites Built for $150 Deposit.')
  const [customTag, setCustomTag] = useState('social')
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null)
  const [generatingGraphic, setGeneratingGraphic] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Payouts state
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [stripeError, setStripeError] = useState('')
  const [savingBackup, setSavingBackup] = useState(false)
  const [backupSuccess, setBackupSuccess] = useState(false)
  const [backupForm, setBackupForm] = useState({
    payout_method: affiliate.payout_method || 'stripe',
    bank_name: affiliate.payout_details?.bank_name || '',
    account_holder_name: affiliate.payout_details?.account_holder_name || '',
    routing_number: affiliate.payout_details?.routing_number || '',
    account_number_last4: affiliate.payout_details?.account_number_last4 || '',
    paypal_email: affiliate.payout_details?.paypal_email || '',
    venmo_handle: affiliate.payout_details?.venmo_handle || '',
  })

  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one')

  const baseReferralUrl = `${origin}/ref/${affiliate.referral_code}`
  const customCampaignUrl = `${origin}/ref/${affiliate.referral_code}?src=${encodeURIComponent(customTag || 'campaign')}`
  const qrSvgUrl = `/api/qr?data=${encodeURIComponent(baseReferralUrl)}&format=svg`
  const qrPngUrl = `/api/qr?data=${encodeURIComponent(baseReferralUrl)}&format=png&size=1024`

  function copyText(text: string, type: 'link' | 'code' | 'caption', id?: string) {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else if (type === 'code') {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } else if (type === 'caption' && id) {
        setCopiedCaptionId(id)
        setTimeout(() => setCopiedCaptionId(null), 2000)
      }
    })
  }

  // Draw social image onto canvas for 1-click export
  const drawSocialGraphic = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 1080
    let height = 1080
    if (socialFormat === 'story') { width = 1080; height = 1920 }
    else if (socialFormat === 'banner') { width = 1200; height = 630 }

    canvas.width = width
    canvas.height = height

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, '#08060d')
    bgGrad.addColorStop(0.5, '#0f0a1c')
    bgGrad.addColorStop(1, '#050308')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Ambient Glow circles
    const glow1 = ctx.createRadialGradient(width * 0.8, height * 0.15, 10, width * 0.8, height * 0.15, width * 0.6)
    glow1.addColorStop(0, 'rgba(123, 47, 255, 0.45)')
    glow1.addColorStop(1, 'transparent')
    ctx.fillStyle = glow1
    ctx.fillRect(0, 0, width, height)

    const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.8, 10, width * 0.15, height * 0.8, width * 0.5)
    glow2.addColorStop(0, 'rgba(0, 212, 255, 0.25)')
    glow2.addColorStop(1, 'transparent')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, width, height)

    // Brand Header
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
    ctx.fillText('Pure', 60, 90)
    const pureWidth = ctx.measureText('Pure').width
    ctx.fillStyle = '#A066FF'
    ctx.fillText('Pulse', 60 + pureWidth, 90)

    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '600 18px system-ui, -apple-system, sans-serif'
    ctx.fillText('WEB DESIGN & MAINTENANCE', width - 360, 90)

    // Top pill badge
    const badgeText = '⚡ HIGH PERFORMANCE WEBSITES'
    ctx.fillStyle = 'rgba(123,47,255,0.25)'
    roundRect(ctx, 60, 150, 340, 44, 22, true, false)
    ctx.strokeStyle = 'rgba(160,102,255,0.6)'
    ctx.lineWidth = 1.5
    roundRect(ctx, 60, 150, 340, 44, 22, false, true)

    ctx.fillStyle = '#A066FF'
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
    ctx.fillText(badgeText, 80, 178)

    // Main Headline
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 64px system-ui, -apple-system, sans-serif'
    wrapText(ctx, socialHeadline, 60, 280, width - 120, 78)

    // Feature highlights
    const features = [
      '✓ Custom design & clean code built to convert',
      '✓ Fully responsive & ultra-fast loading',
      '✓ $150 deposit to start — all plans include maintenance',
    ]
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '500 24px system-ui, -apple-system, sans-serif'
    let featY = socialFormat === 'story' ? height * 0.52 : height * 0.60
    for (const f of features) {
      ctx.fillText(f, 60, featY)
      featY += 46
    }

    // Bottom CTA Card
    const ctaY = height - (socialFormat === 'story' ? 340 : 220)
    const ctaHeight = socialFormat === 'story' ? 260 : 160
    ctx.fillStyle = 'rgba(123,47,255,0.15)'
    roundRect(ctx, 60, ctaY, width - 120, ctaHeight, 24, true, false)
    ctx.strokeStyle = 'rgba(160,102,255,0.5)'
    ctx.lineWidth = 2
    roundRect(ctx, 60, ctaY, width - 120, ctaHeight, 24, false, true)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
    ctx.fillText('Get Started at purepulse.one', 90, ctaY + 54)

    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '500 20px system-ui, -apple-system, sans-serif'
    ctx.fillText(`Partner Link: purepulse.one/pricing?ref=${affiliate.referral_code}`, 90, ctaY + 96)

    // Code Pill inside CTA
    ctx.fillStyle = '#7B2FFF'
    roundRect(ctx, width - 360, ctaY + 40, 260, 60, 12, true, false)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px monospace'
    ctx.fillText(`CODE: ${affiliate.referral_code}`, width - 340, ctaY + 77)

  }, [socialFormat, socialHeadline, affiliate.referral_code])

  useEffect(() => {
    if (activeTab === 'social') {
      drawSocialGraphic()
    }
  }, [activeTab, socialFormat, socialHeadline, drawSocialGraphic])

  function downloadGraphic() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `purepulse-social-${socialFormat}-${affiliate.referral_code.toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function connectStripe(action?: 'reauth') {
    setConnectingStripe(true)
    setStripeError('')
    try {
      const url = `/api/affiliates/connect${action ? `?action=${action}` : ''}`
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : 'Stripe setup failed.')
    } finally {
      setConnectingStripe(false)
    }
  }

  async function saveBackupPayouts(e: React.FormEvent) {
    e.preventDefault()
    setSavingBackup(true)
    setBackupSuccess(false)
    try {
      const res = await fetch('/api/affiliates/payout-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_method: backupForm.payout_method,
          payout_details: {
            bank_name: backupForm.bank_name,
            account_holder_name: backupForm.account_holder_name,
            routing_number: backupForm.routing_number,
            account_number_last4: backupForm.account_number_last4,
            paypal_email: backupForm.paypal_email,
            venmo_handle: backupForm.venmo_handle,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setBackupSuccess(true)
        setTimeout(() => setBackupSuccess(false), 3000)
      }
    } catch {
      alert('Failed to save payout settings')
    } finally {
      setSavingBackup(false)
    }
  }

  return (
    <div style={s.page}>
      {/* GLOBAL PRINT STYLES FOR FULL LETTER FLYER */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            background: #08060d !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          header, nav, .affiliate-dash-content, .no-print {
            display: none !important;
          }
          .affiliate-print-flyer {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 3rem 3.5rem 2rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-radius: 0 !important;
            background: ${selectedFlyerTheme === 'clean-light' ? '#ffffff' : '#08060d'} !important;
            color: ${selectedFlyerTheme === 'clean-light' ? '#111111' : '#ffffff'} !important;
            position: relative !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header style={s.header} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/affiliates" style={s.logo}>
            Pure<span style={{ color: '#7B2FFF' }}>Pulse</span>
          </Link>
          <span style={s.partnerBadge}>
            <Sparkles size={13} color="#7B2FFF" /> Partner Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111' }}>{affiliate.name}</span>
            <span style={{ fontSize: '0.75rem', color: affiliate.status === 'active' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
              ● {affiliate.status.toUpperCase()}
            </span>
          </div>

          <form action="/api/affiliates/logout" method="POST">
            <button type="submit" style={s.signOutBtn}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div style={s.tabsWrap} className="no-print">
        <div style={s.tabsInner}>
          {[
            { key: 'overview', label: 'Overview & Stats', icon: TrendingUp },
            { key: 'printable', label: 'Printable Assets Hub', icon: Printer },
            { key: 'social', label: 'Social Campaign Studio', icon: Share2 },
            { key: 'commissions', label: 'Commissions & Referrals', icon: DollarSign },
            { key: 'payouts', label: 'Payouts & Banking', icon: Landmark },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                style={{
                  ...s.tabBtn,
                  color: isActive ? '#7B2FFF' : '#6b7280',
                  borderBottom: isActive ? '2.5px solid #7B2FFF' : '2.5px solid transparent',
                  background: isActive ? 'rgba(123, 47, 255, 0.04)' : 'transparent',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* DASHBOARD CONTENT */}
      <main style={s.main} className="affiliate-dash-content">
        {/* QUICK LINK BAR */}
        <div style={s.linkBarCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={s.linkBarLabel}>YOUR UNIQUE REFERRAL LINK</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <code style={s.linkCode}>{baseReferralUrl}</code>
                <button
                  onClick={() => copyText(baseReferralUrl, 'link')}
                  style={{ ...s.copyBtn, background: copiedLink ? '#22c55e' : '#111' }}
                >
                  {copiedLink ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
                </button>
                <a
                  href={baseReferralUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={s.testLinkBtn}
                >
                  Test Link <ArrowUpRight size={13} />
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderLeft: '1px solid #e5e7eb', paddingLeft: 16 }}>
              <div>
                <p style={s.linkBarLabel}>PARTNER CODE</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {affiliate.referral_code}
                </p>
              </div>
              <button
                onClick={() => copyText(affiliate.referral_code, 'code')}
                style={{ ...s.iconOnlyBtn, color: copiedCode ? '#22c55e' : '#6b7280' }}
                title="Copy partner code"
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div>
            {/* Free plan bonus banner */}
            {stats.free_plan_eligible ? (
              <div style={s.bonusActiveBanner}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⭐ vibecodes.space Business Plan Active
                  </p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#d1d5db' }}>
                    You have {stats.active_referrals} active client referral{stats.active_referrals !== 1 ? 's' : ''} — your free $49/mo business subscription is unlocked!
                  </p>
                </div>
                <a href="https://vibecodes.space" target="_blank" rel="noreferrer" style={s.bonusCtaBtn}>
                  Open vibecodes.space →
                </a>
              </div>
            ) : (
              <div style={s.bonusPendingBanner}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '0.9375rem', color: '#92400e' }}>
                    🎯 Refer 1 Client This Month = Free Business Plan ($49/mo value)
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#78350f' }}>
                    Partners with 1+ active referrals receive complimentary access to vibecodes.space Business Plan for their own brand.
                  </p>
                </div>
                <button onClick={() => setActiveTab('printable')} style={s.bonusActionBtn}>
                  Get Marketing Assets →
                </button>
              </div>
            )}

            {/* Metrics */}
            <div style={s.metricsGrid}>
              {[
                { label: 'Active Subscriptions', value: stats.active_referrals.toString(), sub: 'paying clients', icon: Layers, color: '#7B2FFF' },
                { label: 'Monthly Recurring', value: `$${stats.monthly_earnings.toFixed(2)}`, sub: 'accruing / month', icon: DollarSign, color: '#16a34a' },
                { label: 'Lifetime Paid', value: `$${stats.lifetime_earnings.toFixed(2)}`, sub: 'total earned', icon: Landmark, color: '#2563eb' },
                { label: 'Link Clicks', value: stats.total_clicks.toString(), sub: `${stats.conversion_rate}% conversion`, icon: MousePointer, color: '#f59e0b' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} style={s.metricCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={s.metricLabel}>{item.label}</span>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={item.color} />
                      </div>
                    </div>
                    <p style={s.metricValue}>{item.value}</p>
                    <p style={s.metricSub}>{item.sub}</p>
                  </div>
                )
              })}
            </div>

            {/* Quick Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
              <div style={s.actionTile} onClick={() => setActiveTab('printable')}>
                <div style={s.actionIconWrap}><Printer size={20} color="#7B2FFF" /></div>
                <div>
                  <h3 style={s.actionTitle}>Print Marketing Flyers</h3>
                  <p style={s.actionDesc}>Download &amp; print full-page flyers, business cards &amp; tear-off posters.</p>
                </div>
              </div>

              <div style={s.actionTile} onClick={() => setActiveTab('social')}>
                <div style={s.actionIconWrap}><Share2 size={20} color="#00D4FF" /></div>
                <div>
                  <h3 style={s.actionTitle}>Social Campaign Studio</h3>
                  <p style={s.actionDesc}>Generate custom visual graphics &amp; 1-click pre-written copy.</p>
                </div>
              </div>

              <div style={s.actionTile} onClick={() => setActiveTab('payouts')}>
                <div style={s.actionIconWrap}><Landmark size={20} color="#16a34a" /></div>
                <div>
                  <h3 style={s.actionTitle}>Link Bank for Payouts</h3>
                  <p style={s.actionDesc}>
                    {affiliate.stripe_payouts_enabled ? 'Stripe Direct Deposit Active ✓' : 'Connect bank account with Stripe'}
                  </p>
                </div>
              </div>
            </div>

            {/* Commission Tiers Visualizer */}
            <div style={s.card}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>Recurring Commission Tiers</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
                  You receive monthly recurring payouts for as long as your referred client stays active.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, padding: '24px' }}>
                {COMMISSION_TIERS.map(t => (
                  <div key={t.plan} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 16px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>{t.plan} Plan</p>
                    <p style={{ margin: '0 0 8px', fontSize: '1.625rem', fontWeight: 900, color: '#111' }}>${t.monthly.toFixed(2)}<span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6b7280' }}>/mo</span></p>
                    <span style={{ display: 'inline-block', background: '#e0d4fc', color: '#7B2FFF', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, marginBottom: 8 }}>
                      {t.rate}% Commission
                    </span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: PRINTABLE ASSETS HUB ── */}
        {activeTab === 'printable' && (
          <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Printable Asset Hub</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  Hang flyers in cafes, universities, and co-working spaces. Hand out cards to local business owners.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowFlyerPreview(!showFlyerPreview)}
                  style={s.secondaryBtn}
                >
                  {showFlyerPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  onClick={() => window.print()}
                  style={s.primaryBtn}
                >
                  <Printer size={15} /> Print Selected Flyer (Letter 8.5x11)
                </button>
              </div>
            </div>

            {/* Flyer Theme Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              {[
                { id: 'dark-neon', title: 'Signature Dark Neon', desc: 'High-contrast cyber look with QR & mascot' },
                { id: 'clean-light', title: 'Studio Clean Light', desc: 'Minimalist white agency layout for cafes' },
                { id: 'business-roi', title: 'Local Business ROI', desc: 'Direct pitch: $150 deposit, zero headaches' },
                { id: 'tear-off', title: '10-Tab Tear-Off Poster', desc: 'Tear-away slips with QR & code for boards' },
              ].map(theme => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedFlyerTheme(theme.id as FlyerTheme)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: selectedFlyerTheme === theme.id ? '2px solid #7B2FFF' : '1.5px solid #e5e7eb',
                    background: selectedFlyerTheme === theme.id ? '#fbf8ff' : '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: selectedFlyerTheme === theme.id ? '#7B2FFF' : '#111' }}>
                      {theme.title}
                    </p>
                    {selectedFlyerTheme === theme.id && <CheckCircle size={15} color="#7B2FFF" />}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{theme.desc}</p>
                </div>
              ))}
            </div>

            {/* Live Flyer Preview on Screen */}
            {showFlyerPreview && (
              <div style={{ background: '#f3f4f6', padding: '24px 16px', borderRadius: 14, marginBottom: 32, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 680, margin: '0 auto 16px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Live Flyer Preview (Full Page Letter)
                  </span>
                  <button onClick={() => window.print()} style={{ ...s.primaryBtn, padding: '6px 14px', fontSize: '0.8125rem' }}>
                    <Printer size={13} /> Print Full Page
                  </button>
                </div>

                <div style={{ maxWidth: 640, margin: '0 auto', boxShadow: '0 20px 45px rgba(0,0,0,0.2)', borderRadius: 16, overflow: 'hidden' }}>
                  {renderFlyerByTheme(selectedFlyerTheme, affiliate.name, affiliate.referral_code, baseReferralUrl, qrSvgUrl)}
                </div>
              </div>
            )}

            {/* Additional Assets: Business Cards & Table Tents */}
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 16px' }}>
              More Formats &amp; Digital Brand Assets
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Business Cards */}
              <div style={s.card}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Printable Business Cards (3.5&quot; × 2&quot;)</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Standard &amp; VistaPrint compatible layout</p>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Card Front */}
                  <div style={{ background: '#08060d', color: '#fff', padding: '18px 22px', borderRadius: 8, border: '1px solid #222', minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>Pure<span style={{ color: '#A066FF' }}>Pulse</span></span>
                      <span style={{ fontSize: '0.65rem', color: '#A066FF', fontWeight: 700, letterSpacing: '0.08em' }}>OFFICIAL PARTNER</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>{affiliate.name}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>Partner Code: {affiliate.referral_code}</p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrSvgUrl} alt="QR" width={48} height={48} style={{ background: '#fff', padding: 2, borderRadius: 4 }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={qrPngUrl} download={`purepulse-card-qr-${affiliate.referral_code}.png`} style={{ ...s.secondaryBtn, flex: 1, textAlign: 'center', textDecoration: 'none', display: 'inline-block' }}>
                      Download Card QR (PNG)
                    </a>
                  </div>
                </div>
              </div>

              {/* Vector QR & Brand Kit */}
              <div style={s.card}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>High-Res Vector QR &amp; Brand Kit</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Embed on your website, email signature, or custom prints</p>
                </div>
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSvgUrl} alt="QR" width={110} height={110} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 4 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <a
                      href={qrPngUrl}
                      download={`purepulse-qr-${affiliate.referral_code.toLowerCase()}.png`}
                      style={{ ...s.secondaryBtn, textAlign: 'center', textDecoration: 'none', fontSize: '0.8125rem' }}
                    >
                      <Download size={13} /> Download 1024px PNG
                    </a>
                    <a
                      href={qrSvgUrl}
                      download={`purepulse-qr-${affiliate.referral_code.toLowerCase()}.svg`}
                      style={{ ...s.secondaryBtn, textAlign: 'center', textDecoration: 'none', fontSize: '0.8125rem' }}
                    >
                      <Download size={13} /> Download Vector SVG
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: SOCIAL MEDIA CAMPAIGN STUDIO ── */}
        {activeTab === 'social' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Social Campaign Studio</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                Generate customized graphics, copy pre-written high-converting posts, and track clicks with custom tags.
              </p>
            </div>

            {/* Graphic Generator Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: 24, marginBottom: 32 }}>
              {/* Controls */}
              <div style={s.card}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>1. Customize Social Graphic</h3>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={s.fieldLabel}>Graphic Dimensions</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                      {[
                        { id: 'square', label: '1:1 Square', sub: 'Instagram / Feed' },
                        { id: 'story', label: '9:16 Story', sub: 'TikTok / Reels' },
                        { id: 'banner', label: '16:9 Banner', sub: 'Twitter / LinkedIn' },
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSocialFormat(f.id as SocialFormat)}
                          style={{
                            padding: '10px 8px',
                            borderRadius: 8,
                            border: socialFormat === f.id ? '2px solid #7B2FFF' : '1px solid #e5e7eb',
                            background: socialFormat === f.id ? '#fbf8ff' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.8125rem', color: socialFormat === f.id ? '#7B2FFF' : '#111' }}>{f.label}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.6875rem', color: '#9ca3af' }}>{f.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={s.fieldLabel}>Headline Hook</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {[
                        'Professional Websites Built for $150 Deposit.',
                        'Is Your Business Website Losing Mobile Customers?',
                        'Agency-Quality Websites Without the $5,000 Upfront Price.',
                        'Stop Worrying About Site Updates. Maintenance Included.',
                      ].map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSocialHeadline(h)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: socialHeadline === h ? '1.5px solid #7B2FFF' : '1px solid #f3f4f6',
                            background: socialHeadline === h ? '#f9f6ff' : '#fafafa',
                            color: socialHeadline === h ? '#7B2FFF' : '#374151',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          &quot;{h}&quot;
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={s.fieldLabel}>Custom Headline Text</label>
                    <input
                      style={s.input}
                      value={socialHeadline}
                      onChange={e => setSocialHeadline(e.target.value)}
                      placeholder="Type your own headline..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={downloadGraphic} style={{ ...s.primaryBtn, flex: 1 }}>
                      <Download size={15} /> Download Graphic (PNG)
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Canvas Preview */}
              <div style={{ ...s.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#0e0c15' }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 460,
                    borderRadius: 12,
                    boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                    objectFit: 'contain',
                  }}
                />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '14px 0 0' }}>
                  Rendered at high resolution (1080px+) for crisp sharing on all social platforms.
                </p>
              </div>
            </div>

            {/* Multi-Platform Caption & Script Library */}
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 16px' }}>
              2. Ready-to-Post Copy &amp; Scripts (1-Click Copy)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                {
                  id: 'linkedin',
                  platform: 'LinkedIn / Professional',
                  tag: 'Founder & B2B Angle',
                  body: `Most small business websites are either 5+ years outdated, horribly slow on mobile, or cost $5,000+ upfront from an agency.\n\nI partnered with PurePulse — they build high-converting, modern websites starting with just a $150 deposit, with full hosting and ongoing maintenance included.\n\nIf you or a business you know needs a refresh, check out their work here:\n${customCampaignUrl}\n\n#webdesign #entrepreneurship #smallbusiness #growth`,
                },
                {
                  id: 'twitter',
                  platform: 'X / Twitter Hook',
                  tag: 'Punchy & Viral',
                  body: `Your website has 3 seconds to convince a visitor to stay.\n\nIf your site is slow, outdated, or doesn't work on mobile, you're losing customers every day.\n\nPurePulse builds modern, ultra-fast websites starting with a $150 deposit (maintenance included).\n\nCheck them out 👉 ${customCampaignUrl}`,
                },
                {
                  id: 'instagram',
                  platform: 'Instagram / Threads',
                  tag: 'Visual & CTA',
                  body: `Stop paying thousands upfront for clunky websites that break. ⚡\n\nPurePulse designs and maintains sleek, high-performing websites starting with a flat $150 deposit.\n\n✨ Fast 2-4 week delivery\n✨ Unlimited monthly content updates\n✨ 24/7 uptime & hosting\n\nLink in bio or visit: ${customCampaignUrl} (Code: ${affiliate.referral_code})`,
                },
                {
                  id: 'dm',
                  platform: 'Cold DM / Local Outreach',
                  tag: 'Direct Pitch to Business Owners',
                  body: `Hey [Name]! Loved what you're doing with [Business Name]. I noticed your current website could load a bit faster on mobile and might be missing out on local search leads.\n\nI partner with PurePulse (purepulse.one) — they build ultra-fast, modern sites starting with a $150 deposit, including all monthly maintenance so you never have to touch code.\n\nTake a look at their portfolio here if you're open to exploring: ${customCampaignUrl}`,
                },
                {
                  id: 'tiktok',
                  platform: 'TikTok / Reels Video Script',
                  tag: '30-Second Speaking Script',
                  body: `[Point to camera]: "If you own a business and your website looks like it was made in 2014, watch this."\n\n[Screen recording of slow site]: "Agencies charge $5,000+ to build a site and disappear when something breaks."\n\n[Show purepulse.one]: "PurePulse builds custom, high-speed sites starting with a $150 deposit — and they handle all the monthly updates and hosting."\n\n"Link is in my bio to check them out!"`,
                },
                {
                  id: 'email',
                  platform: 'Email Intro to Network',
                  tag: 'Warm Introduction',
                  body: `Subject: Introducing PurePulse for your website\n\nHi [Name],\n\nWanted to quickly pass along a great web design team I work with — PurePulse.\n\nThey build clean, high-performance websites for businesses with a flat $150 deposit and affordable monthly maintenance plans that cover all updates, SEO, and hosting.\n\nYou can explore their live work and get started here:\n${customCampaignUrl}\n\nBest,\n${affiliate.name}`,
                },
              ].map(c => (
                <div key={c.id} style={s.card}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#111' }}>{c.platform}</p>
                      <span style={{ fontSize: '0.6875rem', color: '#7B2FFF', fontWeight: 600 }}>{c.tag}</span>
                    </div>
                    <button
                      onClick={() => copyText(c.body, 'caption', c.id)}
                      style={{
                        padding: '6px 12px',
                        background: copiedCaptionId === c.id ? '#22c55e' : '#111',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {copiedCaptionId === c.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.6, color: '#374151', maxHeight: 180, overflowY: 'auto' }}>
                      {c.body}
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Campaign Tag / UTM Link Builder */}
            <div style={s.card}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>3. Custom Campaign Link Builder</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  Tag your links so you can see where your clicks and conversions are coming from.
                </p>
              </div>
              <div style={{ padding: '20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280' }}>Campaign Source:</span>
                  <input
                    style={{ ...s.input, width: 140, padding: '8px 10px' }}
                    value={customTag}
                    onChange={e => setCustomTag(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder="e.g. instagram"
                  />
                </div>
                <code style={{ background: '#f3f4f6', padding: '8px 14px', borderRadius: 6, fontSize: '0.8125rem', color: '#7B2FFF', flex: 1, wordBreak: 'break-all' }}>
                  {customCampaignUrl}
                </code>
                <button
                  onClick={() => copyText(customCampaignUrl, 'link')}
                  style={s.primaryBtn}
                >
                  <Copy size={14} /> Copy Tagged Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: COMMISSIONS & REFERRALS ── */}
        {activeTab === 'commissions' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Commission &amp; Referral Tracking</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                Real-time breakdown of all clients who joined through your partner link.
              </p>
            </div>

            {/* Referrals table */}
            <div style={{ ...s.card, marginBottom: 28 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Client Referrals ({referrals.length})</h3>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{stats.active_referrals} active subscription{stats.active_referrals !== 1 ? 's' : ''}</span>
              </div>
              {referrals.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                  <Gift size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#374151' }}>No referrals yet</p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Share your flyer or social links to start earning monthly recurring commissions.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Client', 'Plan', 'Status', 'Your Monthly Commission', 'Referred On'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map(r => (
                        <tr key={r.id} style={s.tr}>
                          <td style={s.td}>
                            <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#111' }}>{r.clients?.name || 'Client'}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>{r.clients?.company || r.clients?.email}</p>
                          </td>
                          <td style={{ ...s.td, textTransform: 'capitalize' }}>{r.plan}</td>
                          <td style={s.td}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: 999,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: r.status === 'active' ? '#dcfce7' : r.status === 'pending' ? '#fef9c3' : '#fee2e2',
                              color: r.status === 'active' ? '#15803d' : r.status === 'pending' ? '#854d0e' : '#dc2626',
                              textTransform: 'capitalize',
                            }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontWeight: 800, color: '#111' }}>
                            {r.status === 'active' ? `$${Number(r.monthly_commission || 0).toFixed(2)}/mo` : '—'}
                          </td>
                          <td style={{ ...s.td, color: '#6b7280', fontSize: '0.8125rem' }}>
                            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Commission Payouts History */}
            <div style={s.card}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Commission Payout History</h3>
              </div>
              {commissions.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#9ca3af' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Commissions are calculated on the 1st of every month for active client subscriptions.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Period Month', 'Amount', 'Status', 'Paid Date'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map(c => (
                        <tr key={c.id} style={s.tr}>
                          <td style={s.td}>{new Date(c.period_month + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                          <td style={{ ...s.td, fontWeight: 800 }}>${Number(c.amount).toFixed(2)}</td>
                          <td style={s.td}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: 999,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: c.status === 'paid' ? '#dcfce7' : '#fef9c3',
                              color: c.status === 'paid' ? '#15803d' : '#854d0e',
                              textTransform: 'capitalize',
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ ...s.td, color: '#6b7280', fontSize: '0.8125rem' }}>
                            {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : 'Pending'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: PAYOUTS & BANKING ── */}
        {activeTab === 'payouts' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Payouts &amp; Bank Account</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                Connect your bank account via Stripe Connect for automatic monthly direct deposits.
              </p>
            </div>

            {/* Stripe Connect Card */}
            <div style={{ ...s.card, marginBottom: 28 }}>
              <div style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                <div style={{ maxWidth: 520 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>Stripe Connect Direct Deposit</span>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: affiliate.stripe_payouts_enabled ? '#dcfce7' : '#fef9c3',
                      color: affiliate.stripe_payouts_enabled ? '#15803d' : '#854d0e',
                    }}>
                      {affiliate.stripe_payouts_enabled ? '● Connected & Active' : '● Setup Required'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#555', lineHeight: 1.6 }}>
                    {affiliate.stripe_payouts_enabled
                      ? 'Your bank account is securely linked via Stripe. Monthly commission earnings are automatically deposited directly to your bank.'
                      : 'Link your checking or savings account. Stripe securely verifies your identity and handles automatic monthly commission deposits.'}
                  </p>

                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button
                      onClick={() => connectStripe(affiliate.stripe_payouts_enabled ? 'reauth' : undefined)}
                      disabled={connectingStripe}
                      style={s.primaryBtn}
                    >
                      {connectingStripe ? <RefreshCw size={14} className="animate-spin" /> : <Landmark size={14} />}
                      {affiliate.stripe_payouts_enabled ? 'Open Stripe Express Dashboard →' : 'Link Bank Account via Stripe →'}
                    </button>
                  </div>
                  {stripeError && <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: 10 }}>{stripeError}</p>}
                </div>

                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', minWidth: 220 }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>Payout Schedule</p>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem' }}>Monthly (1st-5th)</p>
                  <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: '#6b7280' }}>Min. threshold: $20.00</p>
                  <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>Security</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>🔒 256-Bit Encrypted via Stripe</p>
                </div>
              </div>
            </div>

            {/* Backup / Alternative Payout Preferences */}
            <div style={s.card}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Backup Payout Information (Optional)</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  If you prefer direct ACH transfer, PayPal, or Venmo as a fallback.
                </p>
              </div>

              <form onSubmit={saveBackupPayouts} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={s.fieldLabel}>Bank Name</label>
                    <input
                      style={s.input}
                      value={backupForm.bank_name}
                      onChange={e => setBackupForm({ ...backupForm, bank_name: e.target.value })}
                      placeholder="Chase, Wells Fargo, etc."
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Account Holder Name</label>
                    <input
                      style={s.input}
                      value={backupForm.account_holder_name}
                      onChange={e => setBackupForm({ ...backupForm, account_holder_name: e.target.value })}
                      placeholder="Full Name on Account"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={s.fieldLabel}>Routing Number (9 digits)</label>
                    <input
                      style={s.input}
                      value={backupForm.routing_number}
                      onChange={e => setBackupForm({ ...backupForm, routing_number: e.target.value })}
                      placeholder="XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Account Number (Last 4 digits)</label>
                    <input
                      style={s.input}
                      value={backupForm.account_number_last4}
                      onChange={e => setBackupForm({ ...backupForm, account_number_last4: e.target.value })}
                      placeholder="XXXX"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={s.fieldLabel}>PayPal Email (Optional)</label>
                    <input
                      style={s.input}
                      type="email"
                      value={backupForm.paypal_email}
                      onChange={e => setBackupForm({ ...backupForm, paypal_email: e.target.value })}
                      placeholder="paypal@example.com"
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Venmo Handle (Optional)</label>
                    <input
                      style={s.input}
                      value={backupForm.venmo_handle}
                      onChange={e => setBackupForm({ ...backupForm, venmo_handle: e.target.value })}
                      placeholder="@your-handle"
                    />
                  </div>
                </div>

                {backupSuccess && (
                  <p style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                    ✓ Payout preferences saved successfully.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingBackup}
                  style={{ ...s.primaryBtn, width: 'fit-content', marginTop: 8 }}
                >
                  {savingBackup ? 'Saving...' : 'Save Payout Details'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* FULL-PAGE PRINTABLE FLYER (EXACTLY 1 LETTER PAGE, ONLY VISIBLE ON PRINT) */}
      <div style={{ display: 'none' }} className="affiliate-print-flyer">
        {renderFlyerByTheme(selectedFlyerTheme, affiliate.name, affiliate.referral_code, baseReferralUrl, qrSvgUrl)}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FLYER THEME RENDERERS
───────────────────────────────────────────────────────────── */

function renderFlyerByTheme(theme: FlyerTheme, affiliateName: string, referralCode: string, referralUrl: string, qrUrl: string) {
  if (theme === 'clean-light') {
    return renderCleanLightFlyer(affiliateName, referralCode, referralUrl, qrUrl)
  }
  if (theme === 'business-roi') {
    return renderBusinessRoiFlyer(affiliateName, referralCode, referralUrl, qrUrl)
  }
  if (theme === 'tear-off') {
    return renderTearOffFlyer(affiliateName, referralCode, referralUrl, qrUrl)
  }
  return renderDarkNeonFlyer(affiliateName, referralCode, referralUrl, qrUrl)
}

// 1. Signature Dark Neon Flyer
function renderDarkNeonFlyer(affiliateName: string, referralCode: string, referralUrl: string, qrUrl: string) {
  return (
    <div style={{ width: '100%', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#08060d', color: '#ffffff', position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem 3.25rem 2rem', minHeight: '100%' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 75% 10%, rgba(123,47,255,0.32), transparent 55%), radial-gradient(circle at 10% 65%, rgba(0,212,255,0.18), transparent 50%)' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Pure<span style={{ color: '#A066FF' }}>Pulse</span></div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>WEB DESIGN &amp; DEVELOPMENT</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.12em', color: '#A066FF', marginBottom: '0.75rem', textTransform: 'uppercase' }}>YOUR NEXT WEBSITE SHOULD</div>
          <div style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.035em', marginBottom: '1.25rem' }}>MOVE<br /><span style={{ color: '#A066FF' }}>PEOPLE</span><br />FORWARD.</div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.0625rem', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 1.5rem' }}>Sharp aesthetics. Clean code. A website built to perform and built to last.</div>
          <div>
            <span style={{ display: 'inline-block', background: 'rgba(123,47,255,0.2)', border: '1px solid rgba(160,102,255,0.5)', borderRadius: 100, padding: '0.625rem 1.75rem', fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.06em', color: '#ffffff' }}>
              PROFESSIONAL WEBSITES FROM A $150 DEPOSIT
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'DESIGN', desc: 'A distinctive digital presence', color: '#A066FF' },
            { label: 'BUILD', desc: 'Fast, clean, responsive foundations', color: '#00D4FF' },
            { label: 'LAUNCH', desc: 'A site ready to make an impression', color: '#A066FF' },
          ].map(step => (
            <div key={step.label} style={{ textAlign: 'left', minWidth: 140, maxWidth: 165 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: step.color, display: 'inline-block' }} />
                {step.label}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'rgba(123,47,255,0.12)', border: '1px solid rgba(160,102,255,0.4)', borderRadius: 22, padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>Make your next move.</div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', lineHeight: 1.4 }}>Scan to explore our work and start a conversation.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#00D4FF', letterSpacing: '-0.01em' }}>purepulse.one</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                Partner Code: <strong style={{ color: '#A066FF' }}>{referralCode}</strong>
              </span>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/referral-mascot.png" alt="" width={80} height={100} style={{ flexShrink: 0, objectFit: 'contain' }} />

          <div style={{ background: '#ffffff', borderRadius: 14, padding: '0.625rem', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR" width={125} height={125} style={{ display: 'block' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Referred by <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{affiliateName}</strong> · Partner Code <strong style={{ color: '#A066FF' }}>{referralCode}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// 2. Studio Clean Light Flyer
function renderCleanLightFlyer(affiliateName: string, referralCode: string, referralUrl: string, qrUrl: string) {
  return (
    <div style={{ width: '100%', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', color: '#111111', position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem 3.25rem 2rem', minHeight: '100%', border: '1px solid #e5e7eb' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '2px solid #111', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.625rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Pure<span style={{ color: '#7B2FFF' }}>Pulse</span></div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', color: '#6b7280', textTransform: 'uppercase' }}>STUDIO WEB DESIGN &amp; CARE</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ display: 'inline-block', background: '#f3f4f6', color: '#111', padding: '6px 16px', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 800, marginBottom: 16 }}>
            TIRED OF PAYING $5,000+ FOR WEBSITES?
          </span>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.035em', margin: '0 0 16px' }}>
            High-Performance Websites.<br /><span style={{ color: '#7B2FFF' }}>From a $150 Deposit.</span>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: '#4b5563', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            Stop stressing about code, updates, and broken pages. We design, host, and maintain your entire website.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: '2rem' }}>
          {[
            { title: '⚡ Fast 2-4 Week Delivery', desc: 'Custom designs ready to convert clients' },
            { title: '🛠️ Unlimited Updates', desc: 'We handle changes so you can run your business' },
            { title: '🔒 Hosting & Security', desc: '24/7 uptime monitoring & security patches' },
          ].map(b => (
            <div key={b.title} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 14px', textAlign: 'left' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.875rem', color: '#111' }}>{b.title}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ background: '#111', color: '#fff', borderRadius: 18, padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '1.375rem', fontWeight: 800 }}>Scan to explore pricing &amp; portfolio</p>
            <p style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#9ca3af' }}>purepulse.one · Plans starting at $20/mo</p>
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
              Partner Code: <strong style={{ color: '#00D4FF' }}>{referralCode}</strong>
            </span>
          </div>

          <div style={{ background: '#fff', padding: 8, borderRadius: 12, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR" width={120} height={120} style={{ display: 'block' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 16, fontSize: '0.75rem', color: '#9ca3af' }}>
          Referred by <strong>{affiliateName}</strong> · purepulse.one
        </div>
      </div>
    </div>
  )
}

// 3. Business ROI Flyer
function renderBusinessRoiFlyer(affiliateName: string, referralCode: string, referralUrl: string, qrUrl: string) {
  return (
    <div style={{ width: '100%', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0812', color: '#ffffff', position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem 3.25rem 2rem', minHeight: '100%' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.625rem', fontWeight: 800 }}>Pure<span style={{ color: '#00D4FF' }}>Pulse</span></div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#00D4FF' }}>LOCAL BUSINESS GROWTH</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, lineHeight: 1.06, margin: '0 0 16px' }}>
            Is Your Website Costing You Customers?
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#d1d5db', lineHeight: 1.6, maxWidth: 540, margin: '0 auto' }}>
            75% of users judge a business’s credibility based on their website design. Let us modernize yours.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '24px', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: '#00D4FF' }}>WHAT YOU GET:</h3>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: '0.9375rem', color: '#e5e7eb' }}>
            <li><strong>Custom Web Design:</strong> Tailored to your brand, services, and local customers</li>
            <li><strong>$150 Deposit to Begin:</strong> No massive up-front capital outlay</li>
            <li><strong>Zero Maintenance Stress:</strong> We handle all updates, hosting, domain &amp; SSL</li>
            <li><strong>Google SEO Ready:</strong> Fast load times for high search rankings</li>
          </ul>
        </div>
      </div>

      <div>
        <div style={{ background: 'linear-gradient(135deg, rgba(123,47,255,0.2), rgba(0,212,255,0.2))', border: '1px solid rgba(0,212,255,0.4)', borderRadius: 20, padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '1.375rem', fontWeight: 800 }}>Start your project today</p>
            <p style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#d1d5db' }}>Scan to view plans from $20/mo</p>
            <span style={{ background: '#00D4FF', color: '#000', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
              Partner Code: {referralCode}
            </span>
          </div>
          <div style={{ background: '#fff', padding: 8, borderRadius: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR" width={120} height={120} style={{ display: 'block' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 14, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          Referred by {affiliateName} · purepulse.one
        </div>
      </div>
    </div>
  )
}

// 4. Tear-Off Bulletin Board Flyer
function renderTearOffFlyer(affiliateName: string, referralCode: string, referralUrl: string, qrUrl: string) {
  const tabs = Array.from({ length: 9 })
  return (
    <div style={{ width: '100%', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', color: '#111111', position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2.5rem 2.5rem 0', minHeight: '100%', border: '1px solid #e5e7eb' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '2px solid #111', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>Pure<span style={{ color: '#7B2FFF' }}>Pulse</span></div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', color: '#6b7280' }}>WEB DESIGN &amp; CARE</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.08, margin: '0 0 12px' }}>
            Need a Modern Website for Your Business?
          </h1>
          <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: 1.5, maxWidth: 500, margin: '0 auto' }}>
            Get a professional website built from a <strong>$150 deposit</strong>. Full ongoing maintenance, hosting &amp; updates included.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: '1.5rem' }}>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.875rem' }}>✨ Custom Design &amp; Code</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Fast, mobile-ready sites delivered in 2–4 weeks.</p>
          </div>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.875rem' }}>🛠️ We Handle All Updates</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Never worry about broken plugins or tech headaches.</p>
          </div>
        </div>

        <div style={{ background: '#111', color: '#fff', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Take a tab below or scan to visit purepulse.one</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Partner Code: {referralCode} · Referred by {affiliateName}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR" width={64} height={64} style={{ background: '#fff', padding: 2, borderRadius: 6 }} />
        </div>
      </div>

      {/* 9 Tear-off Tabs */}
      <div style={{ borderTop: '2px dashed #9ca3af', display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', marginTop: '2rem' }}>
        {tabs.map((_, i) => (
          <div
            key={i}
            style={{
              borderRight: i < 8 ? '1px dashed #d1d5db' : 'none',
              padding: '12px 4px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR" width={42} height={42} style={{ display: 'block', marginBottom: 6 }} />
            <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#111', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              purepulse.one
            </span>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#7B2FFF', marginTop: 4 }}>
              {referralCode}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CANVAS HELPER FUNCTIONS
───────────────────────────────────────────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill = true, stroke = false) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  let curY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, curY)
      line = words[n] + ' '
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, curY)
}

/* ─────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 20 },
  logo: { fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.03em', textDecoration: 'none', color: '#111' },
  partnerBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(123,47,255,0.08)', color: '#7B2FFF', padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 },
  signOutBtn: { fontSize: '0.8125rem', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' },
  tabsWrap: { background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 61, zIndex: 15 },
  tabsInner: { maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 6, overflowX: 'auto', padding: '0 24px' },
  tabBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 16px', border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' },
  main: { maxWidth: 1040, margin: '0 auto', padding: '28px 24px 80px' },
  linkBarCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '18px 22px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  linkBarLabel: { fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 2px' },
  linkCode: { background: '#f3f4f6', padding: '8px 12px', borderRadius: 6, fontSize: '0.875rem', color: '#374151', wordBreak: 'break-all' },
  copyBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' },
  testLinkBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', color: '#6b7280', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 600 },
  iconOnlyBtn: { background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bonusActiveBanner: { background: '#111', color: '#fff', borderRadius: 12, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 },
  bonusPendingBanner: { background: '#fef9ec', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 },
  bonusCtaBtn: { background: '#f59e0b', color: '#000', padding: '9px 18px', borderRadius: 8, fontWeight: 800, fontSize: '0.875rem', textDecoration: 'none', flexShrink: 0 },
  bonusActionBtn: { background: '#92400e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  metricCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '18px 20px' },
  metricLabel: { fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' },
  metricValue: { fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 2px' },
  metricSub: { fontSize: '0.75rem', color: '#9ca3af', margin: 0 },
  actionTile: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' },
  actionIconWrap: { width: 42, height: 42, borderRadius: 10, background: '#fafafa', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionTitle: { margin: '0 0 2px', fontSize: '0.9375rem', fontWeight: 800, color: '#111' },
  actionDesc: { margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 },
  card: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7B2FFF', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', color: '#111', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' },
  fieldLabel: { display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '10px 12px', fontSize: '0.875rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '14px 16px', fontSize: '0.875rem', color: '#374151' },
}
