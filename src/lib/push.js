import { supabase } from '@/api/supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getPushPermissionStatus() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestPushPermission() {
  if (!isPushSupported()) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function subscribeToPush() {
  if (!isPushSupported()) return null
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set')
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { endpoint, keys } = subscription.toJSON()
    const lang = localStorage.getItem('i18nextLng')?.startsWith('es') ? 'es' : 'en'
    await supabase.from('notification_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
        lang,
      },
      { onConflict: 'endpoint' }
    )

    return subscription
  } catch (err) {
    console.error('Push subscription failed:', err)
    return null
  }
}

export async function updatePushLang(lang) {
  if (!isPushSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await supabase
      .from('notification_subscriptions')
      .update({ lang })
      .eq('endpoint', subscription.endpoint)
  } catch {
    // silencioso — não crítico
  }
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()
    await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)
  } catch (err) {
    console.error('Push unsubscribe failed:', err)
  }
}

export async function isSubscribedToPush() {
  if (!isPushSupported()) return false
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    if (!registrations.length) return false
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('sw timeout')), 3000)),
    ])
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

// Verifica se deve mostrar o banner de push (respeita recusas anteriores)
export function shouldShowPushBanner() {
  if (!isPushSupported()) return false
  if (Notification.permission === 'granted') return false
  if (Notification.permission === 'denied') return false

  const declinedAt = localStorage.getItem('push_declined_at')
  if (declinedAt && Date.now() - Number(declinedAt) < 30 * 24 * 60 * 60 * 1000) return false

  const dismissedAt = localStorage.getItem('push_banner_dismissed_at')
  if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return false

  return true
}

export function recordPushDeclined() {
  localStorage.setItem('push_declined_at', String(Date.now()))
}

export function recordPushBannerDismissed() {
  localStorage.setItem('push_banner_dismissed_at', String(Date.now()))
}
