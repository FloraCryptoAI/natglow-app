const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const serviceHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey:        SUPABASE_SERVICE_KEY,
}

export async function getConfig(key: string): Promise<unknown> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_config?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
    { headers: serviceHeaders },
  )
  const rows = await res.json()
  return rows[0]?.value ?? null
}

export async function getSecret(key: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_config_secrets?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
    { headers: serviceHeaders },
  )
  const rows = await res.json()
  return rows[0]?.value ?? null
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config`, {
    method:  'POST',
    headers: { ...serviceHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body:    JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString())
    throw new Error(`setConfig failed (${res.status}): ${text}`)
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config_secrets`, {
    method:  'POST',
    headers: { ...serviceHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body:    JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString())
    throw new Error(`setSecret failed (${res.status}): ${text}`)
  }
}

export async function logTrackingEvent(params: {
  platform: string
  event_name: string
  event_id: string
  source?: string
  success: boolean
  response?: unknown
}): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/tracking_events_log`, {
    method:  'POST',
    headers: { ...serviceHeaders, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      platform:   params.platform,
      event_name: params.event_name,
      event_id:   params.event_id,
      source:     params.source ?? 'server',
      success:    params.success,
      response:   params.response ?? null,
    }),
  })
}
