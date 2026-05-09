import { getConfig, getSecret, logTrackingEvent } from './tracking-config.ts'

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value.toLowerCase().trim()),
  )
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface FBCAPIParams {
  event_name:    string
  event_id:      string
  event_time?:   number
  user_data: {
    email?:             string
    fbp?:               string
    fbc?:               string
    client_user_agent?: string
    client_ip_address?: string
    external_id?:       string
  }
  custom_data?: {
    value?:            number
    currency?:         string
    content_name?:     string
    content_category?: string
  }
}

export async function sendFacebookCAPIEvent(params: FBCAPIParams): Promise<{ skipped?: boolean; ok?: boolean; error?: string }> {
  const [pixelId, enabled, accessToken, testCode] = await Promise.all([
    getConfig('tracking.facebook.pixel_id'),
    getConfig('tracking.facebook.enabled'),
    getSecret('tracking.facebook.capi_token'),
    getConfig('tracking.facebook.test_event_code'),
  ])

  if (!enabled || !pixelId || !accessToken) return { skipped: true }

  const ud = params.user_data
  const hashedUserData: Record<string, unknown> = {
    fbp: ud.fbp || undefined,
    fbc: ud.fbc || undefined,
    client_user_agent: ud.client_user_agent || undefined,
    client_ip_address: ud.client_ip_address || undefined,
  }
  if (ud.email)       hashedUserData.em          = [await sha256(ud.email)]
  if (ud.external_id) hashedUserData.external_id = [await sha256(ud.external_id)]

  const eventData: Record<string, unknown> = {
    event_name:       params.event_name,
    event_time:       params.event_time ?? Math.floor(Date.now() / 1000),
    event_id:         params.event_id,
    action_source:    'website',
    event_source_url: 'https://app.natglow.app',
    user_data:        hashedUserData,
  }
  if (params.custom_data) eventData.custom_data = params.custom_data

  const body: Record<string, unknown> = { data: [eventData] }
  if (testCode && typeof testCode === 'string' && testCode.trim()) {
    body.test_event_code = testCode
  }

  let result: unknown
  let success = false
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    result  = await res.json()
    success = res.ok
  } catch (err) {
    result  = { error: err instanceof Error ? err.message : 'fetch failed' }
    success = false
  }

  await logTrackingEvent({
    platform:   'facebook',
    event_name: params.event_name,
    event_id:   params.event_id,
    source:     'server',
    success,
    response:   result,
  })

  return success ? { ok: true } : { error: JSON.stringify(result) }
}
