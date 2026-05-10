import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders }    from '../_shared/cors.ts'
import { getConfig, getSecret, setConfig, setSecret } from '../_shared/tracking-config.ts'
import { sendFacebookCAPIEvent } from '../_shared/facebook-capi.ts'
import { sendTikTokEvent }       from '../_shared/tiktok-events-api.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const serviceHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey:        SUPABASE_SERVICE_KEY,
}

const PUBLIC_KEYS = [
  'tracking.facebook.pixel_id',
  'tracking.facebook.enabled',
  'tracking.facebook.test_event_code',
  'tracking.tiktok.pixel_id',
  'tracking.tiktok.enabled',
  'tracking.tiktok.test_event_code',
  'tracking.consent.required',
]

const SECRET_KEYS = [
  'tracking.facebook.capi_token',
  'tracking.tiktok.access_token',
]

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const url  = new URL(req.url)
  const mode = url.searchParams.get('mode') ?? ''

  // Public endpoint — no admin JWT required, returns only pixel IDs and enabled flags
  if (req.method === 'GET' && mode === 'public') {
    try {
      const pairs = await Promise.all(PUBLIC_KEYS.map(async k => [k, await getConfig(k)]))
      return json(Object.fromEntries(pairs))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro interno'
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
  }

  try {
    const token = req.headers.get('x-admin-token') ?? ''
    if (!(await verifyAdminJWT(token))) return json({ error: 'Não autorizado' }, 401)

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {

      if (mode === 'full') {
        const [pubPairs, secPairs] = await Promise.all([
          Promise.all(PUBLIC_KEYS.map(async k => [k, await getConfig(k)])),
          Promise.all(SECRET_KEYS.map(async k => {
            const v = await getSecret(k)
            const masked = v ? ('*'.repeat(Math.max(0, v.length - 4)) + v.slice(-4)) : ''
            return [k, masked]
          })),
        ])
        return json({
          ...Object.fromEntries(pubPairs),
          ...Object.fromEntries(secPairs),
        })
      }

      // Stats for admin dashboard sub-tab
      if (mode === 'stats') {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const [logsRes, subsRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/tracking_events_log?created_at=gte.${since}&select=platform,event_name,event_id,source,success,created_at&order=created_at.desc&limit=500`,
            { headers: serviceHeaders },
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/subscriptions?select=attribution&limit=1000`,
            { headers: serviceHeaders },
          ),
        ])
        const logs: Array<{ platform: string; event_name: string; event_id: string; source: string; success: boolean; created_at: string }> = await logsRes.json()
        const subs: Array<{ attribution: Record<string, string> | null }> = await subsRes.json()

        // Build platform summaries
        const summary: Record<string, Record<string, unknown>> = {}
        for (const log of (Array.isArray(logs) ? logs : [])) {
          const p = log.platform
          if (!summary[p]) summary[p] = { total: 0, failed: 0, events: {}, lastAt: null }
          const s = summary[p] as Record<string, unknown>
          ;(s.total as number)++
          if (!log.success) (s.failed as number)++
          const evts = s.events as Record<string, { browser: number; server: number }>
          if (!evts[log.event_name]) evts[log.event_name] = { browser: 0, server: 0 }
          evts[log.event_name][log.source === 'browser' ? 'browser' : 'server']++
          if (!s.lastAt) s.lastAt = log.created_at
        }

        // Deduplication match rate per event_id
        const eventIdMap: Record<string, { browser: boolean; server: boolean }> = {}
        for (const log of (Array.isArray(logs) ? logs : [])) {
          if (log.event_name === 'Purchase' || log.event_name === 'InitiateCheckout' || log.event_name === 'CompletePayment') {
            if (!eventIdMap[log.event_id]) eventIdMap[log.event_id] = { browser: false, server: false }
            if (log.source === 'browser') eventIdMap[log.event_id].browser = true
            else                          eventIdMap[log.event_id].server  = true
          }
        }
        const deduped  = Object.values(eventIdMap).filter(e => e.browser && e.server).length
        const totalIds = Object.keys(eventIdMap).length
        const matchRate = totalIds > 0 ? Math.round((deduped / totalIds) * 100) : null

        // Attribution breakdown from subscriptions
        const utmSources: Record<string, number> = {}
        const utmCampaigns: Record<string, number> = {}
        for (const sub of (Array.isArray(subs) ? subs : [])) {
          if (!sub.attribution) continue
          const src = sub.attribution.utm_source
          const cmp = sub.attribution.utm_campaign
          if (src) utmSources[src]     = (utmSources[src] ?? 0) + 1
          if (cmp) utmCampaigns[cmp]   = (utmCampaigns[cmp] ?? 0) + 1
        }

        return json({ summary, matchRate, totalIds, deduped, utmSources, utmCampaigns })
      }

      return json({ error: 'mode inválido' }, 400)
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()

      // Test Facebook pixel via CAPI
      if (mode === 'test_facebook') {
        const result = await sendFacebookCAPIEvent({
          event_name: 'PageView',
          event_id:   `test_${Date.now()}`,
          user_data:  {},
        })
        return json(result)
      }

      // Test TikTok Events API
      if (mode === 'test_tiktok') {
        // Pre-check so we can return a clear error before even calling sendTikTokEvent
        const [pixelId, enabled, accessToken] = await Promise.all([
          getConfig('tracking.tiktok.pixel_id'),
          getConfig('tracking.tiktok.enabled'),
          getSecret('tracking.tiktok.access_token'),
        ])
        if (!enabled)     return json({ skipped: true, reason: 'TikTok desativado — ative o toggle' })
        if (!pixelId)     return json({ skipped: true, reason: 'Pixel ID não configurado' })
        if (!accessToken) return json({ skipped: true, reason: 'Events API Access Token não configurado — salve o token primeiro' })

        const result = await sendTikTokEvent({
          event:    'ViewContent',
          event_id: `test_${Date.now()}`,
          user_data: {},
        })
        return json(result)
      }

      // Save config values (public or secret)
      if (mode === 'save') {
        const { key, value } = body
        if (!key) return json({ error: 'key obrigatório' }, 400)

        if (SECRET_KEYS.includes(key)) {
          await setSecret(key, String(value))
        } else if (PUBLIC_KEYS.includes(key)) {
          await setConfig(key, value)
        } else {
          return json({ error: 'key não permitida' }, 400)
        }
        return json({ ok: true })
      }

      return json({ error: 'mode inválido para POST' }, 400)
    }

    return new Response('Method not allowed', { status: 405, headers: cors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
