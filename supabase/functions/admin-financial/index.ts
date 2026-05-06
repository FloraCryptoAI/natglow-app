import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { fetchTotalRevenueCents } from '../_shared/stripe-revenue.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_KEY          = Deno.env.get('STRIPE_SECRET_KEY')!

const PLAN_MRR: Record<string, number> = {
  monthly_499:  4.99,
  monthly_699:  6.99,
  monthly_1499: 14.99,
}

const PLAN_LABELS: Record<string, string> = {
  monthly_499:  'Monthly $4.99',
  monthly_699:  'Monthly $6.99',
  monthly_1499: 'Monthly $14.99',
}

function subMrr(planKey: string | null | undefined): number {
  const key = planKey ?? 'monthly_699'
  return PLAN_MRR[key] ?? 6.99
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? 'Stripe error')
  return data
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

    const url        = new URL(req.url)
    const monthCount = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 3), 12)
    const months     = getMonths(monthCount)

    const [supabaseSubs, recentPaidData, failedData, totalRevenueCents] = await Promise.all([
      fetchAllSupabaseSubs(),
      stripeGet('/invoices?limit=20&status=paid&expand[]=data.customer'),
      stripeGet('/invoices?limit=20&status=open&collection_method=charge_automatically&expand[]=data.customer'),
      fetchTotalRevenueCents(),
    ])

    // Counts from Supabase (source of truth for subscribers)
    const activeCount   = supabaseSubs.filter(s => s.status === 'active').length
    const canceledCount = supabaseSubs.filter(s => s.status === 'canceled').length
    const pastDueCount  = supabaseSubs.filter(s => s.status === 'past_due').length

    // MRR = sum of per-subscription MRR equivalent (multi-plan aware)
    const currentMRR = parseFloat(
      supabaseSubs
        .filter(s => s.status === 'active')
        .reduce((acc, s) => acc + subMrr(s.pricing_plan as string | null), 0)
        .toFixed(2)
    )
    const projectedARR = parseFloat((currentMRR * 12).toFixed(2))
    const totalRevenue = parseFloat((totalRevenueCents / 100).toFixed(2))
    const delinquencyRate = (activeCount + pastDueCount) > 0
      ? parseFloat(((pastDueCount / (activeCount + pastDueCount)) * 100).toFixed(1))
      : 0

    // Historical MRR — per-subscription MRR accumulated per month
    const mrrHistory = months.map(m => {
      const mrr = supabaseSubs
        .filter(s => {
          const created  = s.created_at as string
          const canceled = s.canceled_at as string | null
          return created <= m.endISO && (canceled == null || canceled > m.startISO)
        })
        .reduce((acc, s) => acc + subMrr(s.pricing_plan as string | null), 0)
      return { label: m.label, mrr: parseFloat(mrr.toFixed(2)) }
    })

    // Monthly flow (new vs canceled)
    const monthlyFlow = months.map(m => ({
      label:    m.label,
      new:      supabaseSubs.filter(s =>
        (s.created_at as string) >= m.startISO && (s.created_at as string) <= m.endISO
      ).length,
      canceled: supabaseSubs.filter(s =>
        s.canceled_at != null &&
        (s.canceled_at as string) >= m.startISO && (s.canceled_at as string) <= m.endISO
      ).length,
    }))

    // Per-plan breakdown (for the new section in Financial)
    const planBreakdown = Object.entries(PLAN_MRR).map(([key, mrr]) => {
      const isDefault = key === 'monthly_699'
      const planSubs  = supabaseSubs.filter(s => {
        const p = (s.pricing_plan as string | null) ?? 'monthly_699'
        return isDefault ? (p === 'monthly_699' || !s.pricing_plan) : p === key
      })
      const activePlan   = planSubs.filter(s => s.status === 'active').length
      const canceledPlan = planSubs.filter(s => s.status === 'canceled').length
      return {
        plan_key:         key,
        label:            PLAN_LABELS[key] ?? key,
        mrr_per_user:     mrr,
        active_count:     activePlan,
        canceled_count:   canceledPlan,
        mrr_contribution: parseFloat((activePlan * mrr).toFixed(2)),
      }
    })

    const recentPayments = (recentPaidData.data ?? []).map((inv: any) => ({
      id:         inv.id,
      email:      inv.customer_email ?? inv.customer?.email ?? '—',
      amount:     parseFloat((inv.amount_paid / 100).toFixed(2)),
      currency:   (inv.currency ?? 'usd').toUpperCase(),
      date:       inv.status_transitions?.paid_at ?? inv.created,
      status:     'paid' as const,
      hostedUrl:  inv.hosted_invoice_url ?? null,
    }))

    const failedPayments = (failedData.data ?? [])
      .filter((inv: any) => inv.attempt_count > 0)
      .map((inv: any) => ({
        id:     inv.id,
        email:  inv.customer_email ?? inv.customer?.email ?? '—',
        amount: parseFloat((inv.amount_due / 100).toFixed(2)),
        date:   inv.created,
        error:  inv.last_payment_error?.message ?? 'Falha no pagamento',
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
      planBreakdown,
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
