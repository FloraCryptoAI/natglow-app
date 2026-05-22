import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type QuizAnswers = Record<string, string>

function diagnosisLevel(answers: QuizAnswers): 'green' | 'amber' | 'red' {
  let score = 0
  if (answers?.chemProducts === 'yes_heavy') score += 2
  if (answers?.chemProducts === 'yes_mild') score += 1
  if (answers?.waterTemp === 'hot') score += 1
  if (answers?.heatTools === 'daily') score += 2
  if (answers?.heatTools === 'few') score += 1
  if (answers?.hydration === 'never') score += 2
  if (answers?.hydration === 'sometimes') score += 1
  if (answers?.washFreq === 'daily') score += 1
  if (score >= 4) return 'red'
  if (score >= 2) return 'amber'
  return 'green'
}

async function fetchSubsList(
  search: string, status: string, sort: string, order: string,
  page: number, perPage: number
) {
  const params = new URLSearchParams({
    select: '*',
    order: `${sort}.${order}`,
    limit: String(perPage),
    offset: String((page - 1) * perPage),
  })
  if (search) params.append('email', `ilike.*${search}*`)
  if (status) params.append('status', `eq.${status}`)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?${params}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      Prefer: 'count=exact',
    },
  })
  const subs = await res.json()
  const range = res.headers.get('Content-Range') ?? ''
  const total = parseInt(range.split('/')[1] ?? '0')
  return { subs, total: isNaN(total) ? 0 : total }
}

async function fetchFunnelData(userIds: string[]) {
  if (userIds.length === 0) return {}
  const inClause = `(${userIds.join(',')})`
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/funnel_events?user_id=in.${inClause}&event_type=eq.quiz_completed&select=user_id,idioma,pais,metadata&order=created_at.desc&limit=200`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    }
  )
  const events = await res.json()
  if (!Array.isArray(events)) return {}

  const byUser: Record<string, { idioma: string | null; pais: string | null; answers: QuizAnswers | null; diagnosis: string | null }> = {}
  for (const ev of events) {
    if (!byUser[ev.user_id]) {
      const answers = ev.metadata?.answers ?? null
      byUser[ev.user_id] = {
        idioma: ev.idioma ?? null,
        pais: ev.pais ?? null,
        answers,
        diagnosis: answers ? diagnosisLevel(answers) : null,
      }
    }
  }
  return byUser
}

async function fetchAuthUser(userId: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  })
  return res.ok ? res.json() : null
}

function buildPaymentHistory(sub: Record<string, unknown> | null) {
  if (!sub) return []
  return [{
    id:       (sub.hotmart_transaction_id as string) ?? (sub.id as string) ?? '—',
    amount:   typeof sub.purchase_amount === 'number' ? sub.purchase_amount : 0,
    currency: (sub.purchase_currency as string) ?? 'USD',
    status:   (sub.status as string) ?? 'active',
    date:     (sub.created_at as string) ?? null,
  }]
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
    const mode = url.searchParams.get('mode') ?? 'list'

    // ── DETAIL MODE ──
    if (mode === 'detail') {
      const userId = url.searchParams.get('user_id')
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id required' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const [subRes, authUser] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=*&limit=1`,
          { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
        ),
        fetchAuthUser(userId),
      ])
      const subs = await subRes.json()
      const sub = subs[0] ?? null

      const funnelData = await fetchFunnelData([userId])
      const quiz = funnelData[userId] ?? null

      const payments = buildPaymentHistory(sub)

      return new Response(
        JSON.stringify({ subscription: sub, user: authUser, quiz, payments }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // ── LIST MODE ──
    const page    = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = parseInt(url.searchParams.get('per_page') ?? '20')
    const search  = url.searchParams.get('search') ?? ''
    const status  = url.searchParams.get('status') ?? ''
    const sort    = url.searchParams.get('sort') ?? 'created_at'
    const order   = url.searchParams.get('order') ?? 'desc'

    const { subs, total } = await fetchSubsList(search, status, sort, order, page, perPage)

    if (!Array.isArray(subs)) {
      return new Response(JSON.stringify({ users: [], total: 0, page, per_page: perPage }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const userIds = subs.map((s: { user_id: string }) => s.user_id).filter(Boolean)

    const [funnelData, authDetails] = await Promise.all([
      fetchFunnelData(userIds),
      // Fetch last_sign_in_at for each user in the current page (parallel)
      Promise.all(
        (subs as { user_id: string }[]).map(s =>
          s.user_id ? fetchAuthUser(s.user_id) : Promise.resolve(null)
        )
      ).then(results => {
        const map: Record<string, string | null> = {}
        for (const u of results) {
          if (u?.id) map[u.id] = u.last_sign_in_at ?? null
        }
        return map
      }),
    ])

    const users = subs.map((s: Record<string, unknown>) => ({
      user_id:         s.user_id,
      email:           s.email,
      status:          s.status,
      created_at:      s.created_at,
      last_sign_in_at: authDetails[s.user_id as string] ?? null,
      pricing_plan:    (s.pricing_plan as string | null) ?? 'one_time_standard',
      purchase_amount: s.purchase_amount,
      purchase_currency: s.purchase_currency,
      hotmart_transaction_id: s.hotmart_transaction_id,
      idioma:    funnelData[s.user_id as string]?.idioma    ?? null,
      pais:      funnelData[s.user_id as string]?.pais      ?? null,
      diagnosis: funnelData[s.user_id as string]?.diagnosis ?? null,
    }))

    return new Response(
      JSON.stringify({ users, total, page, per_page: perPage }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
