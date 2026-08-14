'use client'
import { useState } from 'react'

export default function AffiliateDashboardClient({
  referralCode,
  affiliateName,
}: {
  referralCode: string
  affiliateName: string
}) {
  const referralUrl = `https://purepulse.one/pricing?ref=${referralCode}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(referralUrl)}`
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '24px 24px', marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700 }}>Your Referral Materials</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>
              Referral Code
            </p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              {referralCode}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>
              Your Referral Link
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: 6, fontSize: '0.875rem', color: '#374151', wordBreak: 'break-all', flex: 1 }}>
                {referralUrl}
              </code>
              <button
                onClick={copyLink}
                style={{
                  padding: '8px 16px',
                  background: copied ? '#22c55e' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div style={{ padding: '14px 16px', background: '#f8f9ff', border: '1px solid #e0e5ff', borderRadius: 8 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.875rem' }}>How to use your link</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.6 }}>
              Share it on job boards (Indeed, ZipRecruiter), social media, email, or in person.
              When someone clicks your link and signs up, you earn a monthly commission automatically.
            </p>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={qrUrl}
              download={`purepulse-qr-${referralCode.toLowerCase()}.png`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '8px 16px', background: '#f3f4f6', color: '#111', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}
            >
              ↓ Download QR Code
            </a>
            <a
              href={`mailto:?subject=Check out PurePulse Web Services&body=Hey! I wanted to share PurePulse with you — they do professional web design and maintenance. Use my link to get started: ${referralUrl}`}
              style={{ padding: '8px 16px', background: '#f3f4f6', color: '#111', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}
            >
              Share via Email
            </a>
          </div>
        </div>

        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR code for ${affiliateName}'s referral link`}
            width={160}
            height={160}
            style={{ display: 'block', borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Scan to open link</p>
        </div>
      </div>
    </div>
  )
}
