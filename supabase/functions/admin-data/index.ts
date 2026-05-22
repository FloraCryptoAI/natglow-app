import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PLAN_PRICE: Record<string, number> = {
  one_time_basic:    17.99,
  one_time_standard: 27.99,
  one_time_premium:  47.99,
}

function subAmount(s: Record<string, unknown>): number {
  if (typeof s.purchase_amount === 'number') return s.purchase_amount
  return PLAN_PRICE[(s.pricing_plan as string) ?? ''] ?? 0
}

function getMonths6() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label:    d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      startISO: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      endISO:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
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

    const [subsRes, usersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc&limit=2000`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      }),
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      }),
    ])

    const subscriptions: Record<string, unknown>[] = await subsRes.json().then(d => Array.isArray(d) ? d : [])
    const usersData = await usersRes.json()

    const activeCount     = subscriptions.filter(s => s.status === 'active').length
    const pendingCount    = subscriptions.filter(s => s.status === 'pending').length
    const refundedCount   = subscriptions.filter(s => s.status === 'refunded').length
    const chargebackCount = subscriptions.filter(s => s.status === 'chargeback').length
    const totalUsers      = usersData.users?.length ?? 0

    const totalRevenue = parseFloat(
      subscriptions
        .filter(s => s.status === 'active')
        .reduce((acc, s) => acc + subAmount(s), 0)
        .toFixed(2)
    )

    const avgTicket = activeCount > 0 ? parseFloat((totalRevenue / activeCount).toFixed(2)) : 0
    const totalSold = activeCount + refundedCount + chargebackCount
    const refundRate = totalSold > 0
      ? parseFloat(((refundedCount + chargebackCount) / totalSold * 100).toFixed(1))
      : 0

    const months6      = getMonths6()
    const salesHistory = months6.map(m => {
      const monthSubs = subscriptions.filter(s => {
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

    return new Response(
      JSON.stringify({
        subscriptions,
        totalUsers,
        activeCount,
        pendingCount,
        refundedCount,
        chargebackCount,
        totalRevenue,
        avgTicket,
        refundRate,
        salesHistory,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
