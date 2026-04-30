import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  return res.json()
}

async function fetchAllStripeSubscriptions(): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let startingAfter = ''
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: '100', status: 'all' })
    if (startingAfter) q.set('starting_after', startingAfter)
    const data = await stripeGet(`/v1/subscriptions?${q}`)
    all.push(...(data.data ?? []))
    if (!data.has_more || data.data.length === 0) break
    startingAfter = data.data[data.data.length - 1].id
  }
  return all
}

async function fetchAllSupabaseSubs(): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.asc&limit=1000`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function getMonths(n: number) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    months.push({
      label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      start,
      end,
    })
  }
  return months
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

    const [stripeSubs, supabaseSubs] = await Promise.all([
      fetchAllStripeSubscriptions(),
      fetchAllSupabaseSubs(),
    ])

    const now = new Date()
    const months = getMonths(6)

    // Build map: stripe_subscription_id → canceled_at (Unix seconds)
    const stripeCanceledAt: Record<string, number> = {}
    for (const s of stripeSubs) {
      if (s.id && s.canceled_at != null) {
        stripeCanceledAt[s.id as string] = s.canceled_at as number
      }
    }

    // Enrich Supabase subs with Stripe canceled_at where Supabase doesn't have it
    type EnrichedSub = {
      user_id: unknown
      email: unknown
      status: unknown
      created_at: unknown
      last_access: unknown
      current_period_end: unknown
      stripe_subscription_id: unknown
      createdMs: number | null
      canceledMs: number | null
    }

    const enriched: EnrichedSub[] = supabaseSubs.map(s => {
      const createdMs = s.created_at ? new Date(s.created_at as string).getTime() : null

      // Prefer Supabase canceled_at (ISO), fallback to Stripe (Unix seconds)
      let canceledMs: number | null = null
      if (s.canceled_at) {
        canceledMs = new Date(s.canceled_at as string).getTime()
      } else if (s.stripe_subscription_id && stripeCanceledAt[s.stripe_subscription_id as string]) {
        canceledMs = stripeCanceledAt[s.stripe_subscription_id as string] * 1000
      }

      return { ...s, createdMs, canceledMs }
    })

    // ── Monthly churn rate ──
    const monthlyChurn = months.map(m => {
      const activeAtStart = enriched.filter(s => {
        if (!s.createdMs) return false
        return s.createdMs < m.start.getTime() && (s.canceledMs == null || s.canceledMs > m.start.getTime())
      }).length

      const canceledInMonth = enriched.filter(s => {
        if (!s.canceledMs) return false
        return s.canceledMs >= m.start.getTime() && s.canceledMs <= m.end.getTime()
      }).length

      const churnRate = activeAtStart > 0
        ? parseFloat(((canceledInMonth / activeAtStart) * 100).toFixed(1))
        : 0

      return { label: m.label, churnRate, canceled: canceledInMonth, activeAtStart }
    })

    // ── Average days before canceling ──
    const canceledWithBothDates = enriched.filter(s =>
      s.status === 'canceled' && s.canceledMs != null && s.createdMs != null
    )
    const avgDaysBeforeCancel = canceledWithBothDates.length > 0
      ? Math.round(
          canceledWithBothDates.reduce((sum, s) => {
            return sum + ((s.canceledMs! - s.createdMs!) / (1000 * 60 * 60 * 24))
          }, 0) / canceledWithBothDates.length
        )
      : null

    // ── At-risk users: active, no last_access in 7+ days ──
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const atRiskUsers = enriched
      .filter(s => s.status === 'active')
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
          email: s.email,
          daysSinceAccess: daysSince,
          lastAccess: la ? la.toISOString() : null,
          nextBilling: s.current_period_end,
          userId: s.user_id,
        }
      })
      .sort((a, b) => (b.daysSinceAccess ?? 9999) - (a.daysSinceAccess ?? 9999))

    // ── Engaged users: active for 84+ days (completed all 4 phases) ──
    const engagedUsers = enriched
      .filter(s => {
        if (s.status !== 'active' || !s.createdMs) return false
        return (now.getTime() - s.createdMs) >= 84 * 24 * 60 * 60 * 1000
      })
      .map(s => {
        const completionDate = new Date(s.createdMs! + 84 * 24 * 60 * 60 * 1000)
        return { email: s.email, completionDate: completionDate.toISOString() }
      })
      .sort((a, b) => new Date(a.completionDate).getTime() - new Date(b.completionDate).getTime())

    // ── Cohort retention ──
    const cohortData = months.map(m => {
      const cohort = enriched.filter(s => {
        if (!s.createdMs) return false
        return s.createdMs >= m.start.getTime() && s.createdMs <= m.end.getTime()
      })
      const size = cohort.length
      if (size === 0) return { label: m.label, size: 0, m0: 100, m1: null, m2: null, m3: null }

      const retAt = (offsetMonths: number): number | null => {
        const checkDate = new Date(m.end.getFullYear(), m.end.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999)
        if (checkDate > now) return null
        const still = cohort.filter(s => s.canceledMs == null || s.canceledMs > checkDate.getTime()).length
        return parseFloat(((still / size) * 100).toFixed(1))
      }

      return { label: m.label, size, m0: 100, m1: retAt(1), m2: retAt(2), m3: retAt(3) }
    })

    return new Response(JSON.stringify({
      monthlyChurn,
      avgDaysBeforeCancel,
      atRiskUsers,
      engagedUsers,
      cohortData,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
