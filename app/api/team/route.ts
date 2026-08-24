import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import crypto from 'crypto'
import { sendEmailSafely } from '@/lib/email'

export const dynamic = 'force-dynamic'

const ROLE_DETAILS: Record<string, { label: string; badgeColor: string; description: string; privileges: string[] }> = {
  admin: {
    label: 'Administrator',
    badgeColor: '#8B5CF6',
    description: 'You have been granted Full Administrator Privileges across the PurePulse agency platform.',
    privileges: [
      'Full access to Candidate Video Pre-Screens & Scorecards (/interviews)',
      'Manage Team Members, Roles & Compensation (/team)',
      'Client CRM, Contracts & Invoicing (/clients, /invoices)',
      'Affiliate Partner Management & Commission Payouts (/referrals)',
      'System Settings & Organization Preferences',
    ],
  },
  manager: {
    label: 'Manager',
    badgeColor: '#3B82F6',
    description: 'You have been granted Management Privileges to oversee candidates, projects, and team operations.',
    privileges: [
      'Review and score Candidate Video Pre-Screens (/interviews)',
      'Schedule In-Person Candidate Interviews',
      'Manage Client Projects & Deliverables (/projects)',
      'Assign tasks and monitor team time tracking (/time-clock)',
      'Lead qualification & client communications (/leads, /inbox)',
    ],
  },
  member: {
    label: 'Team Member',
    badgeColor: '#10B981',
    description: 'You have been added as a Core Team Member on the PurePulse agency portal.',
    privileges: [
      'Access assigned client projects and deliverables (/projects)',
      'Log billable hours via the interactive Time Clock (/time-clock)',
      'Collaborate on client tickets and project deliverables',
      'View agency calendar and shared assets',
    ],
  },
  intern: {
    label: 'Intern',
    badgeColor: '#F59E0B',
    description: 'You have been added to the PurePulse portal with Intern access.',
    privileges: [
      'View assigned learning tasks and project deliverables',
      'Clock in/out and submit weekly timesheets (/time-clock)',
      'Collaborate with mentors and team leaders',
    ],
  },
}

async function sendRoleInviteEmail(params: {
  name: string
  email: string
  role: string
  title?: string | null
  setupUrl: string
  inviterName?: string
}) {
  const { name, email, role, title, setupUrl, inviterName = 'The PurePulse Team' } = params
  const roleInfo = ROLE_DETAILS[role.toLowerCase()] || ROLE_DETAILS.member

  const subject = `Welcome to PurePulse — Set up your ${roleInfo.label} account`

  const privilegesListHtml = roleInfo.privileges
    .map(
      (p) =>
        `<li style="margin-bottom: 8px; color: #D1D5DB; font-size: 13.5px; line-height: 1.5;"><span style="color: ${roleInfo.badgeColor}; font-weight: bold; margin-right: 6px;">✓</span>${p}</li>`
    )
    .join('')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #07070D; color: #F4F4FF; border-radius: 14px; overflow: hidden; border: 1px solid #1F1F2E;">
      <!-- Header -->
      <div style="padding: 28px 36px; border-bottom: 1px solid #1F1F2E; text-align: center; background: #0D0D14;">
        <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #F4F4FF;">
          Pure<span style="color: #A066FF;">Pulse</span>
        </span>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9CA3AF; margin-top: 4px;">
          Admin &amp; Operations Portal
        </div>
      </div>

      <!-- Main Body -->
      <div style="padding: 36px 36px 28px;">
        <div style="display: inline-block; padding: 4px 12px; border-radius: 100px; background: ${roleInfo.badgeColor}22; border: 1px solid ${roleInfo.badgeColor}55; color: ${roleInfo.badgeColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
          ${roleInfo.label} Role Invited
        </div>

        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #F4F4FF;">
          Welcome to the team, ${name}! 👋
        </h1>

        <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          ${inviterName} has added you to the PurePulse platform as <strong>${title || roleInfo.label}</strong>.
        </p>

        <div style="background: #14141F; border: 1px solid #2D2D42; border-radius: 10px; padding: 20px; margin-bottom: 26px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #A066FF; margin-bottom: 8px;">
            Your Role &amp; Privileges
          </div>
          <p style="color: #F4F4FF; font-size: 13.5px; line-height: 1.5; margin: 0 0 14px; font-weight: 500;">
            ${roleInfo.description}
          </p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${privilegesListHtml}
          </ul>
        </div>

        <p style="color: #D1D5DB; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
          To activate your account and configure your secure dashboard password, click the button below:
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${setupUrl}" style="background: #7B2FFF; color: #FFFFFF; padding: 14px 34px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(123, 47, 255, 0.4);">
            Set Up Your Account &amp; Password →
          </a>
        </div>

        <div style="border-top: 1px solid #1F1F2E; padding-top: 20px; margin-top: 20px;">
          <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0;">
            Once your password is set, you can sign in anytime at <a href="https://login.purepulse.one/login" style="color: #A066FF; text-decoration: underline;">https://login.purepulse.one/login</a> with your email: <strong>${email}</strong>.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #0D0D14; border-top: 1px solid #1F1F2E; padding: 16px 36px; text-align: center; font-size: 11px; color: #6B7280;">
        PurePulse One LLC • Digital Design &amp; Technology Infrastructure
      </div>
    </div>
  `

  await sendEmailSafely({
    to: email,
    subject,
    html,
    from: 'PurePulse Team <team@purepulse.one>',
    replyTo: 'matty@purepulse.one',
  })
}

export async function GET() {
  const client = getDbClient()
  try {
    await client.connect()
    const res = await client.query('SELECT * FROM team_members ORDER BY name')
    return NextResponse.json({ members: res.rows ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal database error'
    console.error('[GET /api/team] DB Exception:', err)
    return NextResponse.json({ error: msg, members: [] }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function POST(req: NextRequest) {
  const client = getDbClient()
  try {
    const { name, email, role, title, phone, hourly_rate, notes } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanRole = (role || 'member').toLowerCase().trim()

    // Generate secure invite token (valid for 7 days)
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await client.connect()
    const res = await client.query(
      `INSERT INTO team_members (
        name,
        email,
        role,
        title,
        phone,
        hourly_rate,
        notes,
        status,
        invite_token,
        invite_token_expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'invited', $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        title = EXCLUDED.title,
        phone = EXCLUDED.phone,
        hourly_rate = EXCLUDED.hourly_rate,
        notes = EXCLUDED.notes,
        status = 'invited',
        invite_token = EXCLUDED.invite_token,
        invite_token_expires_at = EXCLUDED.invite_token_expires_at,
        updated_at = NOW()
      RETURNING *`,
      [
        name.trim(),
        cleanEmail,
        cleanRole,
        title?.trim() || null,
        phone?.trim() || null,
        Number(hourly_rate || 0),
        notes?.trim() || null,
        inviteToken,
        expiresAt,
      ]
    )

    const member = res.rows[0]

    // Send role-specific invitation email with password setup link
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one'
    const setupUrl = `${appOrigin}/team/setup?token=${inviteToken}&email=${encodeURIComponent(cleanEmail)}`

    await sendRoleInviteEmail({
      name: name.trim(),
      email: cleanEmail,
      role: cleanRole,
      title: title?.trim() || null,
      setupUrl,
    })

    return NextResponse.json({
      ok: true,
      member,
      setupUrl,
      message: `Invitation email with ${ROLE_DETAILS[cleanRole]?.label || cleanRole} setup instructions sent to ${cleanEmail}`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[POST /api/team] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function DELETE(req: NextRequest) {
  const client = getDbClient()
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    await client.connect()
    await client.query('DELETE FROM team_members WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function PATCH(req: NextRequest) {
  const client = getDbClient()
  try {
    const body = await req.json()
    const { id, name, title, role, phone, hourly_rate, notes, status } = body
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    await client.connect()
    const res = await client.query(
      `UPDATE team_members SET
        name = COALESCE($1, name),
        title = COALESCE($2, title),
        role = COALESCE($3, role),
        phone = COALESCE($4, phone),
        hourly_rate = COALESCE($5, hourly_rate),
        notes = COALESCE($6, notes),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *`,
      [name, title, role, phone, hourly_rate, notes, status, id]
    )
    return NextResponse.json({ ok: true, member: res.rows[0] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}
