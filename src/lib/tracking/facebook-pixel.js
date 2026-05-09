const CONFIG_CACHE_KEY = '_fb_pixel_cfg'
let initialized = false
let pixelId     = null

async function fetchPublicConfig() {
  // Cache in sessionStorage to avoid refetching on every page
  try {
    const cached = sessionStorage.getItem(CONFIG_CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch { /* ignore */ }

  try {
    const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(
      `${supabaseUrl}/functions/v1/admin-tracking-config?mode=public`,
      { headers: { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey } },
    )
    if (!res.ok) return null
    const data = await res.json()
    try { sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
    return data
  } catch {
    return null
  }
}

export async function initFacebookPixel() {
  if (initialized) return

  const config = await fetchPublicConfig()
  if (!config) return
  if (!config['tracking.facebook.enabled']) return
  if (!config['tracking.facebook.pixel_id']) return

  pixelId = config['tracking.facebook.pixel_id']

  // Facebook Pixel base code
  /* eslint-disable */
  ;(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window,document,'script','https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
  initialized = true
}

export function trackFbEvent(eventName, params = {}, customEventId = null) {
  if (!initialized || !window.fbq) return null
  const eventID = customEventId ?? crypto.randomUUID()
  window.fbq('track', eventName, params, { eventID })
  return eventID
}

export function isPixelReady() {
  return initialized && !!window.fbq
}
