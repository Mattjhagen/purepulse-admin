import { Resend } from 'resend'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

/**
 * Robust email sender with automatic verified domain fallbacks.
 * Uses primary sender, and falls back to verified Resend domain (cmameet.site / onboarding@resend.dev)
 * if purepulse.one is not yet verified in Resend.
 */
export async function sendEmailSafely(options: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[sendEmailSafely] RESEND_API_KEY is not set')
    return { error: new Error('RESEND_API_KEY not configured'), data: null }
  }

  const resend = new Resend(apiKey)
  const defaultReplyTo = options.replyTo || 'matty@purepulse.one'
  const primaryFrom = options.from || 'PurePulse <team@purepulse.one>'

  // 1. Try sending from primary sender
  try {
    const res = await resend.emails.send({
      from: primaryFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: defaultReplyTo,
    })

    if (!res.error) {
      return res
    }

    console.warn('[sendEmailSafely] Primary sender returned error, trying verified domain:', res.error)
  } catch (err) {
    console.warn('[sendEmailSafely] Primary sender threw error, trying verified domain:', err)
  }

  // 2. Fallback to verified domain: cmameet.site
  try {
    const res = await resend.emails.send({
      from: 'PurePulse <team@cmameet.site>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: defaultReplyTo,
    })

    if (!res.error) {
      return res
    }
  } catch (fallbackErr) {
    console.warn('[sendEmailSafely] Fallback sender error:', fallbackErr)
  }

  // 3. Fallback to onboarding@resend.dev
  try {
    const res = await resend.emails.send({
      from: 'PurePulse <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: defaultReplyTo,
    })
    return res
  } catch (finalErr) {
    console.error('[sendEmailSafely] All send attempts failed:', finalErr)
    return { error: finalErr as Error, data: null }
  }
}
