const STORAGE_KEY     = 'natglow_attribution'
const TTL_MS          = 30 * 24 * 60 * 60 * 1000   // 30 days
const UTM_KEYS        = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const CLICK_ID_KEYS   = ['fbclid', 'gclid', 'ttclid', 'msclkid']

export function captureAttribution() {
  const params = new URLSearchParams(window.location.search)
  const captured = {}

  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const val = params.get(key)
    if (val) captured[key] = val
  }

  if (Object.keys(captured).length === 0) return

  captured.captured_at  = new Date().toISOString()
  captured.landing_page = window.location.pathname
  captured.referrer     = document.referrer || undefined

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...captured, expires: Date.now() + TTL_MS }))
  } catch { /* storage full or blocked */ }

  // Build _fbc cookie from fbclid if not already set
  if (captured.fbclid && !getFbc()) {
    const fbc = `fb.1.${Date.now()}.${captured.fbclid}`
    try {
      document.cookie = `_fbc=${fbc}; path=/; max-age=${60 * 60 * 24 * 90}; secure; samesite=lax`
    } catch { /* blocked */ }
  }
}

export function getAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.expires && Date.now() > data.expires) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    const { expires, ...rest } = data
    return rest
  } catch {
    return null
  }
}

export function getFbp() {
  return getCookie('_fbp')
}

export function getFbc() {
  return getCookie('_fbc')
}

export function getTtclid() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw).ttclid ?? null
  } catch {
    return null
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}
