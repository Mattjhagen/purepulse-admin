'use client'

import { useState, useEffect } from 'react'

const BRAND = {
  bg: '#07070D',
  accent: '#7B2FFF',
  accentLight: '#A066FF',
  text: '#F4F4FF',
  muted: '#888',
  border: '#1e1e2e',
}

function brandEmail(title: string, preview: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="display:none;max-height:0;overflow:hidden;color:#f4f4f8">${preview}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
      <!-- Header -->
      <tr>
        <td style="background:${BRAND.bg};padding:20px 32px;border-radius:12px 12px 0 0;text-align:center">
          <span style="font-size:20px;font-weight:800;letter-spacing:-0.05em;color:#F4F4FF">Pure<span style="color:${BRAND.accent}">Pulse</span></span>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:36px 32px;border:1px solid #e5e7eb;border-top:none">
          ${bodyHtml}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#f9f9fc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#999">PurePulse Technology Solutions</p>
          <p style="margin:0;font-size:11px;color:#bbb">You're receiving this because you're a valued client or lead.<br>
          <a href="mailto:matty@purepulse.one" style="color:${BRAND.accent}">Unsubscribe</a> &nbsp;·&nbsp; <a href="https://purepulse.one" style="color:${BRAND.accent}">Visit our site</a></p>
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
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999">Welcome</p>
      <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#07070D">Hi {{name}}, welcome to PurePulse! 👋</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7">We're thrilled to have you on board. PurePulse is your dedicated technology partner — handling everything from IT support to digital strategy so you can focus on what you do best.</p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7">Here's what you can expect from us:</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr><td style="padding:6px 0;font-size:14px;color:#444">✅ &nbsp;Fast, responsive IT support</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#444">✅ &nbsp;Proactive monitoring & maintenance</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#444">✅ &nbsp;Clear communication, always</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#444">✅ &nbsp;A partner invested in your success</td></tr>
      </table>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7">Have a question or need help with anything? Just reply to this email — we're here for you.</p>
      <a href="https://login.purepulse.one" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">Access Your Portal →</a>
      <p style="margin:32px 0 0;font-size:14px;color:#666">Cheers,<br><strong>Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    subject: '📬 PurePulse Monthly — What\'s new this month',
    preview: 'Tech tips, updates, and what we\'ve been working on.',
    body: `
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999">Monthly Update</p>
      <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#07070D">Hi {{name}},</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#666">Here's your monthly roundup from PurePulse.</p>

      <div style="background:#f8f8ff;border-left:3px solid #7B2FFF;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B2FFF">This Month's Focus</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.6">Cybersecurity hygiene — making sure your systems are patched, passwords are strong, and backups are solid before Q4.</p>
      </div>

      <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#07070D">💡 Tech Tip of the Month</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.7"><strong>Enable multi-factor authentication (MFA)</strong> on every account you care about. It only takes 2 minutes and blocks over 99% of account takeover attacks. Start with email, then banking, then everything else.</p>

      <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#07070D">🛠️ What We've Been Working On</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.7">We've been upgrading our monitoring tools and improving response times. You should notice faster turnarounds on support tickets starting this month.</p>

      <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#07070D">📞 Need Something?</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.7">Submit a ticket, reply to this email, or text me directly. I'm always available.</p>

      <a href="https://login.purepulse.one/tickets" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">Submit a Support Ticket →</a>
      <p style="margin:32px 0 0;font-size:14px;color:#666">Until next month,<br><strong>Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'announcement',
    name: 'Service Announcement',
    subject: '🆕 Exciting new services from PurePulse',
    preview: 'We\'ve expanded our offerings — here\'s what\'s new.',
    body: `
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999">Announcement</p>
      <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#07070D">Hi {{name}}, we've expanded our services!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7">We're always looking for ways to provide more value to our clients. That's why we're excited to announce that PurePulse now offers:</p>

      <div style="margin-bottom:16px;padding:16px 20px;border:1px solid #e5e7eb;border-radius:10px">
        <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#07070D">🔒 Managed Cybersecurity</h3>
        <p style="margin:0;font-size:13px;color:#666;line-height:1.6">24/7 threat monitoring, endpoint protection, and security audits to keep your business safe.</p>
      </div>
      <div style="margin-bottom:16px;padding:16px 20px;border:1px solid #e5e7eb;border-radius:10px">
        <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#07070D">☁️ Cloud Migration & Management</h3>
        <p style="margin:0;font-size:13px;color:#666;line-height:1.6">Move to the cloud seamlessly with expert planning, migration, and ongoing management.</p>
      </div>
      <div style="margin-bottom:24px;padding:16px 20px;border:1px solid #e5e7eb;border-radius:10px">
        <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#07070D">📊 Business Intelligence Dashboards</h3>
        <p style="margin:0;font-size:13px;color:#666;line-height:1.6">Custom dashboards that give you real-time insight into your business metrics.</p>
      </div>

      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7">Interested in learning more? I'd love to schedule a quick call to see how these new services could benefit you.</p>
      <a href="mailto:matty@purepulse.one?subject=Interested in new services" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">Book a Call →</a>
      <p style="margin:32px 0 0;font-size:14px;color:#666">Best,<br><strong>Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'followup',
    name: 'Check-in / Follow-up',
    subject: 'Checking in — how\'s everything going?',
    preview: 'Just wanted to see how things are going on your end.',
    body: `
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#07070D">Hi {{name}},</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7">I wanted to take a moment to check in and see how everything is going on your end. It's been a while since we last connected, and I want to make sure you're getting everything you need from PurePulse.</p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7">A few questions:</p>
      <ul style="margin:0 0 24px;padding-left:20px">
        <li style="font-size:14px;color:#444;line-height:1.8;margin-bottom:6px">Is your technology working smoothly day-to-day?</li>
        <li style="font-size:14px;color:#444;line-height:1.8;margin-bottom:6px">Any recurring issues I should know about?</li>
        <li style="font-size:14px;color:#444;line-height:1.8;margin-bottom:6px">Anything on your tech roadmap I can help with?</li>
      </ul>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7">Feel free to reply directly to this email or use the button below to submit a ticket. I'm always here to help.</p>
      <a href="mailto:matty@purepulse.one?subject=Quick catch-up" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">Reply to This Email →</a>
      <p style="margin:32px 0 0;font-size:14px;color:#666">Talk soon,<br><strong>Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
  {
    id: 'referral',
    name: 'Referral Program',
    subject: '🎁 Know someone who could use PurePulse?',
    preview: 'Refer a friend and earn a reward — it\'s that simple.',
    body: `
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7B2FFF">Referral Program</p>
      <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#07070D">Hi {{name}}, share the love 💜</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7">We're growing, and we'd love your help! If you know a business owner who could benefit from reliable IT support and technology management, send them our way.</p>

      <div style="background:#f3eeff;border:1px solid #d4b8ff;padding:24px;border-radius:12px;margin-bottom:24px;text-align:center">
        <p style="margin:0 0 8px;font-size:13px;color:#7B2FFF;font-weight:600;text-transform:uppercase;letter-spacing:1px">For every referral that becomes a client</p>
        <p style="margin:0;font-size:36px;font-weight:800;color:#7B2FFF">1 Month Free</p>
        <p style="margin:4px 0 0;font-size:13px;color:#888">Added to your service plan</p>
      </div>

      <p style="margin:0 0 12px;font-size:15px;color:#444;line-height:1.7">It's simple:</p>
      <ol style="margin:0 0 24px;padding-left:20px">
        <li style="font-size:14px;color:#444;line-height:1.8;margin-bottom:8px">Forward this email or share our site: <strong>purepulse.one</strong></li>
        <li style="font-size:14px;color:#444;line-height:1.8;margin-bottom:8px">Have them mention your name when they reach out</li>
        <li style="font-size:14px;color:#444;line-height:1.8;margin-bottom:8px">Once they sign on — you get a free month!</li>
      </ol>

      <a href="mailto:matty@purepulse.one?subject=Referral" style="display:inline-block;background:#7B2FFF;color:#fff;padding:12px 28px;border-radius:100px;font-weight:700;text-decoration:none;font-size:14px">Send a Referral →</a>
      <p style="margin:32px 0 0;font-size:14px;color:#666">Thank you for being amazing,<br><strong>Matty Hagen</strong><br>PurePulse Technology Solutions</p>
    `,
  },
]

type Recipient = { id: string; name: string; email: string }

export default function MarketingPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [customSubject, setCustomSubject] = useState(TEMPLATES[0].subject)
  const [customBody, setCustomBody] = useState(TEMPLATES[0].body)
  const [recipientGroups, setRecipientGroups] = useState<string[]>(['clients'])
  const [previewMode, setPreviewMode] = useState(false)
  const [sending, setSending] = useState(false)
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

  async function handleSend() {
    if (!recipientGroups.length) return
    setSending(true)
    setResult(null)
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
          Send email campaigns to your clients and leads
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
                  background: selectedTemplate.id === t.id ? 'rgba(123,47,255,0.08)' : 'transparent',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
              >
                <p style={{
                  margin: '0 0 2px', fontSize: '13px', fontWeight: 600,
                  color: selectedTemplate.id === t.id ? '#7B2FFF' : 'var(--text)',
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
            }}
          >
            {sending ? 'Sending…' : `Send Campaign${totalRecipients > 0 ? ` (${totalRecipients})` : ''}`}
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
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: '#f4f4f8' }}>
              <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subject:</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{customSubject}</span>
              </div>
              <iframe
                srcDoc={previewHtml.replace(/\{\{name\}\}/g, 'Alex')}
                style={{ width: '100%', height: '700px', border: 'none' }}
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
