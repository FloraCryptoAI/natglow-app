const CONFIG_CACHE_KEY = '_tt_pixel_cfg'
let initialized = false

async function fetchPublicConfig() {
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

export async function initTikTokPixel() {
  if (initialized) return

  const config = await fetchPublicConfig()
  if (!config) return
  if (!config['tracking.tiktok.enabled']) return
  if (!config['tracking.tiktok.pixel_id']) return

  const pixelId = config['tracking.tiktok.pixel_id']

  // TikTok Pixel base code
  /* eslint-disable */
  ;(function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(pixelId);ttq.page()})(window,document,'ttq')
  /* eslint-enable */

  initialized = true
}

export function trackTtEvent(eventName, params = {}, eventId = null) {
  if (!initialized || !window.ttq) return null
  const id = eventId ?? crypto.randomUUID()
  window.ttq.track(eventName, { ...params, event_id: id })
  return id
}

export function isTikTokReady() {
  return initialized && !!window.ttq
}
