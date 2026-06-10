import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Funnel-specific event maps. Each step accepts an array of event_types
// to count (Set-union of session_ids across them).
const FUNNEL_DEFINITIONS: Record<string, Array<{ key: string; events: string[] }>> = {
  bold: [
    { key: 'quiz_started',      events: ['quiz_bold_started'] },
    { key: 'quiz_completed',    events: ['quiz_bold_completed'] },
    { key: 'results_viewed',    events: ['results_bold_viewed'] },
    { key: 'offer_viewed',      events: ['offer_bold_viewed'] },
    { key: 'cta_clicked',       events: ['cta_clicked'] }, // metadata.source filtered below
    { key: 'payment_completed', events: ['payment_completed'] },
  ],
  detox: [
    { key: 'quiz_started',      events: ['quiz_detox_started'] },
    { key: 'quiz_completed',    events: ['quiz_detox_completed'] },
    { key: 'results_viewed',    events: ['results_detox_viewed'] },
    { key: 'offer_viewed',      events: ['offer_detox_viewed'] },
    { key: 'cta_clicked',       events: ['cta_clicked'] },
    { key: 'payment_completed', events: ['payment_completed'] },
  ],
  // Combined view: counts both bold + detox
  all: [
    { key: 'quiz_started',      events: ['quiz_bold_started', 'quiz_detox_started'] },
    { key: 'quiz_completed',    events: ['quiz_bold_completed', 'quiz_detox_completed'] },
    { key: 'results_viewed',    events: ['results_bold_viewed', 'results_detox_viewed'] },
    { key: 'offer_viewed',      events: ['offer_bold_viewed', 'offer_detox_viewed'] },
    { key: 'cta_clicked',       events: ['cta_clicked'] },
    { key: 'payment_completed', events: ['payment_completed'] },
  ],
}

// For cta_clicked we need to filter by metadata.source matching the funnel
const CTA_SOURCE: Record<string, string> = {
  bold:  'offer_bold',
  detox: 'offer_detox',
}

async function countSessionsForEvents(
  events: string[],
  since: string,
  until: string | undefined,
  funnel: string,
  isCta: boolean,
): Promise<number> {
  const sessions = new Set<string>()

  for (const eventType of events) {
    const params = new URLSearchParams({
      event_type: `eq.${eventType}`,
      select: isCta ? 'session_id,metadata' : 'session_id',
      limit: '20000',
    })
    params.append('created_at', `gte.${since}`)
    if (until) params.append('created_at', `lte.${until}`)

    const res = await fetch(`${SUPABASE_URL}/rest/v1/funnel_events?${params}`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })
    const rows: { session_id: string; metadata?: { source?: string } | null }[] = await res.json()

    for (const r of rows) {
      // Filter cta_clicked by source when funnel is specific
      if (isCta && funnel !== 'all') {
        const expectedSource = CTA_SOURCE[funnel]
        if (r.metadata?.source !== expectedSource) continue
      }
      sessions.add(r.session_id)
    }
  }

  return sessions.size
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const token = req.headers.get('x-admin-token') ?? ''
    if (!(await verifyAdminJWT(token))) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const url         = new URL(req.url)
    const period      = url.searchParams.get('period') ?? '30d'
    const customStart = url.searchParams.get('start')
    const customEnd   = url.searchParams.get('end')
    // Accept legacy `plan` param (defaulted to 'all'), and also new `funnel` param.
    // 'bold' | 'detox' | 'all'
    const funnel      = url.searchParams.get('funnel') ?? url.searchParams.get('plan') ?? 'all'

    const definition = FUNNEL_DEFINITIONS[funnel] ?? FUNNEL_DEFINITIONS.all

    const now = new Date()
    let since: string
    let until: string | undefined

    if (period === 'today') {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      since = d.toISOString()
    } else if (period === '7d') {
      since = new Date(now.getTime() - 7 * 86400000).toISOString()
    } else if (period === 'custom' && customStart) {
      since = new Date(customStart).toISOString()
      if (customEnd) until = new Date(customEnd + 'T23:59:59').toISOString()
    } else {
      since = new Date(now.getTime() - 30 * 86400000).toISOString()
    }

    const counts = await Promise.all(
      definition.map(s => countSessionsForEvents(s.events, since, until, funnel, s.key === 'cta_clicked'))
    )

    const steps = definition.map((s, i) => ({ event_type: s.key, count: counts[i] }))

    return new Response(JSON.stringify({ steps, period, funnel, plan: funnel }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
