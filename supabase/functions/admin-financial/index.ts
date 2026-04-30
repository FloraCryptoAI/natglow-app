import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const PLAN_PRICE = 6.99

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? 'Stripe error')
  return data
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

async function fetchTotalRevenueCents(): Promise<number> {
  let total = 0
  let startingAfter = ''
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: '100', status: 'paid' })
    if (startingAfter) q.set('starting_after', startingAfter)
    const data = await stripeGet(`/v1/invoices?${q}`)
    for (const inv of data.data ?? []) total += (inv.amount_paid as number) ?? 0
    if (!data.has_more || data.data.length === 0) break
    startingAfter = data.data[data.data.length - 1].id
  }
  return total
}

function getMonths(n: number) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), 1) / 1000)
    const end = Math.floor(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) / 1000)
    const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    months.push({ label, start, end })
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

    const url = new URL(req.url)
    const monthCount = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 3), 12)
    const months = getMonths(monthCount)

    const [allSubs, recentPaidData, failedData, totalRevenueCents] = await Promise.all([
      fetchAllStripeSubscriptions(),
      stripeGet('/v1/invoices?limit=20&status=paid&expand[]=data.customer'),
      stripeGet('/v1/invoices?limit=20&status=open&collection_method=charge_automatically&expand[]=data.customer'),
      fetchTotalRevenueCents(),
    ])

    const activeCount  = allSubs.filter(s => s.status === 'active').length
    const canceledCount = allSubs.filter(s => s.status === 'canceled').length
    const pastDueCount  = allSubs.filter(s => s.status === 'past_due' || s.status === 'unpaid').length
    const currentMRR    = parseFloat((activeCount * PLAN_PRICE).toFixed(2))
    const projectedARR  = parseFloat((currentMRR * 12).toFixed(2))
    const totalRevenue  = parseFloat((totalRevenueCents / 100).toFixed(2))
    const delinquencyRate = (activeCount + pastDueCount) > 0
      ? parseFloat(((pastDueCount / (activeCount + pastDueCount)) * 100).toFixed(1))
      : 0

    const mrrHistory = months.map(m => {
      const active = allSubs.filter((s: any) => {
        const created   = s.created as number
        const canceled  = s.canceled_at as number | null
        return created <= m.end && (canceled == null || canceled > m.start)
      }).length
      return { label: m.label, mrr: parseFloat((active * PLAN_PRICE).toFixed(2)) }
    })

    const monthlyFlow = months.map(m => ({
      label: m.label,
      new: allSubs.filter((s: any) => s.created >= m.start && s.created <= m.end).length,
      canceled: allSubs.filter((s: any) =>
        s.canceled_at != null && s.canceled_at >= m.start && s.canceled_at <= m.end
      ).length,
    }))

    const recentPayments = (recentPaidData.data ?? []).map((inv: any) => ({
      id: inv.id,
      email: inv.customer_email ?? inv.customer?.email ?? '—',
      amount: parseFloat((inv.amount_paid / 100).toFixed(2)),
      currency: (inv.currency ?? 'usd').toUpperCase(),
      date: inv.status_transitions?.paid_at ?? inv.created,
      status: 'paid' as const,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }))

    const failedPayments = (failedData.data ?? [])
      .filter((inv: any) => inv.attempt_count > 0)
      .map((inv: any) => ({
        id: inv.id,
        email: inv.customer_email ?? inv.customer?.email ?? '—',
        amount: parseFloat((inv.amount_due / 100).toFixed(2)),
        date: inv.created,
        error: inv.last_payment_error?.message ?? 'Falha no pagamento',
      }))

    return new Response(JSON.stringify({
      currentMRR,
      projectedARR,
      totalRevenue,
      activeCount,
      canceledCount,
      pastDueCount,
      delinquencyRate,
      mrrHistory,
      monthlyFlow,
      recentPayments,
      failedPayments,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
