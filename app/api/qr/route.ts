import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const data = searchParams.get('data')
  if (!data) return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })

  const format = searchParams.get('format') ?? 'svg'
  const size = Math.min(2048, Math.max(64, parseInt(searchParams.get('size') ?? '300', 10) || 300))
  const margin = Math.max(0, parseInt(searchParams.get('margin') ?? '1', 10) || 1)
  const darkColor = searchParams.get('color') ?? '#000000'
  const lightColor = searchParams.get('bgcolor') ?? '#ffffff'
  const download = searchParams.get('download') === '1'
  const filename = searchParams.get('filename') ?? 'purepulse-referral-qr'

  try {
    if (format === 'png') {
      const buffer = await QRCode.toBuffer(data, {
        type: 'png',
        width: size,
        margin,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      })

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          ...(download ? { 'Content-Disposition': `attachment; filename="${filename}.png"` } : {}),
        },
      })
    }

    // Default: SVG format
    const svg = await QRCode.toString(data, {
      type: 'svg',
      margin,
      width: size,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    })

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
        ...(download ? { 'Content-Disposition': `attachment; filename="${filename}.svg"` } : {}),
      },
    })
  } catch (err) {
    console.error('[api/qr] Generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
