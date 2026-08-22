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
  stripe_account_id?: string | null
  stripe_payouts_enabled?: boolean
  stripe_global_payout_recipient_id?: string | null
  stripe_payout_method_id?: string | null
  payout_onboarding_status?: string
  payouts_enabled?: boolean
  payout_country?: string
  payout_entity_type?: 'individual' | 'company'
  payout_requirements_due?: string[]
  payout_onboarded_at?: string | null
  last_payout_status_sync_at?: string | null
  payout_method?: string
  payout_details?: Record<string, unknown> | null
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
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark')
  const [downloadingCard, setDownloadingCard] = useState<string | null>(null)
  const [printMode, setPrintMode] = useState<'flyer' | 'cards'>('flyer')

  // Social Studio state
  const [socialFormat, setSocialFormat] = useState<SocialFormat>('square')
  const [socialHeadline, setSocialHeadline] = useState('Professional Websites Built for $150 Deposit.')
  const [customTag, setCustomTag] = useState('social')
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null)
  const [generatingGraphic, setGeneratingGraphic] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Stripe Global Payouts state
  const [payoutStatus, setPayoutStatus] = useState<string>(
    affiliate.payout_onboarding_status || (affiliate.payouts_enabled ? 'ready_for_payouts' : 'setup_required')
  )
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean>(
    Boolean(affiliate.payouts_enabled || affiliate.stripe_payouts_enabled)
  )
  const [payoutCountry, setPayoutCountry] = useState<string>(affiliate.payout_country || 'US')
  const [payoutEntityType, setPayoutEntityType] = useState<'individual' | 'company'>(
    affiliate.payout_entity_type || 'individual'
  )
  const [requirementsDue, setRequirementsDue] = useState<string[]>(
    Array.isArray(affiliate.payout_requirements_due) ? affiliate.payout_requirements_due : []
  )
  const [syncingPayoutStatus, setSyncingPayoutStatus] = useState(false)
  const [connectingGlobalPayouts, setConnectingGlobalPayouts] = useState(false)
  const [globalPayoutsError, setGlobalPayoutsError] = useState('')

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

    const features = [
      '✓ Custom design & clean code built to convert',
      '✓ Fully responsive & ultra-fast loading',
      '✓ $150 deposit to start — all plans include maintenance',
    ]

    if (socialFormat === 'banner') {
      // ── 16:9 BANNER (1200 x 630) ──
      const padX = 55

      // Header
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
      ctx.fillText('Pure', padX, 58)
      const pureWidth = ctx.measureText('Pure').width
      ctx.fillStyle = '#A066FF'
      ctx.fillText('Pulse', padX + pureWidth, 58)

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '600 15px system-ui, -apple-system, sans-serif'
      ctx.fillText('WEB DESIGN & MAINTENANCE', width - 330, 58)

      // Pill badge
      const badgeText = '⚡ HIGH PERFORMANCE WEBSITES'
      ctx.fillStyle = 'rgba(123,47,255,0.25)'
      roundRect(ctx, padX, 90, 280, 36, 18, true, false)
      ctx.strokeStyle = 'rgba(160,102,255,0.6)'
      ctx.lineWidth = 1.5
      roundRect(ctx, padX, 90, 280, 36, 18, false, true)

      ctx.fillStyle = '#A066FF'
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
      ctx.fillText(badgeText, padX + 16, 113)

      // Main Headline
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 40px system-ui, -apple-system, sans-serif'
      const endHeadY = wrapText(ctx, socialHeadline, padX, 175, width - (padX * 2), 50)

      // Feature highlights (compact)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '500 18px system-ui, -apple-system, sans-serif'
      let featY = Math.max(endHeadY + 38, 290)
      for (const f of features) {
        if (featY <= 420) {
          ctx.fillText(f, padX, featY)
          featY += 34
        }
      }

      // Bottom CTA Card
      const ctaY = 465
      const ctaHeight = 135
      ctx.fillStyle = 'rgba(123,47,255,0.15)'
      roundRect(ctx, padX, ctaY, width - (padX * 2), ctaHeight, 18, true, false)
      ctx.strokeStyle = 'rgba(160,102,255,0.5)'
      ctx.lineWidth = 1.5
      roundRect(ctx, padX, ctaY, width - (padX * 2), ctaHeight, 18, false, true)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
      ctx.fillText('Get Started at purepulse.one', padX + 28, ctaY + 48)

      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '500 17px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Partner Link: purepulse.one/pricing?ref=${affiliate.referral_code}`, padX + 28, ctaY + 86)

      // Code Pill inside CTA
      ctx.fillStyle = '#7B2FFF'
      roundRect(ctx, width - padX - 310, ctaY + 36, 280, 58, 12, true, false)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 19px monospace'
      ctx.fillText(`CODE: ${affiliate.referral_code}`, width - padX - 285, ctaY + 72)

    } else if (socialFormat === 'story') {
      // ── 9:16 STORY (1080 x 1920) ──
      const padX = 70

      // Brand Header
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
      ctx.fillText('Pure', padX, 140)
      const pureWidth = ctx.measureText('Pure').width
      ctx.fillStyle = '#A066FF'
      ctx.fillText('Pulse', padX + pureWidth, 140)

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '600 19px system-ui, -apple-system, sans-serif'
      ctx.fillText('WEB DESIGN & MAINTENANCE', padX, 190)

      // Top pill badge
      const badgeText = '⚡ HIGH PERFORMANCE WEBSITES'
      ctx.fillStyle = 'rgba(123,47,255,0.25)'
      roundRect(ctx, padX, 240, 360, 48, 24, true, false)
      ctx.strokeStyle = 'rgba(160,102,255,0.6)'
      ctx.lineWidth = 1.5
      roundRect(ctx, padX, 240, 360, 48, 24, false, true)

      ctx.fillStyle = '#A066FF'
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
      ctx.fillText(badgeText, padX + 24, 270)

      // Main Headline
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 66px system-ui, -apple-system, sans-serif'
      const endHeadY = wrapText(ctx, socialHeadline, padX, 390, width - (padX * 2), 80)

      // Feature highlights
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '500 27px system-ui, -apple-system, sans-serif'
      let featY = Math.max(endHeadY + 60, 920)
      for (const f of features) {
        ctx.fillText(f, padX, featY)
        featY += 60
      }

      // Bottom CTA Card
      const ctaY = 1520
      const ctaHeight = 270
      ctx.fillStyle = 'rgba(123,47,255,0.15)'
      roundRect(ctx, padX, ctaY, width - (padX * 2), ctaHeight, 24, true, false)
      ctx.strokeStyle = 'rgba(160,102,255,0.5)'
      ctx.lineWidth = 2
      roundRect(ctx, padX, ctaY, width - (padX * 2), ctaHeight, 24, false, true)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
      ctx.fillText('Get Started at purepulse.one', padX + 36, ctaY + 64)

      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '500 22px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Partner Link: purepulse.one/pricing?ref=${affiliate.referral_code}`, padX + 36, ctaY + 116)

      // Code Pill inside CTA
      ctx.fillStyle = '#7B2FFF'
      roundRect(ctx, padX + 36, ctaY + 155, 340, 68, 14, true, false)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 23px monospace'
      ctx.fillText(`CODE: ${affiliate.referral_code}`, padX + 64, ctaY + 198)

    } else {
      // ── 1:1 SQUARE (1080 x 1080) ──
      const padX = 60

      // Brand Header
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
      ctx.fillText('Pure', padX, 85)
      const pureWidth = ctx.measureText('Pure').width
      ctx.fillStyle = '#A066FF'
      ctx.fillText('Pulse', padX + pureWidth, 85)

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '600 17px system-ui, -apple-system, sans-serif'
      ctx.fillText('WEB DESIGN & MAINTENANCE', width - 360, 85)

      // Top pill badge
      const badgeText = '⚡ HIGH PERFORMANCE WEBSITES'
      ctx.fillStyle = 'rgba(123,47,255,0.25)'
      roundRect(ctx, padX, 130, 330, 42, 21, true, false)
      ctx.strokeStyle = 'rgba(160,102,255,0.6)'
      ctx.lineWidth = 1.5
      roundRect(ctx, padX, 130, 330, 42, 21, false, true)

      ctx.fillStyle = '#A066FF'
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
      ctx.fillText(badgeText, padX + 20, 157)

      // Main Headline
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 56px system-ui, -apple-system, sans-serif'
      const endHeadY = wrapText(ctx, socialHeadline, padX, 245, width - (padX * 2), 68)

      // Feature highlights
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '500 23px system-ui, -apple-system, sans-serif'
      let featY = Math.max(endHeadY + 48, 520)
      for (const f of features) {
        ctx.fillText(f, padX, featY)
        featY += 46
      }

      // Bottom CTA Card
      const ctaY = 860
      const ctaHeight = 160
      ctx.fillStyle = 'rgba(123,47,255,0.15)'
      roundRect(ctx, padX, ctaY, width - (padX * 2), ctaHeight, 22, true, false)
      ctx.strokeStyle = 'rgba(160,102,255,0.5)'
      ctx.lineWidth = 2
      roundRect(ctx, padX, ctaY, width - (padX * 2), ctaHeight, 22, false, true)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 27px system-ui, -apple-system, sans-serif'
      ctx.fillText('Get Started at purepulse.one', padX + 32, ctaY + 54)

      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '500 19px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Partner Link: purepulse.one/pricing?ref=${affiliate.referral_code}`, padX + 32, ctaY + 98)

      // Code Pill inside CTA
      ctx.fillStyle = '#7B2FFF'
      roundRect(ctx, width - padX - 320, ctaY + 44, 280, 64, 12, true, false)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px monospace'
      ctx.fillText(`CODE: ${affiliate.referral_code}`, width - padX - 295, ctaY + 83)
    }

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

  const syncPayoutStatus = useCallback(async () => {
    setSyncingPayoutStatus(true)
    setGlobalPayoutsError('')
    try {
      const res = await fetch('/api/affiliates/payouts/status')
      if (res.ok) {
        const data = await res.json()
        if (data.status) setPayoutStatus(data.status)
        if (typeof data.payouts_enabled === 'boolean') setPayoutsEnabled(data.payouts_enabled)
        if (Array.isArray(data.requirements_due)) setRequirementsDue(data.requirements_due)
        if (data.country) setPayoutCountry(data.country)
        if (data.entity_type) setPayoutEntityType(data.entity_type)
      }
    } catch (e) {
      console.error('Failed to sync payout status:', e)
    } finally {
      setSyncingPayoutStatus(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('tab') === 'payouts' || params.get('returned') === '1' || params.get('reauth') === '1') {
        setActiveTab('payouts')
        syncPayoutStatus()
      }
    }
  }, [syncPayoutStatus])

  async function startGlobalPayoutsOnboarding() {
    setConnectingGlobalPayouts(true)
    setGlobalPayoutsError('')
    try {
      const res = await fetch('/api/affiliates/payouts/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: payoutCountry,
          entity_type: payoutEntityType,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setGlobalPayoutsError(err instanceof Error ? err.message : 'Stripe Global Payouts setup failed.')
    } finally {
      setConnectingGlobalPayouts(false)
    }
  }

  // ── BUSINESS CARD 300 DPI CANVAS GENERATOR (Standard 3.5" x 2" / 1050x600 px) ──
  const generateBusinessCardCanvas = useCallback((side: 'front' | 'back', theme: 'dark' | 'light'): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const width = 1050
      const height = 600
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(canvas)

      const isDark = theme === 'dark'

      if (isDark) {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height)
        bgGrad.addColorStop(0, '#08060d')
        bgGrad.addColorStop(0.5, '#120a22')
        bgGrad.addColorStop(1, '#050308')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, width, height)

        const glow1 = ctx.createRadialGradient(width * 0.85, height * 0.15, 10, width * 0.85, height * 0.15, width * 0.5)
        glow1.addColorStop(0, 'rgba(123, 47, 255, 0.45)')
        glow1.addColorStop(1, 'transparent')
        ctx.fillStyle = glow1
        ctx.fillRect(0, 0, width, height)

        const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.85, 10, width * 0.15, height * 0.85, width * 0.45)
        glow2.addColorStop(0, 'rgba(0, 212, 255, 0.25)')
        glow2.addColorStop(1, 'transparent')
        ctx.fillStyle = glow2
        ctx.fillRect(0, 0, width, height)
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = '#7B2FFF'
        ctx.fillRect(0, 0, width, 8)
      }

      if (side === 'front') {
        const padX = 65

        // Top Brand Header
        ctx.fillStyle = isDark ? '#ffffff' : '#111827'
        ctx.font = 'bold 50px system-ui, -apple-system, sans-serif'
        ctx.fillText('Pure', padX, 95)
        const pureWidth = ctx.measureText('Pure').width
        ctx.fillStyle = isDark ? '#A066FF' : '#7B2FFF'
        ctx.fillText('Pulse', padX + pureWidth, 95)

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.65)' : '#6b7280'
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
        ctx.fillText('WEB DESIGN & 24/7 MAINTENANCE', padX, 130)

        // Top Right Partner Badge
        ctx.fillStyle = isDark ? 'rgba(123,47,255,0.25)' : '#f3f0ff'
        roundRect(ctx, width - 330, 56, 265, 42, 21, true, false)
        ctx.strokeStyle = isDark ? 'rgba(160,102,255,0.6)' : '#d8b4fe'
        ctx.lineWidth = 1.5
        roundRect(ctx, width - 330, 56, 265, 42, 21, false, true)

        ctx.fillStyle = isDark ? '#A066FF' : '#7B2FFF'
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
        ctx.fillText('⚡ OFFICIAL PARTNER', width - 298, 82)

        // Partner Name & Role
        ctx.fillStyle = isDark ? '#ffffff' : '#111827'
        ctx.font = '900 44px system-ui, -apple-system, sans-serif'
        ctx.fillText(affiliate.name, padX, 260)

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : '#4b5563'
        ctx.font = '600 20px system-ui, -apple-system, sans-serif'
        ctx.fillText('Authorized Growth & Sales Partner', padX, 300)

        // Partner Code Pill
        ctx.fillStyle = isDark ? '#7B2FFF' : '#7B2FFF'
        roundRect(ctx, padX, 360, 360, 68, 14, true, false)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 22px monospace'
        ctx.fillText(`CODE: ${affiliate.referral_code}`, padX + 28, 402)

        // Bottom Web Link
        ctx.fillStyle = isDark ? '#00D4FF' : '#7B2FFF'
        ctx.font = '900 28px system-ui, -apple-system, sans-serif'
        ctx.fillText('purepulse.one', width - 260, 520)

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : '#6b7280'
        ctx.font = '500 16px system-ui, -apple-system, sans-serif'
        ctx.fillText('High-Performing Business Websites', padX, 520)

        resolve(canvas)
      } else {
        // Back Side (Value Pitch + QR Code)
        const padX = 65

        // Headline & Subhead
        ctx.fillStyle = isDark ? '#ffffff' : '#111827'
        ctx.font = '900 34px system-ui, -apple-system, sans-serif'
        ctx.fillText('Websites Built to Convert.', padX, 90)

        ctx.fillStyle = isDark ? '#A066FF' : '#7B2FFF'
        ctx.font = 'bold 19px system-ui, -apple-system, sans-serif'
        ctx.fillText('$150 Deposit to Start · Maintenance Included', padX, 130)

        // Value Bullets
        const bullets = [
          '✓ Custom UI/UX Built for Your Business',
          '✓ 24/7 Hosting, SSL & Unlimited Updates',
          '✓ Sub-Second Speed & Google SEO Optimized',
        ]
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : '#374151'
        ctx.font = '500 18px system-ui, -apple-system, sans-serif'
        let bY = 195
        for (const b of bullets) {
          ctx.fillText(b, padX, bY)
          bY += 42
        }

        // Code Offer Box
        ctx.fillStyle = isDark ? 'rgba(123,47,255,0.25)' : '#f3f0ff'
        roundRect(ctx, padX, 360, 480, 56, 12, true, false)
        ctx.strokeStyle = isDark ? 'rgba(160,102,255,0.5)' : '#d8b4fe'
        ctx.lineWidth = 1.5
        roundRect(ctx, padX, 360, 480, 56, 12, false, true)

        ctx.fillStyle = isDark ? '#00D4FF' : '#7B2FFF'
        ctx.font = 'bold 18px monospace'
        ctx.fillText(`USE PARTNER CODE: ${affiliate.referral_code}`, padX + 20, 395)

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : '#6b7280'
        ctx.font = '500 15px system-ui, -apple-system, sans-serif'
        ctx.fillText(`purepulse.one/pricing?ref=${affiliate.referral_code}`, padX, 470)

        // Right QR Container
        const qrContainerX = 660
        const qrContainerY = 55
        const qrContainerW = 325
        const qrContainerH = 490

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb'
        roundRect(ctx, qrContainerX, qrContainerY, qrContainerW, qrContainerH, 20, true, false)
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'
        ctx.lineWidth = 1.5
        roundRect(ctx, qrContainerX, qrContainerY, qrContainerW, qrContainerH, 20, false, true)

        const qrImg = new Image()
        qrImg.crossOrigin = 'anonymous'
        qrImg.onload = () => {
          // White square for QR
          ctx.fillStyle = '#ffffff'
          roundRect(ctx, qrContainerX + 38, qrContainerY + 35, 250, 250, 16, true, false)
          ctx.drawImage(qrImg, qrContainerX + 48, qrContainerY + 45, 230, 230)

          ctx.fillStyle = isDark ? '#ffffff' : '#111827'
          ctx.font = 'bold 17px system-ui, -apple-system, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('SCAN WITH CAMERA', qrContainerX + qrContainerW / 2, qrContainerY + 328)

          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : '#6b7280'
          ctx.font = '500 13px system-ui, -apple-system, sans-serif'
          ctx.fillText('To explore work & claim offer', qrContainerX + qrContainerW / 2, qrContainerY + 355)

          ctx.fillStyle = isDark ? '#A066FF' : '#7B2FFF'
          ctx.font = 'bold 17px monospace'
          ctx.fillText(`CODE: ${affiliate.referral_code}`, qrContainerX + qrContainerW / 2, qrContainerY + 400)
          ctx.textAlign = 'left'

          resolve(canvas)
        }
        qrImg.onerror = () => {
          resolve(canvas)
        }
        qrImg.src = qrPngUrl
      }
    })
  }, [affiliate.name, affiliate.referral_code, qrPngUrl])

  async function downloadBusinessCard(side: 'front' | 'back', theme: 'dark' | 'light' = cardTheme) {
    setDownloadingCard(side)
    try {
      const canvas = await generateBusinessCardCanvas(side, theme)
      const link = document.createElement('a')
      link.download = `purepulse-businesscard-${side}-${theme}-${affiliate.referral_code.toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setDownloadingCard(null)
    }
  }

  async function downloadBusinessCardPackage(theme: 'dark' | 'light' = cardTheme) {
    setDownloadingCard('both')
    try {
      await downloadBusinessCard('front', theme)
      await new Promise(r => setTimeout(r, 450))
      await downloadBusinessCard('back', theme)
    } finally {
      setDownloadingCard(null)
    }
  }

  function printCardsSheet() {
    setPrintMode('cards')
    setTimeout(() => {
      window.print()
      setPrintMode('flyer')
    }, 250)
  }

  return (
    <div style={s.page}>
      {/* GLOBAL PRINT STYLES FOR FLYER & 10-CARD BUSINESS CARD SHEET */}
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
            display: ${printMode === 'flyer' ? 'flex' : 'none'} !important;
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
          .business-card-sheet-print {
            display: ${printMode === 'cards' ? 'grid' : 'none'} !important;
            grid-template-columns: repeat(2, 3.5in);
            grid-template-rows: repeat(5, 2in);
            justify-content: center;
            align-content: center;
            width: 8.5in;
            height: 11in;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: ${cardTheme === 'light' ? '#ffffff' : '#08060d'} !important;
            color: ${cardTheme === 'light' ? '#111111' : '#ffffff'} !important;
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="https://mattjhagen.github.io/PurePulseMeet/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#7B2FFF',
              border: '1px solid rgba(123, 47, 255, 0.35)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 6,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(123, 47, 255, 0.25)',
            }}
          >
            📱 Get Mobile App
          </a>

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
        {/* PROMINENT PUREPULSE PARTNER MOBILE APP BANNER */}
        <div style={{
          background: 'linear-gradient(135deg, #131526 0%, #0D0D14 100%)',
          border: '1.5px solid #3B1B7D',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 6px 20px rgba(123, 47, 255, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 340px' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7B2FFF, #5311C7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(123, 47, 255, 0.5)',
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>📱</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#F4F4FF' }}>
                  PurePulse Partner Mobile App & Live Huddles
                </span>
                <span style={{ background: 'rgba(123, 47, 255, 0.2)', border: '1px solid rgba(123, 47, 255, 0.4)', color: '#A78BFA', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                  iOS & Android
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.4 }}>
                Join live coaching video huddles, access DoorDash-style instant Stripe payouts, chat in channels, and get founder support on mobile.
              </p>
            </div>
          </div>

          <a
            href="https://mattjhagen.github.io/PurePulseMeet/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #7B2FFF, #6366F1)',
              color: '#fff',
              padding: '9px 20px',
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 14px rgba(123, 47, 255, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            Get Partner App Website <ArrowUpRight size={14} />
          </a>
        </div>


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

              <a
                href="https://mattjhagen.github.io/PurePulseMeet/"
                target="_blank"
                rel="noreferrer"
                style={{ ...s.actionTile, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ ...s.actionIconWrap, background: 'rgba(123,47,255,0.12)' }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#7B2FFF' }}>📱</span>
                </div>
                <div>
                  <h3 style={s.actionTitle}>Partner Mobile App</h3>
                  <p style={s.actionDesc}>Live video coaching huddles, instant payouts &amp; app chat.</p>
                </div>
              </a>
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

            {/* Print-Ready Business Cards (VistaPrint / Moo / Print-at-Home Compatible) */}
            <div style={{ ...s.card, marginBottom: 28 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Printable Business Cards (3.5&quot; × 2&quot;)</h3>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                      300 DPI · VistaPrint Ready
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
                    Standard US 3.5&quot; × 2.0&quot; layout (1050 × 600 px at 300 DPI). Ready for direct 1-click import into VistaPrint, Moo, GotPrint, or Print-at-Home.
                  </p>
                </div>

                {/* Theme & Side Selectors */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
                    <button
                      onClick={() => setCardSide('front')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: cardSide === 'front' ? '#fff' : 'transparent',
                        color: cardSide === 'front' ? '#7B2FFF' : '#6b7280',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: cardSide === 'front' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      Front Side
                    </button>
                    <button
                      onClick={() => setCardSide('back')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: cardSide === 'back' ? '#fff' : 'transparent',
                        color: cardSide === 'back' ? '#7B2FFF' : '#6b7280',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: cardSide === 'back' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      Back Side (QR)
                    </button>
                  </div>

                  <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
                    <button
                      onClick={() => setCardTheme('dark')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: cardTheme === 'dark' ? '#111' : 'transparent',
                        color: cardTheme === 'dark' ? '#fff' : '#6b7280',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Dark Neon
                    </button>
                    <button
                      onClick={() => setCardTheme('light')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: cardTheme === 'light' ? '#fff' : 'transparent',
                        color: cardTheme === 'light' ? '#111' : '#6b7280',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: cardTheme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      Clean Light
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'center' }}>
                {/* Visual Card Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      aspectRatio: '3.5 / 2',
                      borderRadius: 14,
                      padding: '22px 26px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: cardTheme === 'dark'
                        ? 'linear-gradient(135deg, #08060d 0%, #120a22 50%, #050308 100%)'
                        : '#ffffff',
                      color: cardTheme === 'dark' ? '#ffffff' : '#111827',
                      border: cardTheme === 'dark' ? '1.5px solid #28243d' : '1.5px solid #e5e7eb',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {cardTheme === 'light' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#7B2FFF' }} />
                    )}

                    {cardSide === 'front' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                              Pure<span style={{ color: cardTheme === 'dark' ? '#A066FF' : '#7B2FFF' }}>Pulse</span>
                            </div>
                            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: cardTheme === 'dark' ? 'rgba(255,255,255,0.6)' : '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                              WEB DESIGN &amp; MAINTENANCE
                            </div>
                          </div>
                          <span style={{
                            background: cardTheme === 'dark' ? 'rgba(123,47,255,0.25)' : '#f3f0ff',
                            border: cardTheme === 'dark' ? '1px solid rgba(160,102,255,0.6)' : '1px solid #d8b4fe',
                            color: cardTheme === 'dark' ? '#A066FF' : '#7B2FFF',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 100,
                          }}>
                            ⚡ OFFICIAL PARTNER
                          </span>
                        </div>

                        <div>
                          <p style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem', color: cardTheme === 'dark' ? '#fff' : '#111' }}>
                            {affiliate.name}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.6875rem', color: cardTheme === 'dark' ? 'rgba(255,255,255,0.7)' : '#4b5563' }}>
                            Authorized Growth &amp; Sales Partner
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            background: '#7B2FFF',
                            color: '#fff',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: 6,
                          }}>
                            CODE: {affiliate.referral_code}
                          </span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: cardTheme === 'dark' ? '#00D4FF' : '#7B2FFF' }}>
                            purepulse.one
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 14, height: '100%' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 900 }}>Websites Built to Convert.</p>
                              <p style={{ margin: '2px 0 6px', fontSize: '0.6875rem', fontWeight: 700, color: cardTheme === 'dark' ? '#A066FF' : '#7B2FFF' }}>
                                $150 Deposit · Maintenance Included
                              </p>
                              <div style={{ fontSize: '0.625rem', color: cardTheme === 'dark' ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: 1.4 }}>
                                <div>✓ Custom UI/UX Built to Convert</div>
                                <div>✓ 24/7 Hosting &amp; Unlimited Updates</div>
                                <div>✓ Sub-Second Speed &amp; SEO</div>
                              </div>
                            </div>

                            <div>
                              <div style={{
                                background: cardTheme === 'dark' ? 'rgba(123,47,255,0.2)' : '#f3f0ff',
                                border: cardTheme === 'dark' ? '1px solid rgba(160,102,255,0.4)' : '1px solid #d8b4fe',
                                borderRadius: 6,
                                padding: '3px 8px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: cardTheme === 'dark' ? '#00D4FF' : '#7B2FFF',
                              }}>
                                CODE: {affiliate.referral_code}
                              </div>
                              <span style={{ fontSize: '0.625rem', color: cardTheme === 'dark' ? 'rgba(255,255,255,0.5)' : '#6b7280', display: 'block', marginTop: 2 }}>
                                purepulse.one/pricing
                              </span>
                            </div>
                          </div>

                          <div style={{
                            width: 100,
                            borderRadius: 8,
                            background: cardTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                            border: cardTheme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 6,
                            textAlign: 'center',
                          }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrSvgUrl} alt="QR" width={68} height={68} style={{ background: '#fff', padding: 2, borderRadius: 4 }} />
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, marginTop: 4, textTransform: 'uppercase' }}>
                              SCAN CAMERA
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    Previewing {cardSide.toUpperCase()} ({cardTheme === 'dark' ? 'Dark Neon' : 'Clean Light'})
                  </p>
                </div>

                {/* Actions & VistaPrint Instructions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => downloadBusinessCard('front', cardTheme)}
                        disabled={downloadingCard === 'front'}
                        style={{ ...s.primaryBtn, flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}
                      >
                        {downloadingCard === 'front' ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                        Download Front (300 DPI)
                      </button>
                      <button
                        onClick={() => downloadBusinessCard('back', cardTheme)}
                        disabled={downloadingCard === 'back'}
                        style={{ ...s.secondaryBtn, flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}
                      >
                        {downloadingCard === 'back' ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                        Download Back (300 DPI)
                      </button>
                    </div>

                    <button
                      onClick={() => downloadBusinessCardPackage(cardTheme)}
                      disabled={downloadingCard === 'both'}
                      style={{ ...s.secondaryBtn, width: '100%', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700 }}
                    >
                      {downloadingCard === 'both' ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                      Download Both Sides (Front + Back Package)
                    </button>

                    <button
                      onClick={printCardsSheet}
                      style={{ ...s.secondaryBtn, width: '100%', justifyContent: 'center', fontSize: '0.8125rem' }}
                    >
                      <Printer size={13} /> Print 10-Card Sheet (Letter 8.5&quot; × 11&quot;)
                    </button>
                  </div>

                  {/* VistaPrint 3-Step Guide */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📦 How to print with VistaPrint / Moo:
                      </span>
                      <a
                        href="https://www.vistaprint.com/business-cards"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B2FFF', textDecoration: 'none' }}
                      >
                        Open VistaPrint <ArrowUpRight size={12} style={{ display: 'inline' }} />
                      </a>
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                      <li>Click <strong>&quot;Download Both Sides&quot;</strong> above to get the 300 DPI PNG files.</li>
                      <li>On VistaPrint, choose <strong>Standard (3.5&quot; × 2.0&quot; Horizontal)</strong> &gt; <strong>Upload Design</strong>.</li>
                      <li>Upload <strong>Front</strong> to Side 1 and <strong>Back</strong> to Side 2. Done!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Brand Kit & Vector QR */}
            <div style={s.card}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>High-Res Vector QR &amp; Brand Kit</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Embed on your website, email signature, or custom prints</p>
              </div>
              <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSvgUrl} alt="QR" width={110} height={110} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 4 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 240px' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Payouts &amp; Bank Account</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                    Manage your direct deposit bank account and view payout readiness.
                  </p>
                </div>
                <button
                  onClick={syncPayoutStatus}
                  disabled={syncingPayoutStatus}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} className={syncingPayoutStatus ? 'animate-spin' : ''} />
                  {syncingPayoutStatus ? 'Syncing...' : 'Sync Status'}
                </button>
              </div>
            </div>

            {/* Stripe Global Payouts Card */}
            <div style={{ ...s.card, marginBottom: 28 }}>
              <div style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                <div style={{ maxWidth: 540 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>Global Payouts Direct Deposit</span>
                    <span style={{
                      padding: '3px 12px',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background:
                        payoutStatus === 'ready_for_payouts' ? '#dcfce7' :
                        payoutStatus === 'verification_pending' ? '#dbeafe' :
                        payoutStatus === 'additional_information_required' ? '#ffedd5' :
                        payoutStatus === 'payouts_restricted' ? '#fee2e2' : '#fef9c3',
                      color:
                        payoutStatus === 'ready_for_payouts' ? '#15803d' :
                        payoutStatus === 'verification_pending' ? '#1e40af' :
                        payoutStatus === 'additional_information_required' ? '#9a3412' :
                        payoutStatus === 'payouts_restricted' ? '#991b1b' : '#854d0e',
                      border: `1px solid ${
                        payoutStatus === 'ready_for_payouts' ? '#86efac' :
                        payoutStatus === 'verification_pending' ? '#93c5fd' :
                        payoutStatus === 'additional_information_required' ? '#fdba74' :
                        payoutStatus === 'payouts_restricted' ? '#fca5a5' : '#fde047'
                      }`,
                    }}>
                      {
                        payoutStatus === 'ready_for_payouts' ? 'Ready for payouts' :
                        payoutStatus === 'verification_pending' ? 'Verification pending' :
                        payoutStatus === 'additional_information_required' ? 'Additional information required' :
                        payoutStatus === 'payouts_restricted' ? 'Payouts restricted' :
                        'Setup required'
                      }
                    </span>
                  </div>

                  <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.65 }}>
                    Set up your bank account through Stripe to receive automatic PurePulse affiliate commission payments. Stripe securely collects and verifies your payout information. You don’t need an existing Stripe account.
                  </p>

                  {/* Recipient Country & Entity Type Selection */}
                  {payoutStatus !== 'ready_for_payouts' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, maxWidth: 440 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                          Payout Country
                        </label>
                        <select
                          value={payoutCountry}
                          onChange={e => setPayoutCountry(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            fontSize: '0.875rem',
                          }}
                        >
                          <option value="US">United States (USD)</option>
                          <option value="CA">Canada (CAD)</option>
                          <option value="GB">United Kingdom (GBP)</option>
                          <option value="AU">Australia (AUD)</option>
                          <option value="DE">Germany (EUR)</option>
                          <option value="FR">France (EUR)</option>
                          <option value="ES">Spain (EUR)</option>
                          <option value="IT">Italy (EUR)</option>
                          <option value="NL">Netherlands (EUR)</option>
                          <option value="IE">Ireland (EUR)</option>
                          <option value="MX">Mexico (MXN)</option>
                          <option value="NZ">New Zealand (NZD)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                          Entity Type
                        </label>
                        <select
                          value={payoutEntityType}
                          onChange={e => setPayoutEntityType(e.target.value as 'individual' | 'company')}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            fontSize: '0.875rem',
                          }}
                        >
                          <option value="individual">Individual / Freelancer</option>
                          <option value="company">Business / Company</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {requirementsDue.length > 0 && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      marginBottom: 16,
                      fontSize: '0.8125rem',
                      color: '#92400e',
                    }}>
                      <strong>Pending requirements from Stripe:</strong> {requirementsDue.join(', ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button
                      onClick={startGlobalPayoutsOnboarding}
                      disabled={connectingGlobalPayouts}
                      style={{
                        ...s.primaryBtn,
                        padding: '10px 22px',
                        background: '#7B2FFF',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        borderRadius: 10,
                        boxShadow: '0 4px 14px rgba(123,47,255,0.3)',
                      }}
                    >
                      {connectingGlobalPayouts ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Landmark size={14} />
                      )}
                      {payoutStatus === 'ready_for_payouts' || payoutsEnabled
                        ? 'Manage Payout Information'
                        : 'Set Up Payouts with Stripe'}
                    </button>
                  </div>
                  {globalPayoutsError && <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: 10 }}>{globalPayoutsError}</p>}
                </div>

                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 22px', minWidth: 240 }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>Payout Schedule</p>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Monthly (1st–5th)</p>
                  <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#6b7280' }}>Min. threshold: $20.00</p>
                  <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>Security &amp; Privacy</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                    ✓ Stripe-Hosted Secure Verification
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#6b7280' }}>
                    Bank credentials are submitted directly to Stripe and never stored on PurePulse servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FULL-PAGE PRINTABLE FLYER (EXACTLY 1 LETTER PAGE, ONLY VISIBLE ON PRINT) */}
      <div style={{ display: 'none' }} className="affiliate-print-flyer">
        {renderFlyerByTheme(selectedFlyerTheme, affiliate.name, affiliate.referral_code, baseReferralUrl, qrSvgUrl)}
      </div>

      {/* 10-CARD PRINT-AT-HOME SHEET (AVERY 5371 / 8871 COMPATIBLE, ONLY VISIBLE ON PRINT) */}
      <div style={{ display: 'none' }} className="business-card-sheet-print">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '3.5in',
              height: '2in',
              padding: '0.18in',
              boxSizing: 'border-box',
              border: '1px dashed #d1d5db',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: cardTheme === 'light' ? '#ffffff' : '#08060d',
              color: cardTheme === 'light' ? '#111827' : '#ffffff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {cardSide === 'front' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      Pure<span style={{ color: cardTheme === 'light' ? '#7B2FFF' : '#A066FF' }}>Pulse</span>
                    </div>
                    <div style={{ fontSize: '0.45rem', fontWeight: 700, color: cardTheme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>
                      WEB DESIGN &amp; MAINTENANCE
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.45rem',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 999,
                    background: cardTheme === 'light' ? '#f3f0ff' : 'rgba(123,47,255,0.25)',
                    color: cardTheme === 'light' ? '#7B2FFF' : '#A066FF',
                  }}>
                    ⚡ OFFICIAL PARTNER
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.8125rem' }}>{affiliate.name}</div>
                  <div style={{ fontSize: '0.5rem', color: cardTheme === 'light' ? '#4b5563' : 'rgba(255,255,255,0.7)' }}>
                    Authorized Growth &amp; Sales Partner
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: '#7B2FFF',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.55rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    CODE: {affiliate.referral_code}
                  </span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, color: cardTheme === 'light' ? '#7B2FFF' : '#00D4FF' }}>
                    purepulse.one
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900 }}>Websites Built to Convert.</div>
                      <div style={{ fontSize: '0.5rem', fontWeight: 700, color: cardTheme === 'light' ? '#7B2FFF' : '#A066FF' }}>
                        $150 Deposit · Maintenance Included
                      </div>
                      <div style={{ fontSize: '0.45rem', color: cardTheme === 'light' ? '#374151' : 'rgba(255,255,255,0.8)', lineHeight: 1.3, marginTop: 2 }}>
                        <div>✓ Custom UI/UX Built to Convert</div>
                        <div>✓ 24/7 Hosting &amp; Unlimited Edits</div>
                        <div>✓ Sub-Second Speed &amp; SEO</div>
                      </div>
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.48rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        color: cardTheme === 'light' ? '#7B2FFF' : '#00D4FF',
                      }}>
                        CODE: {affiliate.referral_code}
                      </span>
                      <div style={{ fontSize: '0.42rem', color: cardTheme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)' }}>
                        purepulse.one/pricing
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: 54,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrSvgUrl} alt="QR" width={44} height={44} style={{ background: '#fff', padding: 2, borderRadius: 2 }} />
                    <span style={{ fontSize: '0.4rem', fontWeight: 800, marginTop: 2 }}>SCAN</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
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
  return curY
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
