import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Navigation: NetworkFirst para HTML, excluindo /admin
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 3 })
)

// Fontes Google
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'google-fonts-webfonts' })
)

// Supabase Storage images (feed posts + avatars).
// CacheFirst makes repeat views instant: first visit downloads + caches,
// every subsequent view serves from the SW cache without hitting Supabase.
// Images here are immutable (their URL contains a random filename), so we
// can keep them cached for 30 days. Cap at 200 entries — bounded so the
// cache doesn't grow forever on a heavy user.
if (SUPABASE_URL) {
  const SUPABASE_HOST = new URL(SUPABASE_URL).host
  registerRoute(
    ({ url, request }) =>
      url.host === SUPABASE_HOST &&
      url.pathname.startsWith('/storage/v1/object/public/feed-images/') &&
      request.destination === 'image',
    new CacheFirst({
      cacheName: 'supabase-feed-images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  )
}

// Push notification recebida do servidor
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      data: {
        url: data.url || '/HairDashboard',
        history_id: data.history_id || null,
      },
    })
  )
})

// Click na notificação: tracking + foca ou abre a janela
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/HairDashboard'
  const historyId = event.notification.data?.history_id

  // Tracking de click rate (fire-and-forget)
  if (historyId && SUPABASE_URL && SUPABASE_ANON_KEY) {
    fetch(
      `${SUPABASE_URL}/functions/v1/notification-click?id=${historyId}`,
      { method: 'GET', headers: { apikey: SUPABASE_ANON_KEY } }
    ).catch(() => {})
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})
