import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:matty@purepulse.one',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  actions?: { action: string; title: string }[]
}

export interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    )
    return true
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return false // subscription expired
    throw err
  }
}
