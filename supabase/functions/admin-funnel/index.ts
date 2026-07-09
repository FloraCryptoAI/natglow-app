import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Funnel-specific event maps. Each step accepts an array of event_types
// to count (Set-union of session_ids across them).
// natglow (/quiz) has NO separate results/diagnosis page — the quiz goes
// straight from completion to the offer — so its definition has 5 steps,
// not 6. Any code reading `steps` must key off `event_type`, never a
// positional index, since funnels can have different step counts.
const FUNNEL_DEFINITIONS: Record<string, Array<{ key: string; events: string[] }>> = {
  // Only /quiz (natglow) is shown in the admin now. Detox is hidden (its public
  // funnel still exists, it just doesn't appear here). natglow has NO separate
  // results/diagnosis page — the quiz goes straight from completion to the offer
  // — so it's 5 steps, not 6. Any code reading `steps` must key off `event_type`,
  // never a positional index.
  natglow: [
    { key: 'quiz_started',      events: ['quiz_natglow_started'] },
    { key: 'quiz_completed',    events: ['quiz_natglow_completed'] },
    { key: 'offer_viewed',      events: ['offer_natglow_viewed'] },
    { key: 'cta_clicked',       events: ['cta_clicked'] }, // metadata.source filtered below
    { key: 'payment_completed', events: ['payment_completed'] },
  ],
}

// Events that need source-based filtering when a specific funnel is selected.
// cta_clicked and payment_completed carry metadata.source = 'offer_natglow'.
const SOURCE_FILTERED_STEPS = new Set(['cta_clicked', 'payment_completed'])
const FUNNEL_SOURCE: Record<string, string> = {
  natglow: 'offer_natglow',
}

async function countSessionsForEvents(
  events: string[],
  since: string,
  until: string | undefined,
  funnel: string,
  stepKey: string,
): Promise<number> {
  const sessions = new Set<string>()
  const needsSourceFilter = SOURCE_FILTERED_STEPS.has(stepKey) && FUNNEL_SOURCE[funnel] != null

  for (const eventType of events) {
    const params = new URLSearchParams({
      event_type: `eq.${eventType}`,
      select: needsSourceFilter ? 'session_id,metadata' : 'session_id',
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
      if (needsSourceFilter) {
        const expectedSource = FUNNEL_SOURCE[funnel]
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
    // Only 'natglow' is supported now (detox hidden). Legacy `plan`/`funnel`
    // params or 'all'/'detox' all fall back to the natglow funnel.
    const funnel      = 'natglow'

    const definition = FUNNEL_DEFINITIONS.natglow

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
      definition.map(s => countSessionsForEvents(s.events, since, until, funnel, s.key))
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
