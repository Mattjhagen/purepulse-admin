'use client'
import { useState } from 'react'

export default function AffiliateDashboardClient({
  referralCode,
  affiliateName,
}: {
  referralCode: string
  affiliateName: string
}) {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://login.purepulse.one')

  const referralUrl = `${origin}/ref/${referralCode}`
  const qrUrl = `/api/qr?data=${encodeURIComponent(referralUrl)}`
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            background: #08060d !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          header, main, footer, .affiliate-dash-content, .no-print {
            display: none !important;
          }
          .affiliate-print-flyer {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 3.5rem 3.75rem 2.25rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            border-radius: 0 !important;
            background: #08060d !important;
            position: relative !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* DASHBOARD CONTENT (HIDDEN ON PRINT) */}
      <div className="affiliate-dash-content" style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '24px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Your Referral Materials</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: '6px 14px',
                background: '#f3f4f6',
                color: '#111',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {showPreview ? 'Hide Flyer' : 'Preview Flyer'}
            </button>
            <button
              onClick={() => window.print()}
              style={{
                padding: '6px 16px',
                background: '#7B2FFF',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🖨️ Print Full-Page Flyer
            </button>
          </div>
        </div>

        {/* Optional On-Screen Flyer Preview */}
        {showPreview && (
          <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#6b7280' }}>Printable Full-Page Flyer Preview</p>
              <button
                onClick={() => window.print()}
                style={{ padding: '6px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Print Flyer
              </button>
            </div>
            <div style={{ maxWidth: 580, margin: '0 auto', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
              {renderFlyer(affiliateName, referralCode, referralUrl, qrUrl)}
            </div>
          </div>
        )}

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
                Hang printed flyers at local cafes, co-working spots, and job boards. Share your link on social media, email, or in person.
                When someone scans your QR code or clicks your link and signs up, you earn commission automatically.
              </p>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => window.print()}
                style={{ padding: '8px 16px', background: '#7B2FFF', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                🖨️ Print Full-Page Flyer
              </button>
              <a
                href={qrUrl}
                download={`purepulse-qr-${referralCode.toLowerCase()}.svg`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#111', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}
              >
                ↓ Download QR Code
              </a>
              <a
                href={`mailto:?subject=Check out PurePulse Web Services&body=Hey! I wanted to share PurePulse with you — they build clean, high-performance websites starting with a $150 deposit. Use my partner link to explore: ${referralUrl}`}
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

      {/* FULL-PAGE PRINTABLE FLYER FOR AFFILIATE (ONLY VISIBLE ON PRINT) */}
      <div style={{ display: 'none' }} className="affiliate-print-flyer">
        {renderFlyer(affiliateName, referralCode, referralUrl, qrUrl)}
      </div>
    </>
  )
}

function renderFlyer(affiliateName: string, referralCode: string, referralUrl: string, qrUrl: string) {
  return (
    <div
      style={{
        width: '100%',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Space Grotesk", sans-serif',
        background: '#08060d',
        color: '#ffffff',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 3.25rem 2rem',
        minHeight: '100%',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 75% 10%, rgba(123,47,255,0.32), transparent 55%), radial-gradient(circle at 10% 65%, rgba(0,212,255,0.18), transparent 50%), radial-gradient(circle at 50% 95%, rgba(123,47,255,0.2), transparent 50%)',
        }}
      />

      {/* TOP SECTION */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Brand Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
            Pure<span style={{ color: '#A066FF' }}>Pulse</span>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
            WEB DESIGN &amp; DEVELOPMENT
          </div>
        </div>

        {/* Hero Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.12em', color: '#A066FF', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            YOUR NEXT WEBSITE SHOULD
          </div>
          <div style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.035em', marginBottom: '1.25rem' }}>
            MOVE<br />
            <span style={{ color: '#A066FF' }}>PEOPLE</span><br />
            FORWARD.
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.0625rem', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 1.5rem' }}>
            Sharp aesthetics. Clean code. A website built to perform<br />and built to last.
          </div>
          <div>
            <span style={{ display: 'inline-block', background: 'rgba(123,47,255,0.2)', border: '1px solid rgba(160,102,255,0.5)', borderRadius: 100, padding: '0.625rem 1.75rem', fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.06em', color: '#ffffff' }}>
              PROFESSIONAL WEBSITES FROM A $150 DEPOSIT
            </span>
          </div>
        </div>

        {/* 3 Step Process */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'DESIGN', desc: 'A distinctive digital presence', color: '#A066FF' },
            { label: 'BUILD', desc: 'Fast, clean, responsive foundations', color: '#00D4FF' },
            { label: 'LAUNCH', desc: 'A site ready to make an impression', color: '#A066FF' },
          ].map(step => (
            <div key={step.label} style={{ textAlign: 'left', minWidth: 140, maxWidth: 165 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: step.color, display: 'inline-block' }} />
                {step.label}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM SECTION: CTA Card + QR */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            background: 'rgba(123,47,255,0.12)',
            border: '1px solid rgba(160,102,255,0.4)',
            borderRadius: 22,
            padding: '1.5rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '1rem',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              Make your next move.
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              Scan to explore our work and start a conversation.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#00D4FF', letterSpacing: '-0.01em' }}>
                purepulse.one
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}>
                Partner Code: <strong style={{ color: '#A066FF' }}>{referralCode}</strong>
              </span>
            </div>
          </div>

          {/* Mascot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/referral-mascot.png" alt="" width={85} height={108} style={{ flexShrink: 0, objectFit: 'contain' }} />

          {/* QR Code Container */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '0.75rem',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`Referral QR Code for ${referralCode}`}
              width={130}
              height={130}
              style={{ display: 'block' }}
            />
          </div>
        </div>

        {/* Footer Brand & Partner Info */}
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.85rem' }}>
          <div style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            PUREPULSE.ONE · DESIGN THAT MOVES PEOPLE FORWARD
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Referred by <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{affiliateName}</strong> · Partner Code <strong style={{ color: '#A066FF' }}>{referralCode}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
