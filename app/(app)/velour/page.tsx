'use client'

import React, { useState } from 'react'
import { ExternalLink, Globe, CreditCard, ShieldCheck, ShoppingBag, Store, Zap, RefreshCw, Box, Tag, Users } from 'lucide-react'

export default function VelourAdminControlPage() {
  const [iframeMode, setIframeMode] = useState(false)

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text, #fff)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🛍️</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Velour E-Commerce Engine
            </h1>
            <span style={{
              background: 'rgba(72, 187, 120, 0.15)',
              color: '#48bb78',
              border: '1px solid rgba(72, 187, 120, 0.3)',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#48bb78' }} />
              Live on Edge
            </span>
          </div>
          <p style={{ color: 'var(--muted, #888)', margin: '6px 0 0', fontSize: '0.9rem' }}>
            Central administration and quick launch for <strong>velour.live</strong> storefronts, payment gateways, and merchant workspaces.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIframeMode(!iframeMode)}
            style={{
              background: '#161616',
              border: '1px solid #282828',
              color: '#ddd',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            {iframeMode ? '📊 Grid View' : '🖥️ Embedded Live Preview'}
          </button>

          <a
            href="https://velour.live/?view=dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#7B2FFF',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: '0 0 20px rgba(123, 47, 255, 0.35)',
            }}
          >
            Open Merchant Workspace <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {iframeMode ? (
        <div style={{ background: '#0e0e0e', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden', height: '78vh' }}>
          <iframe
            src="https://velour.live"
            title="Velour Live Storefront"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Domain</span>
                <Globe size={16} color="#7B2FFF" />
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>velour.live</div>
              <small style={{ color: '#48bb78', display: 'block', marginTop: '4px', fontSize: '12px' }}>
                Universal SSL · Sub-50ms Cloudflare Edge
              </small>
            </div>

            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Processing</span>
                <CreditCard size={16} color="#e5ad06" />
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Lemon Squeezy &amp; Stripe</div>
              <small style={{ color: '#aaa', display: 'block', marginTop: '4px', fontSize: '12px' }}>
                Merchant of Record &amp; Apple Pay Native
              </small>
            </div>

            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automated Receipts</span>
                <ShieldCheck size={16} color="#48bb78" />
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Resend Delivery</div>
              <small style={{ color: '#aaa', display: 'block', marginTop: '4px', fontSize: '12px' }}>
                orders@velour.live Verified Sender
              </small>
            </div>
          </div>

          {/* Action Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
            {/* Merchant Control Card */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} color="#7B2FFF" /> Merchant Studio Controls
              </h3>
              <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Jump directly into specific operational modules of the Velour platform:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href="https://velour.live/?view=dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#191919',
                    border: '1px solid #262626',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box size={15} color="#A066FF" /> Inventory &amp; Catalog
                  </span>
                  <ExternalLink size={13} color="#666" />
                </a>

                <a
                  href="https://velour.live/?view=dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#191919',
                    border: '1px solid #262626',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={15} color="#A066FF" /> Promo Codes &amp; Discounts
                  </span>
                  <ExternalLink size={13} color="#666" />
                </a>

                <a
                  href="https://velour.live/#access_token="
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#191919',
                    border: '1px solid #262626',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={15} color="#A066FF" /> Create New Studio / Tenant
                  </span>
                  <ExternalLink size={13} color="#666" />
                </a>
              </div>
            </div>

            {/* Live Showcases Card */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} color="#00D4FF" /> Active Storefront Previews
              </h3>
              <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Test buyer experience and 1-click Express Checkout on demo boutiques:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href="https://velour.live/?store=juniper-and-oak"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#191919',
                    border: '1px solid #262626',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <div>
                    <b>Juniper &amp; Oak</b>
                    <small style={{ display: 'block', color: '#777', fontSize: '11px' }}>Ceramics, Stoneware &amp; Home Goods</small>
                  </div>
                  <ExternalLink size={13} color="#666" />
                </a>

                <a
                  href="https://velour.live/?store=aura-botanical-lab"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#191919',
                    border: '1px solid #262626',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <div>
                    <b>Aura Botanical Lab</b>
                    <small style={{ display: 'block', color: '#777', fontSize: '11px' }}>Cold-Pressed Oils &amp; Skincare</small>
                  </div>
                  <ExternalLink size={13} color="#666" />
                </a>

                <a
                  href="https://velour.live/?store=atelier-sol"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#191919',
                    border: '1px solid #262626',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <div>
                    <b>Atelier Sol</b>
                    <small style={{ display: 'block', color: '#777', fontSize: '11px' }}>Heavyweight French Terry &amp; Apparel</small>
                  </div>
                  <ExternalLink size={13} color="#666" />
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
