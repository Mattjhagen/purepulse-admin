import { NextRequest } from 'next/server'
import { normalizeHeadline, normalizeReferralCode, normalizeSocialFormat, renderAffiliateSocialSvg } from '@/lib/affiliate-social-assets'

export function GET(request: NextRequest) {
  const format = normalizeSocialFormat(request.nextUrl.searchParams.get('format'))
  const headline = normalizeHeadline(request.nextUrl.searchParams.get('headline'))
  const referralCode = normalizeReferralCode(request.nextUrl.searchParams.get('code'))
  return new Response(renderAffiliateSocialSvg({ format, headline, referralCode }), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
