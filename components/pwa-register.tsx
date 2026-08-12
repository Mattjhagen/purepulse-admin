'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function PwaRegister() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    setPermission(Notification.permission)

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      if (Notification.permission === 'granted') {
        await ensureSubscribed(reg)
      }
    })
  }, [])

  async function ensureSubscribed(reg: ServiceWorkerRegistration) {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return
    try {
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        }),
      })
    } catch {
      // Subscription failed silently
    }
  }

  async function requestPermission() {
    if (!('serviceWorker' in navigator)) return
    setSubscribing(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        const reg = await navigator.serviceWorker.ready
        await ensureSubscribed(reg)
      }
    } finally {
      setSubscribing(false)
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPermission('default')
    } catch {
      // Unsubscribe failed silently
    }
  }

  // Already granted — no banner needed
  if (permission === 'granted' || permission === 'denied' || dismissed) return null
  // Not supported
  if (typeof window !== 'undefined' && !('PushManager' in window)) return null
  if (permission === null) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 16px',
        background: 'rgba(160, 102, 255, 0.08)',
        borderBottom: '1px solid rgba(160, 102, 255, 0.18)',
        fontSize: '0.8rem',
        color: 'var(--text)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bell size={14} style={{ color: '#A066FF', flexShrink: 0 }} />
        <span style={{ color: 'var(--text-muted)' }}>
          Enable push notifications to get alerts for new emails, invoices, and client activity.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={requestPermission}
          disabled={subscribing}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            background: '#A066FF',
            color: '#fff',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: subscribing ? 0.7 : 1,
          }}
        >
          {subscribing ? 'Enabling…' : 'Enable'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  async function toggle() {
    if (permission === 'granted') {
      setLoading(true)
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setPermission('default')
      } finally { setLoading(false) }
    } else {
      setLoading(true)
      try {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result === 'granted') {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!vapidKey) return
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: Uint8Array.from(atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          })
          const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
          })
        }
      } finally { setLoading(false) }
    }
  }

  if (typeof window !== 'undefined' && !('PushManager' in window)) return null
  if (!permission) return null

  return (
    <button
      onClick={toggle}
      disabled={loading || permission === 'denied'}
      title={permission === 'denied' ? 'Blocked in browser settings' : permission === 'granted' ? 'Disable notifications' : 'Enable notifications'}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '8px',
        background: permission === 'granted' ? 'rgba(160,102,255,0.12)' : 'rgba(255,255,255,0.06)',
        border: '1px solid var(--border)',
        color: permission === 'granted' ? '#A066FF' : 'var(--text-muted)',
        fontSize: '0.8rem', fontWeight: 600, cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {permission === 'granted' ? <Bell size={13} /> : <BellOff size={13} />}
      {loading ? 'Updating…' : permission === 'granted' ? 'Notifications on' : permission === 'denied' ? 'Blocked' : 'Enable notifications'}
    </button>
  )
}
