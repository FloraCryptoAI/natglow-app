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

  // TikTok Pixel base code (updated)
  /* eslint-disable */
  !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};if(!w[t]._b){w[t]._b=1;var s=d.createElement("script");s.type="text/javascript";s.async=!0;s.src=r+"?sdkid="+e+"&lib="+t;if(o){s.src=s.src+"&partner="+o}var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)}};ttq.load(pixelId);ttq.page()}(window,document,'ttq')
  /* eslint-enable */

  initialized = true
}

export function trackTtEvent(eventName, params = {}, eventId = null) {
  const id = eventId ?? crypto.randomUUID()
  // Browser pixel (immediate, picked up by Pixel Helper extension + ad attribution)
  if (initialized && window.ttq) {
    window.ttq.track(eventName, params, { event_id: id })
  }
  // CAPI fire-and-forget — gets event into tracking_events_log + Test Events tool
  fireCAPI(eventName, id, params)
  return id
}

function fireCAPI(eventName, eventId, properties) {
  try {
    const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    fetch(`${supabaseUrl}/functions/v1/send-pixel-event`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey:        supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform:   'tiktok',
        event_name: eventName,
        event_id:   eventId,
        user_data:  { ttclid: readCookie('ttclid') || undefined },
        properties,
      }),
      keepalive: true,
    }).catch(() => { /* tracking must never break the app */ })
  } catch { /* ignore */ }
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function isTikTokReady() {
  return initialized && !!window.ttq
}
