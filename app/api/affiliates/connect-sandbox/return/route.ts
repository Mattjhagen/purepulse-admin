import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const result = req.nextUrl.searchParams.get('result') === 'refresh' ? 'refresh' : 'complete'
  return NextResponse.redirect(`purepulse://stripe-connect?result=${result}`)
}
