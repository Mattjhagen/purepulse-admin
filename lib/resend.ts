import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    let key = process.env.RESEND_API_KEY || ''
    key = key.trim().replace(/^["'`]|["'`]$/g, '').trim()
    while (key.toLowerCase().startsWith('bearer ')) {
      key = key.slice(7).trim()
    }
    key = key.replace(/[\r\n\t]/g, '').trim()
    _resend = new Resend(key || 're_placeholder_for_build')
  }
  return _resend
}
