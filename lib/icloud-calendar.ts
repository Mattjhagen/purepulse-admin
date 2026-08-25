export interface CalendarConfig {
  appleId: string
  appPassword: string
  caldavUrl?: string
  timezone?: string
}

export interface TimeSlot {
  startISO: string
  endISO: string
  displayTime: string
  available: boolean
}

// 1. Get busy time ranges from Apple iCloud CalDAV
export async function getICloudBusySlots(
  config: CalendarConfig,
  startDateISO: string,
  endDateISO: string
): Promise<{ start: Date; end: Date }[]> {
  if (!config.appleId || !config.appPassword) {
    return []
  }

  const authHeader = 'Basic ' + Buffer.from(`${config.appleId.trim()}:${config.appPassword.trim()}`).toString('base64')

  try {
    let calendarPath = config.caldavUrl || (await discoverICloudCalendarPath(config.appleId, authHeader))
    if (!calendarPath) return []

    const startCal = new Date(startDateISO).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endCal = new Date(endDateISO).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const reportXml = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startCal}" end="${endCal}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

    const reqUrl = new URL(calendarPath, 'https://caldav.icloud.com')
    const res = await fetch(reqUrl.toString(), {
      method: 'REPORT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: reportXml,
    })

    if (!res.ok) {
      console.warn('[icloud-calendar] CalDAV REPORT HTTP status:', res.status)
      return []
    }

    const xmlText = await res.text()
    return parseICalBusyRanges(xmlText)
  } catch (err) {
    console.warn('[icloud-calendar] CalDAV query warning:', err)
    return []
  }
}

// 2. Create VEVENT on Apple iCloud Calendar
export async function createICloudEvent(
  config: CalendarConfig,
  event: {
    title: string
    candidateName: string
    candidateEmail: string
    startISO: string
    endISO: string
  }
): Promise<boolean> {
  if (!config.appleId || !config.appPassword) {
    return false
  }

  const authHeader = 'Basic ' + Buffer.from(`${config.appleId.trim()}:${config.appPassword.trim()}`).toString('base64')

  try {
    let calendarPath = config.caldavUrl || (await discoverICloudCalendarPath(config.appleId, authHeader))
    if (!calendarPath) return false

    const uid = `purepulse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const startICal = new Date(event.startISO).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endICal = new Date(event.endISO).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PurePulse Inc//1-on-1 Interview Scheduler//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${startICal}`,
      `DTSTART:${startICal}`,
      `DTEND:${endICal}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:1-on-1 PurePulse Partner Interview with ${event.candidateName} (${event.candidateEmail})`,
      `ORGANIZER;CN=Matty Hagen:mailto:${config.appleId.trim()}`,
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${event.candidateName}:mailto:${event.candidateEmail}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const cleanPath = calendarPath.endsWith('/') ? calendarPath.slice(0, -1) : calendarPath
    const eventUrl = new URL(`${cleanPath}/${uid}.ics`, 'https://caldav.icloud.com')

    const res = await fetch(eventUrl.toString(), {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'text/calendar; charset=utf-8',
      },
      body: icsContent,
    })

    return res.ok || res.status === 201 || res.status === 204
  } catch (err) {
    console.warn('[icloud-calendar] Create event warning:', err)
    return false
  }
}

async function discoverICloudCalendarPath(appleId: string, authHeader: string): Promise<string | null> {
  try {
    const propfindXml = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <current-user-principal/>
  </prop>
</propfind>`

    const res = await fetch('https://caldav.icloud.com/', {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/xml',
        'Depth': '0',
      },
      body: propfindXml,
    })

    const text = await res.text()
    const principalMatch = text.match(/<current-user-principal>[\s\S]*?<href>(.*?)<\/href>/i)
    if (principalMatch && principalMatch[1]) {
      const principalPath = principalMatch[1]
      const homeXml = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <C:calendar-home-set/>
  </prop>
</propfind>`
      const resHome = await fetch(new URL(principalPath, 'https://caldav.icloud.com').toString(), {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/xml',
          'Depth': '0',
        },
        body: homeXml,
      })
      const homeText = await resHome.text()
      const homeMatch = homeText.match(/<calendar-home-set>[\s\S]*?<href>(.*?)<\/href>/i)
      if (homeMatch && homeMatch[1]) {
        return homeMatch[1]
      }
    }
  } catch (e) {
    console.warn('[icloud-calendar] Discovery warning:', e)
  }

  const dsid = appleId.split('@')[0]
  return `/${dsid}/calendars/`
}

function parseICalBusyRanges(xmlText: string): { start: Date; end: Date }[] {
  const busy: { start: Date; end: Date }[] = []
  const veventBlocks = xmlText.split('BEGIN:VEVENT')

  for (let i = 1; i < veventBlocks.length; i++) {
    const block = veventBlocks[i].split('END:VEVENT')[0] || ''

    // Match DTSTART & DTEND with optional timezone or VALUE=DATE
    const dtStartMatch = block.match(/DTSTART(?:;[^:]*)?:([0-9T]+Z?)/i)
    const dtEndMatch = block.match(/DTEND(?:;[^:]*)?:([0-9T]+Z?)/i)

    if (dtStartMatch && dtStartMatch[1]) {
      const startDate = parseICalDate(dtStartMatch[1])
      let endDate = dtEndMatch && dtEndMatch[1] ? parseICalDate(dtEndMatch[1]) : null

      // Default duration to 30 mins if end date missing
      if (startDate && !endDate) {
        endDate = new Date(startDate.getTime() + 30 * 60 * 1000)
      }

      // Handle all-day events (e.g., 20260826 without T)
      if (startDate && dtStartMatch[1].length === 8) {
        const fullDayStart = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0))
        const fullDayEnd = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59))
        busy.push({ start: fullDayStart, end: fullDayEnd })
      } else if (startDate && endDate) {
        busy.push({ start: startDate, end: endDate })
      }
    }
  }

  return busy
}

function parseICalDate(str: string): Date | null {
  if (!str) return null

  // All-day date (YYYYMMDD)
  if (/^\d{8}$/.test(str)) {
    const y = +str.slice(0, 4)
    const m = +str.slice(4, 6) - 1
    const d = +str.slice(6, 8)
    return new Date(Date.UTC(y, m, d, 0, 0, 0))
  }

  // Full timestamp (YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS)
  const match = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
  if (!match) return null

  return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]))
}

// 3. Generate candidate available 30-minute time slots (Mon-Fri, 12:00 PM - 7:00 PM Central Time)
export function generateCentralTimeSlots(
  targetDateISO: string,
  busyRanges: { start: Date; end: Date }[]
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const baseDate = new Date(targetDateISO)
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = baseDate.getDate()

  const dayOfWeek = baseDate.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return []
  }

  for (let hour = 12; hour < 19; hour++) {
    for (let minute of [0, 30]) {
      const displayHour = hour > 12 ? hour - 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayTime = `${displayHour}:${minute === 0 ? '00' : minute} ${ampm} CT`

      // CDT is UTC-5
      const slotStart = new Date(Date.UTC(year, month, day, hour + 5, minute, 0))
      const slotEnd = new Date(Date.UTC(year, month, day, hour + 5, minute + 30, 0))

      const isConflict = busyRanges.some(busy => {
        return (slotStart < busy.end && slotEnd > busy.start)
      })

      slots.push({
        startISO: slotStart.toISOString(),
        endISO: slotEnd.toISOString(),
        displayTime,
        available: !isConflict,
      })
    }
  }

  return slots
}
