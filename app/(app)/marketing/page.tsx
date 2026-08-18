'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, Eye, Edit3, CheckCircle2, AlertCircle } from 'lucide-react'

const BRAND = {
  bg: '#07070D',
  cardBg: '#0E0E18',
  accent: '#7B2FFF',
  accentLight: '#A066FF',
  text: '#F4F4FF',
  muted: '#888',
  border: 'rgba(123,47,255,0.2)',
}

function brandEmail(title: string, preview: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#07070D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F4F4FF;">
<div style="display:none;max-height:0;overflow:hidden;color:#07070D">${preview}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070D;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0E0E18;border:1px solid rgba(123,47,255,0.25);border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <tr>
        <td style="padding:28px 32px 16px 32px;text-align:left;border-bottom:1px solid rgba(244,244,255,0.06);">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;">
            Pure<span style="color:#A066FF;">Pulse</span>
          </div>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px 32px 28px 32px;font-size:15px;line-height:1.7;color:rgba(244,244,255,0.88);">
          ${bodyHtml}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#090912;border-top:1px solid rgba(244,244,255,0.06);padding:20px 32px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:rgba(244,244,255,0.5);font-weight:600;">PurePulse Technology Solutions</p>
          <p style="margin:0;font-size:11px;color:rgba(244,244,255,0.35);">
            You are receiving this as a client or partner of PurePulse.<br>
            <a href="mailto:matty@purepulse.one" style="color:#A066FF;text-decoration:none;">Unsubscribe</a> &nbsp;·&nbsp; <a href="https://purepulse.one" style="color:#00D4FF;text-decoration:none;">purepulse.one</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

const TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to PurePulse — let\'s get started 🚀',
    preview: 'We\'re thrilled to have you on board.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Welcome</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, welcome to PurePulse! 👋</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We're thrilled to have you on board. PurePulse is your dedicated technology partner — handling everything from web architecture and custom software to active infrastructure maintenance.</p>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Here is what you can always count on from us:</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        <tr><td style="padding:6px 0;font-size:14px;color:rgba(244,244,255,0.85);">⚡ &nbsp;<strong style="color:#FFF;">Fast, responsive technical support</strong></td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:rgba(244,244,255,0.85);">🛡️ &nbsp;<strong style="color:#FFF;">Proactive monitoring & security maintenance</strong></td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:rgba(244,244,255,0.85);">💬 &nbsp;<strong style="color:#FFF;">Direct, clear communication always</strong></td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:rgba(244,244,255,0.85);">🎯 &nbsp;<strong style="color:#FFF;">A partner invested in your long-term growth</strong></td></tr>
      </table>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Have questions or need help with anything? Reply directly to this email anytime.</p>
      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">Access Your Portal →</a>
      </div>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best regards,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    subject: '📬 PurePulse Monthly — What\'s new this month',
    preview: 'Tech tips, updates, and what we\'ve been working on.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00D4FF;">Monthly Update</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}},</h1>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(244,244,255,0.75);">Here is your monthly roundup from PurePulse.</p>

      <div style="background:rgba(123,47,255,0.1);border-left:3px solid #7B2FFF;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#A066FF;">This Month's Focus</p>
        <p style="margin:0;font-size:14px;color:#FFFFFF;line-height:1.6;">Performance optimization, SSL automation, and database indexing updates across all managed client stacks.</p>
      </div>

      <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#FFFFFF;">💡 Tech Tip of the Month</h2>
      <p style="margin:0 0 20px;font-size:14px;color:rgba(244,244,255,0.8);line-height:1.7;">Always audit your custom domain DNS records twice a year. Stale CNAME records and forgotten forwarding rules can slow down page resolution and create security vulnerabilities.</p>

      <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#FFFFFF;">📞 Need Updates or Additions?</h2>
      <p style="margin:0 0 20px;font-size:14px;color:rgba(244,244,255,0.8);line-height:1.7;">Submit a ticket, reply to this email, or reach out directly. We're always here to assist.</p>

      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one/tickets" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">Submit a Support Ticket →</a>
      </div>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Until next month,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'announcement',
    name: 'Service Announcement',
    subject: '🆕 Exciting new services from PurePulse',
    preview: 'We\'ve expanded our offerings — here\'s what\'s new.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Announcement</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, we've expanded our capabilities!</h1>
      <p style="margin:0 0 20px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We're always expanding our infrastructure to deliver more value. Here are the latest additions available for your digital footprint:</p>

      <div style="margin-bottom:14px;padding:16px 20px;background:rgba(244,244,255,0.03);border:1px solid rgba(123,47,255,0.2);border-radius:10px;">
        <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;color:#FFFFFF;">⚡ Real-time Speed &amp; Lighthouse Optimization</h3>
        <p style="margin:0;font-size:13px;color:rgba(244,244,255,0.7);line-height:1.6;">Edge-cached asset delivery and core web vitals optimization for sub-second page loads.</p>
      </div>
      <div style="margin-bottom:14px;padding:16px 20px;background:rgba(244,244,255,0.03);border:1px solid rgba(123,47,255,0.2);border-radius:10px;">
        <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;color:#FFFFFF;">🤖 Custom AI &amp; Webhook Automations</h3>
        <p style="margin:0;font-size:13px;color:rgba(244,244,255,0.7);line-height:1.6;">Automate client onboarding, CRM sync, and custom invoicing workflows.</p>
      </div>

      <p style="margin:20px 0 20px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Interested in upgrading your workflow? Let's connect.</p>
      <div style="margin-bottom:28px;">
        <a href="mailto:matty@purepulse.one?subject=Interested in new services" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">Schedule a Call →</a>
      </div>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'followup',
    name: 'Check-in / Follow-up',
    subject: 'Checking in — how\'s everything going?',
    preview: 'Just wanted to see how things are going on your end.',
    body: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}},</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">I wanted to take a moment to check in and see how everything is performing on your end. We want to ensure your web presence and technical operations are running at 100%.</p>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">A quick pulse check:</p>
      <ul style="margin:0 0 20px;padding-left:20px;color:rgba(244,244,255,0.85);">
        <li style="margin-bottom:6px;font-size:14px;">Is your site and hosting operating smoothly?</li>
        <li style="margin-bottom:6px;font-size:14px;">Any new features or content updates you want to roll out?</li>
        <li style="margin-bottom:6px;font-size:14px;">Any upcoming business milestones we can support?</li>
      </ul>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Reply directly to this email anytime — I am always here to assist.</p>
      <div style="margin-bottom:28px;">
        <a href="mailto:matty@purepulse.one?subject=Quick catch-up" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">Reply to This Email →</a>
      </div>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Talk soon,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'referral',
    name: 'Referral Program',
    subject: '🎁 Know someone who could use PurePulse?',
    preview: 'Refer a friend and earn a reward — it\'s that simple.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Referral Program</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, share the love 💜</h1>
      <p style="margin:0 0 20px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Know another business owner or startup who needs high-performance web development, automated portals, or reliable management?</p>

      <div style="background:rgba(123,47,255,0.12);border:1px solid rgba(123,47,255,0.3);padding:20px;border-radius:12px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#A066FF;font-weight:700;text-transform:uppercase;letter-spacing:1px;">For every client referral</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:#FFFFFF;">1 Month Free</p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(244,244,255,0.6);">Credited to your account plan</p>
      </div>

      <div style="margin-bottom:28px;">
        <a href="mailto:matty@purepulse.one?subject=Client Referral" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">Send a Referral →</a>
      </div>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Thank you for your partnership,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
]

export default function MarketingPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [customSubject, setCustomSubject] = useState(TEMPLATES[0].subject)
  const [customBody, setCustomBody] = useState(TEMPLATES[0].body)
  const [recipientGroups, setRecipientGroups] = useState<string[]>(['clients'])
  const [previewMode, setPreviewMode] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [result, setResult] = useState<{ sent: number; failed: number; results?: { email: string; ok: boolean; error?: string }[]; error?: string } | null>(null)
  const [counts, setCounts] = useState<{ clients: number; leads: number }>({ clients: 0, leads: 0 })

  useEffect(() => {
    fetch('/api/marketing/broadcast')
      .then(r => r.json())
      .then(d => setCounts({ clients: d.clients?.length ?? 0, leads: d.leads?.length ?? 0 }))
      .catch(() => {})
  }, [])

  function pickTemplate(t: typeof TEMPLATES[0]) {
    setSelectedTemplate(t)
    setCustomSubject(t.subject)
    setCustomBody(t.body)
    setResult(null)
    setTestResult(null)
  }

  function toggleGroup(g: string) {
    setRecipientGroups(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  const previewHtml = brandEmail(customSubject, selectedTemplate.preview, customBody)

  const totalRecipients = [
    recipientGroups.includes('clients') ? counts.clients : 0,
    recipientGroups.includes('leads') ? counts.leads : 0,
  ].reduce((a, b) => a + b, 0)

  async function handleSendTest() {
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/marketing/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: customSubject,
          html: previewHtml,
          isTest: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTestResult(`❌ Test error: ${data.error ?? 'Failed to send'}`)
      } else {
        setTestResult('✅ Test email sent to matty@purepulse.one!')
      }
    } catch (e) {
      setTestResult(`❌ Test failed: ${String(e)}`)
    }
    setSendingTest(false)
  }

  async function handleSend() {
    if (!recipientGroups.length) return
    setSending(true)
    setResult(null)
    setTestResult(null)
    try {
      const res = await fetch('/api/marketing/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: customSubject, html: previewHtml, recipients: recipientGroups }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ sent: 0, failed: 1, error: data.error ?? 'Unknown error' })
      } else {
        setResult(data)
      }
    } catch (e) {
      setResult({ sent: 0, failed: 1, error: String(e) })
    }
    setSending(false)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Marketing Broadcasts</h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
          Send email campaigns to your clients and leads via Resend Batch API
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left panel — template picker + send controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Templates */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Templates</p>
            </div>
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => pickTemplate(t)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--border)',
                  background: selectedTemplate.id === t.id ? 'rgba(123,47,255,0.1)' : 'transparent',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
              >
                <p style={{
                  margin: '0 0 2px', fontSize: '13px', fontWeight: 600,
                  color: selectedTemplate.id === t.id ? '#A066FF' : 'var(--text)',
                }}>{t.name}</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
              </button>
            ))}
          </div>

          {/* Recipients */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Send To</p>
            {[
              { key: 'clients', label: 'Clients', count: counts.clients },
              { key: 'leads', label: 'Leads', count: counts.leads },
            ].map(({ key, label, count }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={recipientGroups.includes(key)}
                    onChange={() => toggleGroup(key)}
                    style={{ width: '15px', height: '15px', accentColor: '#7B2FFF' }}
                  />
                  <span style={{ fontSize: '14px' }}>{label}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--border)' }}>
                  {count}
                </span>
              </label>
            ))}
            {totalRecipients > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} total
              </p>
            )}
          </div>

          {/* Test send feedback */}
          {testResult && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: testResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${testResult.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              fontSize: '12.5px', color: testResult.startsWith('✅') ? '#10b981' : '#ef4444',
            }}>
              {testResult}
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px',
              background: result.error || result.failed ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${result.error || result.failed ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: result.error || result.failed ? '#ef4444' : '#10b981' }}>
                {result.error
                  ? `Error: ${result.error}`
                  : result.failed === 0
                    ? `✓ Sent to ${result.sent} recipient${result.sent !== 1 ? 's' : ''}`
                    : `${result.sent} sent, ${result.failed} failed`}
              </p>
              {result.results?.filter(r => !r.ok).map(r => (
                <p key={r.email} style={{ margin: '2px 0 0', fontSize: '11px', color: '#ef4444' }}>
                  {r.email}: {r.error}
                </p>
              ))}
            </div>
          )}

          {/* Test Button */}
          <button
            type="button"
            onClick={handleSendTest}
            disabled={sendingTest || sending}
            className="btn btn-ghost"
            style={{
              padding: '10px', borderRadius: '8px', fontSize: '13px',
              color: '#00D4FF', borderColor: 'rgba(0, 212, 255, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            {sendingTest ? <span className="spinner" /> : <><Mail size={13} /> Send Test to My Email</>}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || recipientGroups.length === 0 || totalRecipients === 0}
            style={{
              padding: '12px', borderRadius: '8px', border: 'none',
              background: '#7B2FFF', color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: sending || recipientGroups.length === 0 ? 'not-allowed' : 'pointer',
              opacity: sending || recipientGroups.length === 0 ? 0.6 : 1,
              transition: 'opacity 0.12s',
              boxShadow: '0 4px 16px rgba(123,47,255,0.3)',
            }}
          >
            {sending ? 'Sending Campaign…' : `Send Campaign${totalRecipients > 0 ? ` (${totalRecipients})` : ''}`}
          </button>
        </div>

        {/* Right panel — editor + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
            {(['edit', 'preview'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPreviewMode(tab === 'preview')}
                style={{
                  padding: '6px 16px', borderRadius: '6px', border: 'none',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: (tab === 'preview') === previewMode ? '#7B2FFF' : 'transparent',
                  color: (tab === 'preview') === previewMode ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.12s',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {previewMode ? (
            /* Preview */
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: '#07070D' }}>
              <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subject:</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>{customSubject}</span>
              </div>
              <iframe
                srcDoc={previewHtml.replace(/\{\{name\}\}/g, 'Alex')}
                style={{ width: '100%', height: '700px', border: 'none', background: '#07070D' }}
                title="Email Preview"
              />
            </div>
          ) : (
            /* Editor */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Subject Line</label>
                <input
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text)', fontSize: '14px', fontWeight: 500,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Email Body <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(HTML — use {'{{name}}'} for first name)</span>
                </label>
                <textarea
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  rows={28}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace',
                    lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
