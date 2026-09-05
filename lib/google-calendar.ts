import crypto from 'node:crypto'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { adminSupabase } from './supabase'

export const INTERVIEW_TIMEZONE = 'America/Chicago'
export const GOOGLE_CALENDAR_SETTING_KEY = 'google_calendar_connection'
export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
]

type StoredConnection = {
  refreshToken: string
  email?: string
  calendarId?: string
  connectedAt?: string
}

export type InterviewSlot = {
  startISO: string
  endISO: string
  displayTime: string
  available: boolean
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function encryptionKey() {
  const raw = requiredEnv('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY')
  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length === 32) return decoded
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptCalendarToken(token: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.')
}

export function decryptCalendarToken(value: string) {
  const [ivPart, tagPart, encryptedPart] = value.split('.')
  if (!ivPart || !tagPart || !encryptedPart) throw new Error('Stored Google Calendar token is invalid')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function googleRedirectUri() {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one'}/api/settings/google-calendar/callback`
}

export function createGoogleOAuthState() {
  const payload = Buffer.from(JSON.stringify({
    nonce: crypto.randomBytes(18).toString('base64url'),
    issuedAt: Date.now(),
  })).toString('base64url')
  const signature = crypto
    .createHmac('sha256', requiredEnv('GOOGLE_CALENDAR_OAUTH_STATE_SECRET'))
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

export function verifyGoogleOAuthState(state: string) {
  const [payload, signature] = state.split('.')
  if (!payload || !signature) return false
  const expected = crypto
    .createHmac('sha256', requiredEnv('GOOGLE_CALENDAR_OAUTH_STATE_SECRET'))
    .update(payload)
    .digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number.isFinite(parsed.issuedAt) && Date.now() - parsed.issuedAt < 10 * 60 * 1000
  } catch {
    return false
  }
}

export function googleAuthorizationUrl(state: string) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', requiredEnv('GOOGLE_CLIENT_ID'))
  url.searchParams.set('redirect_uri', googleRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', state)
  return url.toString()
}

async function tokenRequest(params: URLSearchParams) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    cache: 'no-store',
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error_description || body.error || 'Google authorization failed')
  return body as { access_token: string; refresh_token?: string; expires_in?: number }
}

export async function exchangeGoogleCode(code: string) {
  return tokenRequest(new URLSearchParams({
    code,
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: googleRedirectUri(),
    grant_type: 'authorization_code',
  }))
}

export async function loadGoogleConnection(): Promise<StoredConnection | null> {
  const { data, error } = await adminSupabase()
    .from('system_settings')
    .select('value')
    .eq('key', GOOGLE_CALENDAR_SETTING_KEY)
    .maybeSingle()
  if (error) throw new Error(`Unable to load Google Calendar connection: ${error.message}`)
  const value = data?.value as StoredConnection | undefined
  return value?.refreshToken ? value : null
}

export async function saveGoogleConnection(refreshToken: string, email?: string) {
  const connection: StoredConnection = {
    refreshToken: encryptCalendarToken(refreshToken),
    email,
    calendarId: 'primary',
    connectedAt: new Date().toISOString(),
  }
  const { error } = await adminSupabase().from('system_settings').upsert({
    key: GOOGLE_CALENDAR_SETTING_KEY,
    value: connection,
  }, { onConflict: 'key' })
  if (error) throw new Error(`Unable to save Google Calendar connection: ${error.message}`)
}

export async function getGoogleAccessToken() {
  const connection = await loadGoogleConnection()
  if (!connection) throw new Error('Google Calendar is not connected')
  const token = await tokenRequest(new URLSearchParams({
    refresh_token: decryptCalendarToken(connection.refreshToken),
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    grant_type: 'refresh_token',
  }))
  return { accessToken: token.access_token, calendarId: connection.calendarId || 'primary' }
}

async function googleApi<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error?.message || 'Google Calendar request failed')
  return body as T
}

export async function getConnectedGoogleEmail(accessToken: string) {
  const profile = await googleApi<{ email?: string }>('https://openidconnect.googleapis.com/v1/userinfo', accessToken)
  return profile.email
}

export async function getGoogleBusySlots(startISO: string, endISO: string) {
  const { accessToken, calendarId } = await getGoogleAccessToken()
  const data = await googleApi<{ calendars?: Record<string, { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }> }>(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        timeMin: startISO,
        timeMax: endISO,
        timeZone: INTERVIEW_TIMEZONE,
        items: [{ id: calendarId }],
      }),
    }
  )
  const result = data.calendars?.[calendarId]
  if (!result || result.errors?.length) throw new Error('Google Calendar availability could not be read')
  return (result.busy || []).map(item => ({ start: new Date(item.start), end: new Date(item.end) }))
}

export function generateCentralInterviewSlots(targetDate: string, busy: Array<{ start: Date; end: Date }>): InterviewSlot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error('Invalid interview date')
  const noon = fromZonedTime(`${targetDate} 12:00:00`, INTERVIEW_TIMEZONE)
  const weekday = Number(formatInTimeZone(noon, INTERVIEW_TIMEZONE, 'i'))
  if (weekday > 5) return []

  const slots: InterviewSlot[] = []
  for (let index = 0; index < 14; index++) {
    const start = new Date(noon.getTime() + index * 30 * 60 * 1000)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    const conflict = busy.some(item => start < item.end && end > item.start)
    slots.push({
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      displayTime: `${formatInTimeZone(start, INTERVIEW_TIMEZONE, 'h:mm a')} CT`,
      available: !conflict,
    })
  }
  return slots
}

export async function createGoogleInterviewEvent(event: {
  candidateName: string
  candidateEmail: string
  startISO: string
  endISO: string
  interviewId: string
}) {
  const { accessToken, calendarId } = await getGoogleAccessToken()
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set('conferenceDataVersion', '1')
  url.searchParams.set('sendUpdates', 'all')
  return googleApi<{ id: string; htmlLink?: string; hangoutLink?: string }>(url.toString(), accessToken, {
    method: 'POST',
    body: JSON.stringify({
      summary: `PurePulse Interview: ${event.candidateName}`,
      description: `30-minute PurePulse affiliate interview. Candidate: ${event.candidateName} (${event.candidateEmail}).`,
      start: { dateTime: event.startISO, timeZone: INTERVIEW_TIMEZONE },
      end: { dateTime: event.endISO, timeZone: INTERVIEW_TIMEZONE },
      attendees: [{ email: event.candidateEmail, displayName: event.candidateName }],
      guestsCanInviteOthers: false,
      conferenceData: {
        createRequest: {
          requestId: `purepulse-${event.interviewId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
  })
}
