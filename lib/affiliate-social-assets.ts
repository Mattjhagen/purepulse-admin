export type AffiliateSocialFormat = 'square' | 'story' | 'banner'

const FORMAT_DIMENSIONS: Record<AffiliateSocialFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  banner: { width: 1200, height: 630 },
}

export function normalizeSocialFormat(value: string | null): AffiliateSocialFormat {
  return value === 'story' || value === 'banner' ? value : 'square'
}

export function normalizeReferralCode(value: string | null) {
  return (value || 'PARTNER').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32) || 'PARTNER'
}

export function normalizeHeadline(value: string | null) {
  const cleaned = (value || 'Professional Websites Built for $150 Deposit.')
    .replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, 120) || 'Professional Websites Built for $150 Deposit.'
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] || character)
}

function wrapHeadline(headline: string, maxCharacters: number) {
  const lines: string[] = []
  let line = ''
  for (const word of headline.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxCharacters && line) {
      lines.push(line)
      line = word
    } else line = candidate
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

export function renderAffiliateSocialSvg(params: { format: AffiliateSocialFormat; headline: string; referralCode: string }) {
  const { width, height } = FORMAT_DIMENSIONS[params.format]
  const compact = params.format === 'banner'
  const padding = compact ? 64 : 86
  const headlineY = compact ? 205 : Math.round(height * 0.29)
  const headlineSize = compact ? 54 : 66
  const headlineLineHeight = compact ? 64 : 80
  const headlineLines = wrapHeadline(params.headline, compact ? 36 : 26)
  const ctaHeight = compact ? 130 : 176
  const ctaY = height - ctaHeight - padding
  const code = escapeXml(params.referralCode)
  const headlineText = headlineLines.map((line, index) => `<text x="${padding}" y="${headlineY + index * headlineLineHeight}" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="${headlineSize}" font-weight="800">${escapeXml(line)}</text>`).join('')
  const featureStart = Math.min(ctaY - 120, headlineY + headlineLines.length * headlineLineHeight + 72)
  const features = [
    '✓ Custom design and clean code built to convert',
    '✓ Fully responsive and ultra-fast loading',
    '✓ $150 deposit to start — maintenance included',
  ].map((feature, index) => `<text x="${padding}" y="${featureStart + index * (compact ? 38 : 48)}" fill="#e7e1ef" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 21 : 28}">${escapeXml(feature)}</text>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(params.headline)}</title><desc id="desc">PurePulse website design affiliate promotion</desc>
  <defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#08060d"/><stop offset=".55" stop-color="#120a22"/><stop offset="1" stop-color="#050308"/></linearGradient><radialGradient id="purple"><stop stop-color="#7b2fff" stop-opacity=".55"/><stop offset="1" stop-color="#7b2fff" stop-opacity="0"/></radialGradient><radialGradient id="cyan"><stop stop-color="#00d4ff" stop-opacity=".28"/><stop offset="1" stop-color="#00d4ff" stop-opacity="0"/></radialGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#background)"/><circle cx="${Math.round(width * .82)}" cy="${Math.round(height * .14)}" r="${Math.round(width * .58)}" fill="url(#purple)"/><circle cx="${Math.round(width * .12)}" cy="${Math.round(height * .82)}" r="${Math.round(width * .48)}" fill="url(#cyan)"/>
  <text x="${padding}" y="${compact ? 70 : 92}" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 34 : 40}" font-weight="800">Pure<tspan fill="#a066ff">Pulse</tspan></text><text x="${width - padding}" y="${compact ? 68 : 90}" fill="#c8bfce" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 17 : 20}" font-weight="700" letter-spacing="2">WEB DESIGN &amp; MAINTENANCE</text>
  <rect x="${padding}" y="${compact ? 103 : 138}" width="${compact ? 310 : 370}" height="42" rx="21" fill="#7b2fff" fill-opacity=".22" stroke="#a066ff"/><text x="${padding + 18}" y="${compact ? 131 : 167}" fill="#b98cff" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 14 : 17}" font-weight="700">HIGH-PERFORMANCE WEBSITES</text>
  ${headlineText}${features}
  <rect x="${padding}" y="${ctaY}" width="${width - padding * 2}" height="${ctaHeight}" rx="24" fill="#7b2fff" fill-opacity=".15" stroke="#a066ff" stroke-opacity=".65" stroke-width="2"/><text x="${padding + 34}" y="${ctaY + (compact ? 52 : 66)}" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 27 : 32}" font-weight="800">Get Started at purepulse.one</text><text x="${padding + 34}" y="${ctaY + (compact ? 94 : 118)}" fill="#d7cedf" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 18 : 23}">Use partner code ${code}</text>
  <rect x="${width - padding - (compact ? 270 : 330)}" y="${ctaY + (compact ? 34 : 50)}" width="${compact ? 245 : 300}" height="${compact ? 64 : 76}" rx="12" fill="#7b2fff"/><text x="${width - padding - (compact ? 147 : 180)}" y="${ctaY + (compact ? 75 : 98)}" fill="#fff" text-anchor="middle" font-family="monospace" font-size="${compact ? 19 : 23}" font-weight="800">CODE: ${code}</text>
</svg>`
}
