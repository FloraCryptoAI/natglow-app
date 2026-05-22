import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PLAN_LABELS: Record<string, string> = {
  one_time_basic:    'NatGlow Básico · $17',
  one_time_standard: 'NatGlow Completo · $27',
  one_time_premium:  'NatGlow VIP · $47',
  monthly_499:       'Monthly $4.99',
  monthly_699:       'Monthly $6.99',
  monthly_1499:      'Monthly $14.99',
}

const PLAN_PRICE: Record<string, number> = {
  one_time_basic:    17,
  one_time_standard: 27,
  one_time_premium:  47,
  monthly_499:       4.99,
  monthly_699:       6.99,
  monthly_1499:      14.99,
}

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
    `${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc&limit=2000`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function subAmount(s: Record<string, unknown>): number {
  if (typeof s.purchase_amount === 'number') return s.purchase_amount
  return PLAN_PRICE[(s.pricing_plan as string) ?? ''] ?? 0
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

    const url        = new URL(req.url)
    const monthCount = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 3), 12)
    const months     = getMonths(monthCount)

    const subs = await fetchAllSubs()

    const activeCount     = subs.filter(s => s.status === 'active').length
    const pendingCount    = subs.filter(s => s.status === 'pending').length
    const refundedCount   = subs.filter(s => s.status === 'refunded').length
    const chargebackCount = subs.filter(s => s.status === 'chargeback').length
    const totalSold       = activeCount + refundedCount + chargebackCount

    const totalRevenue = parseFloat(
      subs
        .filter(s => s.status === 'active')
        .reduce((acc, s) => acc + subAmount(s), 0)
        .toFixed(2)
    )

    const avgTicket  = activeCount > 0 ? parseFloat((totalRevenue / activeCount).toFixed(2)) : 0
    const refundRate = totalSold > 0
      ? parseFloat(((refundedCount + chargebackCount) / totalSold * 100).toFixed(1))
      : 0

    // Sales history grouped by month
    const salesHistory = months.map(m => {
      const monthSubs = subs.filter(s => {
        const c = s.created_at as string
        return c >= m.startISO && c <= m.endISO
      })
      const revenue = monthSubs
        .filter(s => s.status === 'active')
        .reduce((acc, s) => acc + subAmount(s), 0)
      return {
        label:   m.label,
        revenue: parseFloat(revenue.toFixed(2)),
        count:   monthSubs.filter(s => s.status === 'active' || s.status === 'pending').length,
      }
    })

    // Per-plan breakdown (active only for revenue)
    const planKeys = [...new Set(subs.map(s => (s.pricing_plan as string) ?? '').filter(Boolean))]
    const planBreakdown = planKeys.map(key => {
      const planSubs = subs.filter(s => (s.pricing_plan as string) === key && s.status === 'active')
      const revenue  = planSubs.reduce((acc, s) => acc + subAmount(s), 0)
      const pct      = totalRevenue > 0 ? parseFloat(((revenue / totalRevenue) * 100).toFixed(1)) : 0
      return {
        plan_key: key,
        label:    PLAN_LABELS[key] ?? key,
        price:    PLAN_PRICE[key]  ?? 0,
        count:    planSubs.length,
        revenue:  parseFloat(revenue.toFixed(2)),
        pct,
      }
    }).sort((a, b) => b.revenue - a.revenue)

    // Recent purchases (last 20, all statuses)
    const recentPurchases = subs.slice(0, 20).map(s => ({
      id:         s.id,
      email:      s.email ?? '—',
      plan:       s.pricing_plan ?? '—',
      plan_label: PLAN_LABELS[(s.pricing_plan as string) ?? ''] ?? ((s.pricing_plan as string) ?? '—'),
      amount:     subAmount(s),
      currency:   (s.purchase_currency as string) ?? 'USD',
      date:       s.created_at,
      status:     (s.status as string) ?? 'active',
    }))

    return new Response(JSON.stringify({
      totalRevenue,
      activeCount,
      pendingCount,
      refundedCount,
      chargebackCount,
      refundRate,
      avgTicket,
      salesHistory,
      planBreakdown,
      recentPurchases,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
