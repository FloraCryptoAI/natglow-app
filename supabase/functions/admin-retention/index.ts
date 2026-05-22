import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function getMonths(n: number) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label:    d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      startISO: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      endISO:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
    })
  }
  return months
}

async function fetchAllSubs(): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.asc&limit=2000`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
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

    const subs   = await fetchAllSubs()
    const now    = new Date()
    const months = getMonths(6)

    const activeSubs = subs.filter(s => s.status === 'active')

    const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const neverAccessedCount = activeSubs.filter(s => !s.last_access).length
    const engagedCount = activeSubs.filter(s => {
      const la = s.last_access ? new Date(s.last_access as string) : null
      return la != null && la >= sevenDaysAgo
    }).length
    const atRiskCount = activeSubs.filter(s => {
      const la = s.last_access ? new Date(s.last_access as string) : null
      return la == null || la < sevenDaysAgo
    }).length
    const usedIn30Days = activeSubs.filter(s => {
      const la = s.last_access ? new Date(s.last_access as string) : null
      return la != null && la >= thirtyDaysAgo
    }).length
    const usageRate = activeSubs.length > 0
      ? parseFloat(((usedIn30Days / activeSubs.length) * 100).toFixed(1))
      : 0

    // Monthly sales count (all statuses)
    const monthlySales = months.map(m => ({
      label: m.label,
      count: subs.filter(s => {
        const c = s.created_at as string
        return c >= m.startISO && c <= m.endISO
      }).length,
    }))

    // At-risk users (active, no access or last access > 7 days ago), capped at 50
    const atRiskUsers = activeSubs
      .filter(s => {
        const la = s.last_access ? new Date(s.last_access as string) : null
        return la == null || la < sevenDaysAgo
      })
      .map(s => {
        const la = s.last_access ? new Date(s.last_access as string) : null
        const daysSince = la
          ? Math.floor((now.getTime() - la.getTime()) / (1000 * 60 * 60 * 24))
          : null
        return {
          email:           s.email,
          daysSinceAccess: daysSince,
          lastAccess:      la ? la.toISOString() : null,
          purchaseDate:    s.created_at,
          userId:          s.user_id,
        }
      })
      .sort((a, b) => (b.daysSinceAccess ?? 9999) - (a.daysSinceAccess ?? 9999))
      .slice(0, 50)

    // Engaged users (active, accessed in last 7 days), capped at 50
    const engagedUsers = activeSubs
      .filter(s => {
        const la = s.last_access ? new Date(s.last_access as string) : null
        return la != null && la >= sevenDaysAgo
      })
      .map(s => {
        const createdMs = s.created_at ? new Date(s.created_at as string).getTime() : null
        return {
          email:             s.email,
          lastAccess:        s.last_access,
          daysSincePurchase: createdMs != null
            ? Math.floor((now.getTime() - createdMs) / (1000 * 60 * 60 * 24))
            : null,
        }
      })
      .sort((a, b) => {
        if (!a.lastAccess) return 1
        if (!b.lastAccess) return -1
        return new Date(b.lastAccess as string).getTime() - new Date(a.lastAccess as string).getTime()
      })
      .slice(0, 50)

    return new Response(JSON.stringify({
      usageRate,
      engagedCount,
      atRiskCount,
      neverAccessedCount,
      monthlySales,
      atRiskUsers,
      engagedUsers,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
