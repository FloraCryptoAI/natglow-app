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

async function countEvents(eventType: string, since: string, until?: string): Promise<number> {
  const params = new URLSearchParams({
    event_type: `eq.${eventType}`,
    select: 'id',
    limit: '0',
  })
  params.append('created_at', `gte.${since}`)
  if (until) params.append('created_at', `lte.${until}`)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/funnel_events?${params}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      Prefer: 'count=exact',
    },
  })
  const range = res.headers.get('Content-Range') ?? ''
  // Format: "*/N" or "0-19/N"
  const total = parseInt(range.split('/')[1] ?? '0')
  return isNaN(total) ? 0 : total
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

    const url = new URL(req.url)
    const period = url.searchParams.get('period') ?? '30d'
    const customStart = url.searchParams.get('start')
    const customEnd = url.searchParams.get('end')

    const now = new Date()
    let since: string
    let until: string | undefined

    if (period === 'today') {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      since = d.toISOString()
    } else if (period === '7d') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      since = d.toISOString()
    } else if (period === 'custom' && customStart) {
      since = new Date(customStart).toISOString()
      if (customEnd) until = new Date(customEnd + 'T23:59:59').toISOString()
    } else {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      since = d.toISOString()
    }

    const counts = await Promise.all(
      FUNNEL_STEPS.map(step => countEvents(step, since, until))
    )

    const steps = FUNNEL_STEPS.map((key, i) => ({ event_type: key, count: counts[i] }))

    return new Response(JSON.stringify({ steps, period }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
