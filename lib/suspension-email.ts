import { formatMoney } from './utils'

export interface OverdueInvoiceSummary {
  invoiceNumber: string
  total: number
  dueDate: string
  daysOverdue: number
  paymentLink?: string | null
}

export interface SuspensionEmailData {
  clientName: string
  clientEmail: string
  companyName?: string | null
  websiteDomain: string
  invoiceNumber?: string
  totalOwed: number
  maxDaysOverdue: number
  suspensionDate: string
  terminationDate: string
  reason?: string
  paymentUrl: string
  portalUrl?: string
  invoices?: OverdueInvoiceSummary[]
  customNote?: string
}

export function inferClientDomain(client: { name: string; email: string; company?: string | null; notes?: string | null }): string {
  // If company looks like a domain name
  if (client.company && client.company.includes('.')) {
    return client.company.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
  // Check notes for domain pattern (e.g., domain.com, domain.space, domain.one)
  if (client.notes) {
    const domainMatch = client.notes.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|one|space|app|pro|io|co|xyz|me))\b/i)
    if (domainMatch) return domainMatch[1].toLowerCase()
  }
  // If company is set, make clean domain-like string or fallback
  if (client.company && client.company.trim()) {
    return `${client.company.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
  }
  // If email domain is custom (not gmail/yahoo/outlook/hotmail/icloud)
  if (client.email && client.email.includes('@')) {
    const domain = client.email.split('@')[1].toLowerCase()
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com']
    if (!genericDomains.includes(domain)) {
      return domain
    }
  }
  // Fallback to client name
  return `${client.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
}

export function renderSuspensionEmailHtml(data: SuspensionEmailData): string {
  const {
    clientName,
    clientEmail,
    websiteDomain,
    invoiceNumber = 'MULTIPLE-INV',
    totalOwed,
    maxDaysOverdue,
    suspensionDate,
    terminationDate,
    reason = 'Overdue invoices / contract non-fulfillment',
    paymentUrl,
    portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://login.purepulse.one/portal',
    invoices = [],
    customNote,
  } = data

  const formattedTotal = formatMoney(totalOwed)

  // Build invoice table rows if multiple invoices exist
  const invoiceRowsHtml = invoices.length > 0 ? invoices.map(inv => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(244, 244, 255, 0.08); font-size: 13px; color: #FFFFFF; font-family: monospace;">
        ${inv.invoiceNumber}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(244, 244, 255, 0.08); font-size: 13px; color: #FFB020; text-align: center;">
        +${inv.daysOverdue}d overdue
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(244, 244, 255, 0.08); font-size: 13.5px; font-weight: 700; color: #FF4D4D; text-align: right;">
        ${formatMoney(inv.total)}
      </td>
    </tr>
  `).join('') : `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(244, 244, 255, 0.08); font-size: 13px; color: #FFFFFF; font-family: monospace;">
        ${invoiceNumber}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(244, 244, 255, 0.08); font-size: 13px; color: #FFB020; text-align: center;">
        +${maxDaysOverdue}d overdue
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(244, 244, 255, 0.08); font-size: 13.5px; font-weight: 700; color: #FF4D4D; text-align: right;">
        ${formattedTotal}
      </td>
    </tr>
  `

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>URGENT: Website Services Suspended — PurePulse</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #07070D; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    a { color: #00D4FF; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn-primary:hover {
      background: #8e44ff !important;
      box-shadow: 0 0 24px rgba(123, 47, 255, 0.6) !important;
    }
    .btn-secondary:hover {
      background: rgba(123, 47, 255, 0.18) !important;
      border-color: #A066FF !important;
      color: #FFFFFF !important;
    }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .mobile-stack-center { display: block !important; width: 100% !important; text-align: center !important; }
      .summary-cell { padding: 10px 12px !important; }
      .btn-table { width: 100% !important; }
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #07070D !important; }
      .email-bg { background-color: #07070D !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #07070D; color: #F4F4FF; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Preheader preview text -->
  <div style="display: none; font-size: 1px; color: #07070D; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    URGENT NOTICE: Website services for ${websiteDomain} have been suspended due to overdue balance or contractual non-fulfillment. Take immediate action to restore your site.
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-bg" style="background-color: #07070D; background-image: radial-gradient(ellipse 110% 50% at 50% 0%, rgba(123,47,255,0.18) 0%, transparent 70%);">
    <tr>
      <td align="center" style="padding: 36px 16px 50px 16px;">
        
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #0E0E18; border: 1px solid rgba(123, 47, 255, 0.24); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px rgba(123, 47, 255, 0.1);">
          
          <!-- Top alert accent bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #FF4D4D 0%, #FF8C38 35%, #7B2FFF 70%, #00D4FF 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 40px 22px 40px; border-bottom: 1px solid rgba(244, 244, 255, 0.07);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="middle" align="left">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <span style="font-size: 26px; font-weight: 800; letter-spacing: -0.04em; color: #FFFFFF; text-decoration: none;">
                            Pure<span style="color: #A066FF;">Pulse</span>
                          </span>
                        </td>
                        <td valign="middle" style="padding-left: 10px;">
                          <span style="display: inline-block; width: 8px; height: 8px; background-color: #FF4D4D; border-radius: 50%; box-shadow: 0 0 8px #FF4D4D;"></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle" align="right" class="mobile-stack-center" style="padding-top: 4px;">
                    <a href="${portalUrl}" target="_blank" style="font-size: 13px; font-weight: 600; color: #00D4FF; text-decoration: none; display: inline-block;">
                      Client Portal&nbsp;↗
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td class="mobile-padding" style="padding: 26px 40px 8px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 77, 77, 0.08); border: 1px solid rgba(255, 77, 77, 0.35); border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="28" valign="middle" style="padding-right: 12px;">
                          <div style="font-size: 22px; line-height: 1; text-align: center;">⛔</div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #FF6B6B; margin-bottom: 3px;">
                            Account Suspension Notice
                          </div>
                          <div style="font-size: 15px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.01em;">
                            Website Services Temporarily Suspended
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 22px 40px 20px 40px;">
              
              <p style="margin: 0 0 16px 0; font-size: 15.5px; font-weight: 600; color: #F4F4FF; line-height: 1.5;">
                Hello ${clientName},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.65; color: rgba(244, 244, 255, 0.82);">
                This is an official administrative notice that active website hosting, DNS routing, and monthly maintenance services for <strong style="color: #FFFFFF;">${websiteDomain}</strong> have been <span style="color: #FF6B6B; font-weight: 700;">temporarily suspended</span> as of <strong style="color: #FFFFFF;">${suspensionDate}</strong>.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.65; color: rgba(244, 244, 255, 0.65);">
                Reason for suspension: <strong style="color: #FFFFFF;">${reason}</strong>. Under the terms of our PurePulse Service Agreement (Section 4 — Payment &amp; Continuity), active production services and ongoing maintenance are placed offline when accounts become delinquent.
              </p>

              ${customNote ? `
              <div style="background-color: rgba(123, 47, 255, 0.08); border-left: 3px solid #A066FF; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13.5px; color: rgba(244, 244, 255, 0.85); line-height: 1.55;">
                ${customNote}
              </div>
              ` : ''}

              <!-- Balance & Overdue Summary Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(123, 47, 255, 0.05); border: 1px solid rgba(123, 47, 255, 0.2); border-radius: 12px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px solid rgba(244, 244, 255, 0.08);">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td align="left">
                                <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A066FF;">
                                  Delinquent Invoices &amp; Timeline
                                </span>
                              </td>
                              <td align="right">
                                <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background-color: rgba(255, 77, 77, 0.18); color: #FF6B6B; border: 1px solid rgba(255, 77, 77, 0.3);">
                                  OFFLINE
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Invoice Breakdown Table -->
                      <tr>
                        <td colspan="2" style="padding-top: 10px; padding-bottom: 10px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <thead>
                              <tr>
                                <th align="left" style="font-size: 11px; color: rgba(244, 244, 255, 0.45); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px;">Invoice Ref</th>
                                <th align="center" style="font-size: 11px; color: rgba(244, 244, 255, 0.45); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px;">Status</th>
                                <th align="right" style="font-size: 11px; color: rgba(244, 244, 255, 0.45); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px;">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${invoiceRowsHtml}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colspan="2" style="padding-top: 12px; font-size: 13.5px; font-weight: 700; color: #FFFFFF;">
                                  Total Balance Due:
                                </td>
                                <td align="right" style="padding-top: 12px; font-size: 18px; font-weight: 800; color: #FF4D4D;">
                                  ${formattedTotal}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>

                      <!-- Additional Meta Info -->
                      <tr>
                        <td colspan="2" style="padding-top: 10px; border-top: 1px solid rgba(244, 244, 255, 0.08);">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-size: 12.5px; color: rgba(244, 244, 255, 0.55); padding: 4px 0;">Target Website:</td>
                              <td align="right" style="font-size: 13px; font-weight: 600; color: #FFFFFF; padding: 4px 0;">${websiteDomain}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12.5px; color: rgba(244, 244, 255, 0.55); padding: 4px 0;">Suspension Effective Date:</td>
                              <td align="right" style="font-size: 13px; font-weight: 600; color: rgba(244, 244, 255, 0.85); padding: 4px 0;">${suspensionDate}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12.5px; color: rgba(244, 244, 255, 0.55); padding: 4px 0;">Data Retention Cutoff:</td>
                              <td align="right" style="font-size: 13px; font-weight: 700; color: #FF8C38; padding: 4px 0;">${terminationDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>

              <!-- Impact Section -->
              <div style="font-size: 14px; font-weight: 700; letter-spacing: -0.01em; color: #FFFFFF; margin-bottom: 12px;">
                Impact on Your Services
              </div>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 26px;">
                <tr>
                  <td width="22" valign="top" style="padding-bottom: 11px; font-size: 14px; color: #FF4D4D; font-weight: bold;">✕</td>
                  <td style="padding-bottom: 11px; padding-left: 8px; font-size: 13.5px; line-height: 1.5; color: rgba(244, 244, 255, 0.75);">
                    <strong style="color: #F4F4FF;">Live Web Traffic Halted:</strong> Visitors navigating to <span style="color: #00D4FF; font-weight: 500;">${websiteDomain}</span> are currently redirected to an offline service suspension screen.
                  </td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="padding-bottom: 11px; font-size: 14px; color: #FF4D4D; font-weight: bold;">✕</td>
                  <td style="padding-bottom: 11px; padding-left: 8px; font-size: 13.5px; line-height: 1.5; color: rgba(244, 244, 255, 0.75);">
                    <strong style="color: #F4F4FF;">Maintenance &amp; SLA Paused:</strong> Code updates, bug fixes, automated SSL refreshes, and scheduled maintenance tasks are frozen.
                  </td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="font-size: 14px; color: #FF4D4D; font-weight: bold;">✕</td>
                  <td style="padding-left: 8px; font-size: 13.5px; line-height: 1.5; color: rgba(244, 244, 255, 0.75);">
                    <strong style="color: #F4F4FF;">Connected Relays &amp; APIs:</strong> Associated webhook integrations, contact form relays, and automated backend scripts have been restricted.
                  </td>
                </tr>
              </table>

              <!-- Steps to Restore -->
              <div style="background-color: rgba(0, 212, 255, 0.04); border-left: 3px solid #00D4FF; border-radius: 0 10px 10px 0; padding: 16px 18px; margin-bottom: 28px;">
                <div style="font-size: 13.5px; font-weight: 700; color: #00D4FF; margin-bottom: 6px;">
                  3 Steps to Restore Your Website Immediately:
                </div>
                <div style="font-size: 13px; line-height: 1.6; color: rgba(244, 244, 255, 0.78);">
                  <strong>1. Pay Outstanding Balance:</strong> Click the button below to settle all overdue balances securely via Stripe.<br />
                  <strong>2. Automated Reactivation:</strong> Once payment clears, our server containers and DNS zones are automatically queued for rapid restoration within <strong>1–2 hours</strong>.<br />
                  <strong>3. Need Assistance?</strong> If you have already paid or need to discuss a payment arrangement, reply directly to this email or contact <a href="mailto:billing@purepulse.one" style="color:#00D4FF">billing@purepulse.one</a>.
                </div>
              </div>

              <!-- Action Buttons -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="btn-table" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${paymentUrl}" style="height:48px;v-text-anchor:middle;width:290px;" arcsize="25%" strokecolor="#7B2FFF" fillcolor="#7B2FFF">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:'Inter', sans-serif;font-size:15px;font-weight:bold;">Pay ${formattedTotal} & Restore Site</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${paymentUrl}" target="_blank" class="btn-primary" style="display: block; background: #7B2FFF; color: #FFFFFF; font-size: 15px; font-weight: 700; text-align: center; text-decoration: none; padding: 15px 28px; border-radius: 12px; letter-spacing: -0.01em; box-shadow: 0 4px 20px rgba(123, 47, 255, 0.42); transition: all 0.2s ease;">
                            Pay ${formattedTotal} &amp; Restore Site →
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="${portalUrl}" target="_blank" class="btn-secondary" style="display: inline-block; background: rgba(123, 47, 255, 0.08); border: 1px solid rgba(123, 47, 255, 0.3); color: #F4F4FF; font-size: 13.5px; font-weight: 600; text-align: center; text-decoration: none; padding: 11px 22px; border-radius: 10px; transition: all 0.2s ease;">
                            Open PurePulse Client Portal
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Retention Notice -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 176, 32, 0.06); border: 1px dashed rgba(255, 176, 32, 0.4); border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #FFB020; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">
                      ⚠️ Final Data Preservation Notice
                    </div>
                    <div style="font-size: 12.5px; line-height: 1.55; color: rgba(244, 244, 255, 0.7);">
                      Your site source code, assets, database snapshots, and configurations are safely preserved in cold storage until <strong style="color: #FFFFFF;">${terminationDate}</strong>. If payment or a written settlement agreement is not confirmed by this date, infrastructure containers will be deprovisioned and DNS delegations released.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 6px 0; font-size: 13.5px; line-height: 1.6; color: rgba(244, 244, 255, 0.7);">
                If you have already made this payment in the last 2 hours, please allow time for bank clearance or reply with your transaction ID.
              </p>

              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.5; color: rgba(244, 244, 255, 0.9);">
                Sincerely,<br />
                <strong style="color: #FFFFFF;">PurePulse Administration &amp; Billing</strong><br />
                <span style="font-size: 12.5px; color: rgba(244, 244, 255, 0.5);">PurePulse Web Design &amp; Maintenance</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 40px 32px 40px; background-color: #07070D; border-top: 1px solid rgba(244, 244, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 12px; color: rgba(244, 244, 255, 0.45); line-height: 1.8;">
                <a href="${portalUrl}" target="_blank" style="color: rgba(244, 244, 255, 0.65); text-decoration: none;">Client Portal</a> &nbsp;&middot;&nbsp;
                <a href="https://purepulse.one" target="_blank" style="color: rgba(244, 244, 255, 0.65); text-decoration: none;">purepulse.one</a> &nbsp;&middot;&nbsp;
                <a href="mailto:billing@purepulse.one" style="color: rgba(244, 244, 255, 0.65); text-decoration: none;">billing@purepulse.one</a> &nbsp;&middot;&nbsp;
                <a href="https://purepulse.one#pricing" target="_blank" style="color: rgba(244, 244, 255, 0.65); text-decoration: none;">Terms &amp; Plans</a>
              </p>

              <p style="margin: 0 0 8px 0; font-size: 11px; line-height: 1.5; color: rgba(244, 244, 255, 0.3);">
                This is an automated administrative communication intended solely for ${clientName} (${clientEmail}) regarding account services for ${websiteDomain}.
              </p>

              <p style="margin: 0; font-size: 11px; color: rgba(244, 244, 255, 0.25);">
                &copy; 2026 PurePulse. All rights reserved. Clean, fast, professional websites built to perform and built to last.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>`
}

export function renderSuspensionEmailText(data: SuspensionEmailData): string {
  const {
    clientName,
    websiteDomain,
    invoiceNumber = 'MULTIPLE-INV',
    totalOwed,
    maxDaysOverdue,
    suspensionDate,
    terminationDate,
    reason = 'Overdue invoices / contract non-fulfillment',
    paymentUrl,
    portalUrl = 'https://login.purepulse.one/portal',
    invoices = [],
  } = data

  const formattedTotal = formatMoney(totalOwed)
  const invoiceListText = invoices.length > 0
    ? invoices.map(i => `* ${i.invoiceNumber}: ${formatMoney(i.total)} (+${i.daysOverdue}d overdue)`).join('\n')
    : `* ${invoiceNumber}: ${formattedTotal} (+${maxDaysOverdue}d overdue)`

  return `================================================================================
URGENT NOTICE: WEBSITE SERVICES SUSPENDED
PurePulse Web Design & Maintenance
================================================================================

Hello ${clientName},

This is an official administrative notification that active website hosting, 
domain DNS routing, and monthly maintenance services for ${websiteDomain} 
have been TEMPORARILY SUSPENDED effective ${suspensionDate}.

Reason: ${reason}

--------------------------------------------------------------------------------
ACCOUNT & DELINQUENT INVOICE SUMMARY
--------------------------------------------------------------------------------
* Website / Domain:        ${websiteDomain}
* Total Amount Past Due:   ${formattedTotal}
* Days Overdue:            ${maxDaysOverdue} Days
* Suspension Date:         ${suspensionDate}
* Data Retention Deadline: ${terminationDate}

Invoices:
${invoiceListText}

--------------------------------------------------------------------------------
IMPACT ON YOUR SERVICES
--------------------------------------------------------------------------------
[X] Live Web Traffic Halted: Visitors to ${websiteDomain} are currently 
    redirected to a standard service suspension notice.
[X] Maintenance Paused: Code updates, bug fixes, SSL renewals, and SLA 
    tasks are on hold.
[X] Connected Relays Restricted: Contact form relays, webhook automations, 
    and connected backend APIs are paused.

--------------------------------------------------------------------------------
HOW TO RESTORE YOUR WEBSITE IMMEDIATELY
--------------------------------------------------------------------------------
1. Settle your outstanding balance via our secure Stripe checkout:
   ${paymentUrl}

2. Access the PurePulse Client Portal to review invoices or update payment methods:
   ${portalUrl}

3. Automated Reactivation: Once payment clears, server containers and DNS 
   routing will automatically re-deploy within 1–2 hours.

--------------------------------------------------------------------------------
FINAL DATA RETENTION NOTICE
--------------------------------------------------------------------------------
Your codebase, assets, and database backups will remain safely archived until 
${terminationDate}. If payment or an approved settlement plan is not received 
by this date, infrastructure containers will be permanently deprovisioned and 
domain DNS zones released.

If you have already submitted payment in the last 2 hours, please reply 
directly to this email with your confirmation reference.

Sincerely,
PurePulse Administration & Billing
https://purepulse.one
billing@purepulse.one

================================================================================
© 2026 PurePulse. All rights reserved.
================================================================================`
}
