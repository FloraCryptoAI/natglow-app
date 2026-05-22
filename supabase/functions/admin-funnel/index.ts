import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FUNNEL_STEPS = [
  'quiz_started',
  'quiz_completed',
  'results_viewed',
  'cta_clicked',
  'payment_completed',
] as const

async function countEvents(
  eventType: string,
  since: string,
  until?: string,
  plan?: string | null,
): Promise<number> {
  const params = new URLSearchParams({
    event_type: `eq.${eventType}`,
    select: 'session_id',
    limit: '10000',
  })
  params.append('created_at', `gte.${since}`)
  if (until) params.append('created_at', `lte.${until}`)

  if (plan && plan !== 'all') {
    if (plan === 'one_time_standard') {
      // Old events with null pricing_plan are treated as one_time_standard
      params.set('or', '(pricing_plan.eq.one_time_standard,pricing_plan.is.null)')
    } else {
      params.append('pricing_plan', `eq.${plan}`)
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/funnel_events?${params}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  })
  const rows: { session_id: string }[] = await res.json()
  return new Set(rows.map(r => r.session_id)).size
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
    const plan        = url.searchParams.get('plan') ?? 'all'   // 'all' | plan_key

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
      FUNNEL_STEPS.map(step => countEvents(step, since, until, plan))
    )

    const steps = FUNNEL_STEPS.map((key, i) => ({ event_type: key, count: counts[i] }))

    return new Response(JSON.stringify({ steps, period, plan }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
