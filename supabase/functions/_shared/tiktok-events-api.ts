import { getConfig, getSecret, logTrackingEvent } from './tracking-config.ts'

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value.toLowerCase().trim()),
  )
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface TikTokEventParams {
  event:       string   // 'ViewContent' | 'SubmitForm' | 'InitiateCheckout' | 'CompletePayment' | 'CompleteRegistration'
  event_id:    string
  event_time?: number
  user_data: {
    email?:       string
    external_id?: string
    ttclid?:      string
    ip?:          string
    user_agent?:  string
  }
  properties?: {
    value?:         number
    currency?:      string
    content_name?:  string
    content_type?:  string
    content_id?:    string
  }
}

export async function sendTikTokEvent(params: TikTokEventParams): Promise<{ skipped?: boolean; ok?: boolean; error?: string }> {
  const [pixelId, enabled, accessToken] = await Promise.all([
    getConfig('tracking.tiktok.pixel_id'),
    getConfig('tracking.tiktok.enabled'),
    getSecret('tracking.tiktok.access_token'),
  ])

  const pixelCode = pixelId != null ? String(pixelId) : null

  if (!enabled || !pixelCode || !accessToken) {
    const reason = !enabled ? 'tiktok_disabled' : !pixelCode ? 'no_pixel_id' : 'no_access_token'
    await logTrackingEvent({
      platform:   'tiktok',
      event_name: params.event,
      event_id:   params.event_id,
      source:     'server',
      success:    false,
      response:   { skipped: true, reason },
    })
    return { skipped: true }
  }

  const ud = params.user_data
  const hashedUserData: Record<string, string | undefined> = {
    ttclid:     ud.ttclid     || undefined,
    ip:         ud.ip         || undefined,
    user_agent: ud.user_agent || undefined,
  }
  if (ud.email)       hashedUserData.email       = await sha256(ud.email)
  if (ud.external_id) hashedUserData.external_id = await sha256(ud.external_id)

  const body = {
    pixel_code: pixelCode,
    event:      params.event,
    event_id:   params.event_id,
    timestamp:  new Date((params.event_time ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    context: {
      user: hashedUserData,
      page: { url: 'https://app.natglow.app' },
    },
    properties: params.properties ?? {},
  }

  let result: unknown
  let success = false
  try {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken as string },
      body:    JSON.stringify(body),
    })
    result  = await res.json()
    success = res.ok
  } catch (err) {
    result  = { error: err instanceof Error ? err.message : 'fetch failed' }
    success = false
  }

  await logTrackingEvent({
    platform:   'tiktok',
    event_name: params.event,
    event_id:   params.event_id,
    source:     'server',
    success,
    response:   result,
  })

  return success ? { ok: true } : { error: JSON.stringify(result) }
}
