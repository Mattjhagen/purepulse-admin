'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Trash2 } from 'lucide-react'

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

type MarketingTemplate = {
  id: string
  category: 'clients' | 'affiliates'
  name: string
  subject: string
  preview: string
  body: string
  custom?: boolean
}

const TEMPLATES: MarketingTemplate[] = [
  // --- CLIENT & LEAD TEMPLATES ---
  {
    id: 'welcome',
    category: 'clients',
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
    category: 'clients',
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
    category: 'clients',
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
    category: 'clients',
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
    category: 'clients',
    name: 'Client Referral Program',
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

  // --- AFFILIATE PARTNER TEMPLATES ---
  {
    id: 'affiliate-personal-welcome-call',
    category: 'affiliates',
    name: '👋 Affiliate Welcome & Personal Call',
    subject: 'Welcome to the PurePulse Affiliate Team!',
    preview: 'Thank you for joining PurePulse — Matty will give you a quick call this week.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Welcome to the Team</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, welcome to PurePulse! 👋</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Thank you for signing up to become a PurePulse affiliate. I’m excited to have you on the team!</p>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Sometime this week, I’ll give you a quick call to introduce myself, get to know you, hear what you hope to accomplish with PurePulse, and answer any questions you may have about the affiliate program.</p>

      <div style="background:rgba(123,47,255,0.12);border:1px solid rgba(123,47,255,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#FFFFFF;">We’re here to help you succeed</p>
        <p style="margin:0;font-size:14px;color:rgba(244,244,255,0.75);line-height:1.7;">Whether you need help understanding your affiliate link, using your dashboard, finding customers, or planning how to get started, PurePulse wants to make sure you have everything you need.</p>
      </div>

      <p style="margin:0 0 20px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">In the meantime, feel free to explore your affiliate dashboard and start sharing your unique link whenever you’re ready.</p>
      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one/affiliates/dashboard" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">Open Your Affiliate Dashboard →</a>
      </div>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Talk soon,<br><strong style="color:#FFF;">Matty Hagen</strong><br>Founder, PurePulse</p>
    `,
  },
  {
    id: 'affiliate-prescreen-technical-apology',
    category: 'affiliates',
    name: '⚠️ Technical Issue Apology & Pre-Screen Re-Submission',
    subject: '⚠️ Quick Update: Technical Fix & Pre-Screen Re-submission Link for PurePulse',
    preview: 'Our video pre-screen server encountered a temporary upload issue. Please submit your responses using the updated link.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">System Update &amp; Re-submission</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, apology for the technical glitch!</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We noticed you attempted to complete your PurePulse video pre-screen interview recently. Due to a temporary video compression issue on our upload server, a few video responses were not fully saved to your profile.</p>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We have upgraded our video processing engine. Please visit the updated link below to submit your responses one last time so our team can review and certify your application:</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="https://login.purepulse.one/interview" style="display:inline-block;background:linear-gradient(135deg, #7B2FFF, #00D4FF);color:#FFFFFF;font-weight:800;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;box-shadow:0 4px 16px rgba(123,47,255,0.4);">
          Record Pre-Screen Interview Now →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:rgba(244,244,255,0.6);">If you have any questions, reply directly to this email and our team will assist you immediately.</p>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best regards,<br><strong style="color:#FFF;">PurePulse Hiring Team</strong><br><a href="mailto:hiring@purepulse.one" style="color:#00D4FF;text-decoration:none;">hiring@purepulse.one</a></p>
    `,
  },
  {
    id: 'affiliate-portal-setup',
    category: 'affiliates',
    name: '🎥 Complete Video Pre-Screen',
    subject: '🎥 Next Step: Complete Your PurePulse Video Interview',
    preview: 'Record your responses to complete the next step in the PurePulse selection process.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Application Next Step</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, we'd like to learn more about you.</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Thank you for your interest in the PurePulse Affiliate Sales Partner opportunity. Please complete our virtual pre-screen interview so our hiring team can learn more about your outreach approach and communication style.</p>
      <div style="background:rgba(123,47,255,0.1);border:1px solid rgba(123,47,255,0.3);border-radius:12px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#FFFFFF;">🎥 What to expect</p>
        <p style="margin:0;font-size:13px;color:rgba(244,244,255,0.75);line-height:1.7;">Watch a brief role overview, record responses to guided questions, and complete a short sales roleplay. Use a smartphone, laptop, or tablet with a camera and microphone.</p>
      </div>
      <div style="text-align:center;margin:0 0 26px;">
        <a href="{{interview_url}}" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:14px 32px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">Complete My Video Interview →</a>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:rgba(244,244,255,0.65);line-height:1.6;">This is your personal interview link. Please do not forward it to another applicant. Once submitted, our hiring team will review your responses within 24–48 hours.</p>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best regards,<br><strong style="color:#FFF;">PurePulse Hiring Team</strong><br><a href="mailto:hiring@purepulse.one" style="color:#00D4FF;text-decoration:none;">hiring@purepulse.one</a></p>
    `,
  },
  {
    id: 'affiliate-welcome',
    category: 'affiliates',
    name: '🚀 Affiliate Welcome & Portal Launch',
    subject: '🚀 Welcome to PurePulse Affiliates — Your Portal & Assets Are Ready',
    preview: 'Your custom referral link, marketing assets, and commission dashboard are live.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Partner Network</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Welcome to the PurePulse Partner Program, {{name}}! 🎉</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Your affiliate account is fully active. You now earn <strong>up to 50% recurring monthly commission</strong> on every business client who subscribes through your link.</p>

      <div style="background:rgba(123,47,255,0.12);border:1px solid rgba(123,47,255,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#A066FF;text-transform:uppercase;letter-spacing:1px;">Recurring Commission Breakdown</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;color:rgba(244,244,255,0.9);font-size:14px;">
          <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Starter Plan ($20/mo):</td><td align="right" style="padding:6px 0;font-weight:700;color:#10B981;">10% ($2.00/mo)</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Growth Plan ($50/mo):</td><td align="right" style="padding:6px 0;font-weight:700;color:#10B981;">40% ($20.00/mo)</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Premium Plan ($75/mo):</td><td align="right" style="padding:6px 0;font-weight:700;color:#10B981;">45% ($33.75/mo)</td></tr>
          <tr><td style="padding:6px 0;">Business Plan ($100/mo):</td><td align="right" style="padding:6px 0;font-weight:700;color:#10B981;">50% ($50.00/mo)</td></tr>
        </table>
      </div>

      <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#FFFFFF;">🎯 What to do next:</h2>
      <ol style="margin:0 0 24px;padding-left:20px;color:rgba(244,244,255,0.85);line-height:1.7;">
        <li style="margin-bottom:8px;">Sign in to your partner portal to view your unique link and QR code.</li>
        <li style="margin-bottom:8px;">Download high-res printable flyers, tear-off tab posters, and business cards.</li>
        <li style="margin-bottom:8px;">Connect your bank account via Stripe in the Payouts &amp; Banking tab for direct deposits.</li>
        <li style="margin-bottom:8px;"><strong>Complete your 5-min Video Interview &amp; Onboarding:</strong> Visit <a href="https://login.purepulse.one/interview" style="color:#00D4FF;text-decoration:none;">login.purepulse.one/interview</a> to finalize your partner certification.</li>
        <li style="margin-bottom:8px;">Download our Mobile Partner Hub app for live video huddles, instant payouts, and direct founder chat.</li>
      </ol>

      <div style="background:#111118;border:1.5px solid #2D2D42;border-radius:12px;padding:20px 22px;margin:0 0 24px;text-align:center;color:#fff;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B83EB;">📱 Partner App</p>
        <p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#F4F4FF;">Download PurePulse Partner Mobile App</p>
        <p style="margin:0 0 14px;font-size:13px;color:#9CA3AF;line-height:1.5;">Join live coaching video huddles, access instant Stripe payouts, chat in channels, and track your MRR directly on mobile.</p>
        <a href="https://mattjhagen.github.io/PurePulseMeet/" style="display:inline-block;background:linear-gradient(135deg, #7B2FFF, #6366F1);color:#ffffff;padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:13px;box-shadow:0 4px 12px rgba(123,47,255,0.4);">📱 Download Partner App Website →</a>
      </div>

      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one/affiliates/login" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">Enter Partner Portal →</a>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">To your earning success,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Partner Program</p>
    `,
  },
  {
    id: 'affiliate-teams',
    category: 'affiliates',
    name: '📱 Download Partner Mobile App',
    subject: '📱 Download the PurePulse Partner Mobile App & Join Live Coaching Huddles',
    preview: 'Connect with the founders, join live coaching huddles, and access instant payouts.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7B83EB;">Partner App</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, let's close deals together! 🤝</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We've launched the official <strong>PurePulse Partner Mobile App</strong> for all active affiliates. Here you get direct, 1-on-1 access to live coaching video huddles and instant Stripe payouts.</p>

      <div style="background:rgba(123,47,255,0.15);border:1px solid rgba(123,47,255,0.35);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#FFFFFF;">Inside the Mobile App:</p>
        <ul style="margin:0;padding-left:18px;color:rgba(244,244,255,0.85);line-height:1.6;">
          <li style="margin-bottom:6px;"><strong>Live Video Huddles:</strong> Bring your prospective business leads and we'll help structure the pitch in live voice & video rooms.</li>
          <li style="margin-bottom:6px;"><strong>Instant Stripe Cashouts:</strong> DoorDash-style instant payouts to your debit card.</li>
          <li style="margin-bottom:6px;"><strong>Real-Time Channels:</strong> Slack-style strategy channels and 1-click marketing studio.</li>
        </ul>
      </div>

      <div style="margin-bottom:28px;">
        <a href="https://mattjhagen.github.io/PurePulseMeet/" style="display:inline-block;background:linear-gradient(135deg, #7B2FFF, #6366F1);color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">📱 Download Partner App Website →</a>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">See you on Teams,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Partner Program</p>
    `,
  },
  {
    id: 'affiliate-bonus',
    category: 'affiliates',
    name: '⭐ $49/mo Free Software Perk Challenge',
    subject: '⭐ Unlock Your Free $49/mo vibecodes.space Business Plan Perk',
    preview: 'Refer just 1 client this month to claim your complimentary business plan.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#10B981;">Monthly Partner Bonus</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, grab your free $49/mo software plan! 🎁</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Did you know you can unlock full, complimentary access to the <strong>vibecodes.space Business Plan ($49/mo value)</strong> every month you refer at least 1 client?</p>

      <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#10B981;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Monthly Performance Perk</p>
        <p style="margin:0;font-size:26px;font-weight:800;color:#FFFFFF;">1 Referral = Free Business Plan ($49/mo)</p>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(244,244,255,0.7);">Plus keep your 10%–50% recurring monthly cash commissions!</p>
      </div>

      <h2 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#FFFFFF;">💡 Quick Outreach Tip:</h2>
      <p style="margin:0 0 20px;font-size:14px;color:rgba(244,244,255,0.8);line-height:1.7;">Local business owners love our Growth &amp; Premium plans because they include zero-headache ongoing hosting, security updates, and instant text edits. Share your flyer or QR code with 3 local contacts today!</p>

      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one/affiliates/dashboard" style="display:inline-block;background:#10B981;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(16,185,129,0.35);">View Partner Dashboard &amp; Stats →</a>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Happy earning,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Partner Program</p>
    `,
  },
  {
    id: 'affiliate-assets',
    category: 'affiliates',
    name: '📄 New Marketing Assets & Flyers Hub',
    subject: '📄 New High-Converting Printable Flyers & Social Assets Ready',
    preview: 'Download fresh promotional materials customized with your QR code and referral link.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Marketing Hub Update</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, fresh marketing materials are waiting for you! 🎨</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">We've updated the <strong>Printable Assets Hub</strong> and <strong>Social Campaign Studio</strong> inside your affiliate portal with high-converting creative assets:</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
        <div style="background:rgba(244,244,255,0.04);border:1px solid rgba(123,47,255,0.2);padding:14px;border-radius:8px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#FFF;">📄 Printable Flyers &amp; Posters</p>
          <p style="margin:0;font-size:12px;color:rgba(244,244,255,0.65);line-height:1.5;">Full-page 8.5x11 flyers, tear-off tab posters for bulletin boards, and business card grids with embedded QR codes.</p>
        </div>
        <div style="background:rgba(244,244,255,0.04);border:1px solid rgba(123,47,255,0.2);padding:14px;border-radius:8px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#FFF;">📱 Social Media Studio</p>
          <p style="margin:0;font-size:12px;color:rgba(244,244,255,0.65);line-height:1.5;">Square 1:1, Story 9:16, and Banner 16:9 ready-to-post graphics with pre-written captions.</p>
        </div>
      </div>

      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one/affiliates/dashboard" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">Download Assets in Portal →</a>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best regards,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Partner Program</p>
    `,
  },
  {
    id: 'affiliate-payouts',
    category: 'affiliates',
    name: '💳 Commission Payouts & Stripe Setup',
    subject: '💳 Connect Your Bank Account for Direct Commission Deposits',
    preview: 'Ensure your Stripe Connect payout details are set up for monthly commission deposits.',
    body: `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#A066FF;">Payouts &amp; Banking</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi {{name}}, get set up for direct monthly deposits 💳</h1>
      <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">PurePulse distributes affiliate commissions on a monthly recurring basis directly to your bank account via Stripe Connect.</p>

      <div style="background:rgba(123,47,255,0.1);border:1px solid rgba(123,47,255,0.25);border-radius:12px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#FFFFFF;">How to set up direct deposit:</p>
        <ol style="margin:0;padding-left:18px;color:rgba(244,244,255,0.85);line-height:1.6;">
          <li style="margin-bottom:4px;">Log in to your partner portal.</li>
          <li style="margin-bottom:4px;">Click the <strong>Payouts &amp; Banking</strong> tab.</li>
          <li style="margin-bottom:4px;">Click <strong>Connect with Stripe</strong> and enter your routing &amp; account numbers.</li>
        </ol>
      </div>

      <div style="margin-bottom:28px;">
        <a href="https://login.purepulse.one/affiliates/dashboard" style="display:inline-block;background:#7B2FFF;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;box-shadow:0 4px 16px rgba(123,47,255,0.4);">Open Payouts Hub →</a>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Thank you for being a valued partner,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Partner Program</p>
    `,
  },
]

export default function MarketingPage() {
  const [customTemplates, setCustomTemplates] = useState<MarketingTemplate[]>([])
  const [templateFilter, setTemplateFilter] = useState<'all' | 'clients' | 'affiliates'>('all')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [customSubject, setCustomSubject] = useState(TEMPLATES[0].subject)
  const [customBody, setCustomBody] = useState(TEMPLATES[0].body)
  const [recipientGroups, setRecipientGroups] = useState<string[]>(['clients'])
  const [previewMode, setPreviewMode] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [result, setResult] = useState<{ sent: number; failed: number; results?: { email: string; ok: boolean; error?: string }[]; error?: string } | null>(null)
  const [counts, setCounts] = useState({ clients: 0, leads: 0, affiliates: 0, affiliatesContacted: 0, affiliatesNotContacted: 0 })
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateError, setTemplateError] = useState('')
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'affiliates' as 'clients' | 'affiliates', subject: '', preview: '', body: '' })

  useEffect(() => {
    fetch('/api/marketing/broadcast')
      .then(r => r.json())
      .then(d => setCounts({
        clients: d.clients?.length ?? 0,
        leads: d.leads?.length ?? 0,
        affiliates: d.affiliates?.length ?? 0,
        affiliatesContacted: d.affiliatesContacted?.length ?? 0,
        affiliatesNotContacted: d.affiliatesNotContacted?.length ?? 0,
      }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/marketing/templates')
      .then(r => r.json())
      .then(d => setCustomTemplates((d.templates ?? []).map((t: MarketingTemplate) => ({ ...t, custom: true }))))
      .catch(() => {})
  }, [])

  function pickTemplate(t: MarketingTemplate) {
    setSelectedTemplate(t)
    setCustomSubject(t.subject)
    setCustomBody(t.body)
    setResult(null)
    setTestResult(null)
    // Auto-select appropriate audience when picking template
    if (t.id === 'affiliate-portal-setup') {
      setRecipientGroups(['affiliates_not_contacted'])
    } else if (t.category === 'affiliates' && !recipientGroups.some(g => g.startsWith('affiliates'))) {
      setRecipientGroups(['affiliates'])
    } else if (t.category === 'clients' && recipientGroups.some(g => g.startsWith('affiliates')) && recipientGroups.length === 1) {
      setRecipientGroups(['clients'])
    }
  }

  async function saveTemplate() {
    setSavingTemplate(true)
    setTemplateError('')
    try {
      const res = await fetch('/api/marketing/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save template.')
      const saved = { ...data.template, custom: true } as MarketingTemplate
      setCustomTemplates(prev => [saved, ...prev])
      pickTemplate(saved)
      setNewTemplate({ name: '', category: 'affiliates', subject: '', preview: '', body: '' })
      setShowTemplateForm(false)
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'Could not save template.')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function deleteTemplate(template: MarketingTemplate) {
    if (!template.custom || !confirm(`Delete template "${template.name}"?`)) return
    const res = await fetch(`/api/marketing/templates?id=${encodeURIComponent(template.id)}`, { method: 'DELETE' })
    if (!res.ok) return
    setCustomTemplates(prev => prev.filter(t => t.id !== template.id))
    if (selectedTemplate.id === template.id) pickTemplate(TEMPLATES[0])
  }

  function toggleGroup(g: string) {
    setRecipientGroups(prev => {
      if (prev.includes(g)) return prev.filter(x => x !== g)
      if (g.startsWith('affiliates')) return [...prev.filter(x => !x.startsWith('affiliates')), g]
      return [...prev, g]
    })
  }

  const allTemplates = [...customTemplates, ...TEMPLATES]
  const filteredTemplates = templateFilter === 'all'
    ? allTemplates
    : allTemplates.filter(t => t.category === templateFilter)

  const previewHtml = brandEmail(customSubject, selectedTemplate.preview, customBody)

  const totalRecipients = [
    recipientGroups.includes('clients') ? counts.clients : 0,
    recipientGroups.includes('leads') ? counts.leads : 0,
    recipientGroups.includes('affiliates') ? counts.affiliates : 0,
    recipientGroups.includes('affiliates_contacted') ? counts.affiliatesContacted : 0,
    recipientGroups.includes('affiliates_not_contacted') ? counts.affiliatesNotContacted : 0,
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
        fetch('/api/marketing/broadcast')
          .then(r => r.json())
          .then(d => setCounts({
            clients: d.clients?.length ?? 0,
            leads: d.leads?.length ?? 0,
            affiliates: d.affiliates?.length ?? 0,
            affiliatesContacted: d.affiliatesContacted?.length ?? 0,
            affiliatesNotContacted: d.affiliatesNotContacted?.length ?? 0,
          }))
          .catch(() => {})
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
          Send email campaigns to your clients, leads, and affiliate partners via Resend Batch API
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left panel — template picker + send controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Templates */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Templates</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedTemplate.custom && (
                    <button type="button" onClick={() => deleteTemplate(selectedTemplate)} title="Delete selected template" style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button type="button" onClick={() => setShowTemplateForm(v => !v)} style={{ border: '1px solid rgba(123,47,255,0.4)', background: 'rgba(123,47,255,0.12)', color: '#A066FF', borderRadius: '5px', cursor: 'pointer', padding: '3px 7px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700 }}>
                    <Plus size={11} /> New
                  </button>
                  <span style={{ fontSize: '11px', color: '#A066FF', fontWeight: 600 }}>{filteredTemplates.length}</span>
                </div>
              </div>
              {/* Category Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {(['all', 'clients', 'affiliates'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplateFilter(cat)}
                    style={{
                      flex: 1, padding: '4px 0', border: 'none', borderRadius: '4px',
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      background: templateFilter === cat ? '#7B2FFF' : 'transparent',
                      color: templateFilter === cat ? '#fff' : 'var(--text-muted)',
                      textTransform: 'capitalize',
                      transition: 'all 0.12s',
                    }}
                  >
                    {cat === 'all' ? 'All' : cat === 'clients' ? 'Clients' : 'Affiliates'}
                  </button>
                ))}
              </div>
            </div>
            {showTemplateForm && (
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(123,47,255,0.05)' }}>
                <input value={newTemplate.name} onChange={e => setNewTemplate(v => ({ ...v, name: e.target.value }))} placeholder="Template name" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }} />
                <select value={newTemplate.category} onChange={e => setNewTemplate(v => ({ ...v, category: e.target.value as 'clients' | 'affiliates' }))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}>
                  <option value="affiliates">Affiliates</option>
                  <option value="clients">Clients</option>
                </select>
                <input value={newTemplate.subject} onChange={e => setNewTemplate(v => ({ ...v, subject: e.target.value }))} placeholder="Subject line" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }} />
                <input value={newTemplate.preview} onChange={e => setNewTemplate(v => ({ ...v, preview: e.target.value }))} placeholder="Preview text" style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }} />
                <textarea value={newTemplate.body} onChange={e => setNewTemplate(v => ({ ...v, body: e.target.value }))} placeholder="Email body HTML. Use {{name}} and {{interview_url}} when needed." rows={8} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace', resize: 'vertical' }} />
                {templateError && <p style={{ margin: 0, color: '#EF4444', fontSize: '11px' }}>{templateError}</p>}
                <button type="button" onClick={saveTemplate} disabled={savingTemplate} style={{ padding: '8px', border: 'none', borderRadius: '6px', background: '#7B2FFF', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {savingTemplate ? 'Saving…' : 'Save Template'}
                </button>
              </div>
            )}
            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
              {filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)',
                    background: selectedTemplate.id === t.id ? 'rgba(123,47,255,0.12)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                    <p style={{
                      margin: 0, fontSize: '12.5px', fontWeight: 600,
                      color: selectedTemplate.id === t.id ? '#A066FF' : 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.name}</p>
                    <span style={{
                      fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                      textTransform: 'uppercase', flexShrink: 0,
                      background: t.category === 'affiliates' ? 'rgba(123,47,255,0.2)' : 'rgba(0,212,255,0.15)',
                      color: t.category === 'affiliates' ? '#A066FF' : '#00D4FF',
                    }}>
                      {t.category === 'affiliates' ? 'Affiliate' : 'Client'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Send To</p>
            {[
              { key: 'clients', label: 'Clients', count: counts.clients },
              { key: 'leads', label: 'Leads', count: counts.leads },
              { key: 'affiliates', label: 'All Affiliates', count: counts.affiliates },
              { key: 'affiliates_not_contacted', label: 'Affiliates — Not Contacted', count: counts.affiliatesNotContacted },
              { key: 'affiliates_contacted', label: 'Affiliates — Contacted', count: counts.affiliatesContacted },
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
