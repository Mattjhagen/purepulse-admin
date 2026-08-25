import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { getICloudBusySlots, createICloudEvent, generateCentralTimeSlots } from '@/lib/icloud-calendar'
import { Resend } from 'resend'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { searchParams } = req.nextUrl
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const supabase = adminSupabase()

    // 1. Fetch candidate interview by token or ID
    let { data: interview } = await supabase
      .from('interviews')
      .select('*')
      .or(`id.eq.${token},candidate_email.eq.${token}`)
      .maybeSingle()

    if (!interview) {
      // Check affiliates table
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .or(`id.eq.${token},interview_token.eq.${token},email.eq.${token}`)
        .maybeSingle()

      if (affiliate) {
        interview = {
          id: affiliate.id,
          candidate_name: affiliate.name,
          candidate_email: affiliate.email,
          candidate_phone: affiliate.phone,
          job_title: 'Affiliate Sales Partner',
        } as any
      }
    }

    if (!interview) {
      return NextResponse.json({ error: 'Scheduling link is invalid or has expired' }, { status: 404 })
    }

    // 2. Fetch Apple iCloud Calendar settings
    const { data: calSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'apple_icloud_calendar')
      .maybeSingle()

    const config = calSetting?.value || {
      appleId: process.env.APPLE_ICLOUD_ID || 'matty@purepulse.one',
      appPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD || '',
      caldavUrl: '',
    }

    // 3. Query Apple iCloud CalDAV for busy slots on target date
    const dayStart = `${targetDate}T00:00:00Z`
    const dayEnd = `${targetDate}T23:59:59Z`
    const busyRanges = await getICloudBusySlots(config, dayStart, dayEnd)

    // 4. Generate Central Time 30-min slots (12pm - 7pm CT, Mon-Fri)
    const slots = generateCentralTimeSlots(targetDate, busyRanges)

    return NextResponse.json({
      candidate: {
        id: interview.id,
        name: interview.candidate_name,
        email: interview.candidate_email,
        job_title: interview.job_title || 'Affiliate Sales Partner',
      },
      date: targetDate,
      slots,
    })
  } catch (err: any) {
    console.error('[schedule/token] GET Error:', err)
    return NextResponse.json({ error: 'Failed loading calendar slots' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { startISO, endISO, displayTime } = await req.json()

    if (!startISO || !endISO) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 })
    }

    const supabase = adminSupabase()

    let { data: interview } = await supabase
      .from('interviews')
      .select('*')
      .or(`id.eq.${token},candidate_email.eq.${token}`)
      .maybeSingle()

    if (!interview) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .or(`id.eq.${token},interview_token.eq.${token},email.eq.${token}`)
        .maybeSingle()

      if (affiliate) {
        interview = {
          id: affiliate.id,
          candidate_name: affiliate.name,
          candidate_email: affiliate.email,
          candidate_phone: affiliate.phone,
          job_title: 'Affiliate Sales Partner',
        } as any
      }
    }

    if (!interview) {
      return NextResponse.json({ error: 'Scheduling link is invalid' }, { status: 404 })
    }

    // Load Apple iCloud config
    const { data: calSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'apple_icloud_calendar')
      .maybeSingle()

    const config = calSetting?.value || {
      appleId: process.env.APPLE_ICLOUD_ID || 'matty@purepulse.one',
      appPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD || '',
    }

    // 1. Create event on Apple iCloud Calendar
    const eventCreated = await createICloudEvent(config, {
      title: `PurePulse 1-on-1 Interview: ${interview.candidate_name}`,
      candidateName: interview.candidate_name,
      candidateEmail: interview.candidate_email,
      startISO,
      endISO,
    })

    // 2. Update interview status in database
    await supabase
      .from('interviews')
      .update({
        status: 'scheduled_1on1',
        scheduled_at: startISO,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interview.id)

    // 3. Send email confirmation to candidate & admin via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const resend = new Resend(resendKey)
      const formattedDate = new Date(startISO).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })

      const htmlBody = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;border:1px solid #262626;padding:32px;">
          <div style="margin-bottom:20px;">
            <span style="font-size:20px;font-weight:800;color:#fff;">Pure<span style="color:#A066FF;">Pulse</span></span>
          </div>
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#10B981;">1-on-1 Interview Confirmed 🎉</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#FFFFFF;">Hi ${interview.candidate_name}, your 1-on-1 interview is scheduled!</h1>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(244,244,255,0.85);line-height:1.7;">Your 1-on-1 virtual interview with Matty Hagen for the <strong>${interview.job_title || 'Affiliate Sales Partner'}</strong> position has been added to our calendar.</p>
          <div style="background:rgba(123,47,255,0.12);border:1px solid rgba(123,47,255,0.3);border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#A066FF;">📅 Scheduled Date &amp; Time</p>
            <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#FFFFFF;">${formattedDate}</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#00D4FF;">${displayTime || 'Central Time'}</p>
          </div>
          <p style="margin:0 0 16px;font-size:14px;color:rgba(244,244,255,0.75);">An invite has been placed on our Apple Calendar. If you need to reschedule, reply directly to this email.</p>
          <p style="margin:24px 0 0;font-size:14px;color:rgba(244,244,255,0.6);">Best regards,<br><strong style="color:#FFF;">Matty Hagen</strong><br>PurePulse Technology Solutions</p>
        </div>
      `

      const uid = `purepulse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const dtstart = new Date(startISO).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtend = new Date(endISO).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PurePulse Inc//1-on-1 Interview Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:PurePulse 1-on-1 Virtual Interview (${interview.candidate_name})`,
        `DESCRIPTION:1-on-1 Partner Interview with Matty Hagen for ${interview.job_title || 'Affiliate Sales Partner'}.`,
        'ORGANIZER;CN=Matty Hagen:mailto:matty@purepulse.one',
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${interview.candidate_name}:mailto:${interview.candidate_email}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n')

      try {
        await resend.emails.send({
          from: 'PurePulse Hiring <hiring@purepulse.one>',
          to: [interview.candidate_email, 'matty@purepulse.one'],
          subject: `🗓️ Confirmed: 1-on-1 Interview with ${interview.candidate_name} (${formattedDate})`,
          html: htmlBody,
          attachments: [
            {
              filename: 'interview-invite.ics',
              content: Buffer.from(icsContent).toString('base64'),
            },
          ],
        })
      } catch (emailErr) {
        console.warn('[schedule/token] Confirmation email warning:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: '1-on-1 Interview scheduled successfully!',
      eventCreated,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scheduling failed' }, { status: 500 })
  }
}
