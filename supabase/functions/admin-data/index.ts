import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { fetchTotalRevenueCents } from '../_shared/stripe-revenue.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const PLAN_MRR: Record<string, number> = {
  monthly_499:  4.99,
  monthly_699:  6.99,
  monthly_1499: 14.99,
}

function subMrr(planKey: string | null | undefined): number {
  return PLAN_MRR[planKey ?? 'monthly_699'] ?? 6.99
}

function getMonths12() {
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startISO = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const endISO   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
    const label    = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    months.push({ label, startISO, endISO })
  }
  return months
}


Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const token = req.headers.get('x-admin-token') ?? ''
    const payload = await verifyAdminJWT(token)

    if (!payload) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const monthStartUnix = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000
    )

    const [subsRes, usersRes, eventsRes, totalRevenueCents] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc&limit=1000`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }),
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }),
      fetch(
        `https://api.stripe.com/v1/events?type=customer.subscription.deleted&created[gte]=${monthStartUnix}&limit=100`,
        { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
      ),
      fetchTotalRevenueCents(),
    ])

    const subscriptions = await subsRes.json()
    const usersData = await usersRes.json()
    const eventsData = await eventsRes.json()

    const activeCount    = subscriptions.filter((s: { status: string }) => s.status === 'active').length
    const canceledCount  = subscriptions.filter((s: { status: string }) => s.status === 'canceled').length
    const pastDueCount   = subscriptions.filter((s: { status: string }) => s.status === 'past_due').length
    const canceledThisMonth: number = eventsData.data?.length ?? 0
    const totalRevenue   = parseFloat((totalRevenueCents / 100).toFixed(2))

    // MRR atual = soma do MRR equivalente de cada assinante ativa (multi-plano)
    const currentMRR = parseFloat(
      subscriptions
        .filter((s: any) => s.status === 'active')
        .reduce((acc: number, s: any) => acc + subMrr(s.pricing_plan), 0)
        .toFixed(2)
    )

    const months12 = getMonths12()
    const mrrHistory12 = months12.map(m => {
      const mrr = subscriptions
        .filter((s: any) => {
          const created  = s.created_at as string
          const canceled = s.canceled_at as string | null
          return created <= m.endISO && (canceled == null || canceled > m.startISO)
        })
        .reduce((acc: number, s: any) => acc + subMrr(s.pricing_plan), 0)
      return { label: m.label, mrr: parseFloat(mrr.toFixed(2)) }
    })

    return new Response(
      JSON.stringify({
        subscriptions,
        totalUsers: usersData.users?.length ?? 0,
        activeCount,
        canceledCount,
        pastDueCount,
        canceledThisMonth,
        totalRevenue,
        currentMRR,
        mrrHistory12,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
