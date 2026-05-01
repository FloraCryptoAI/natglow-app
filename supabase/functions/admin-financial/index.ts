import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

// Supabase é a fonte de verdade para contagens de assinatura
async function fetchAllSupabaseSubs(): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.asc&limit=1000`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// Stripe só para receita total acumulada (invoices pagas)
async function fetchTotalRevenueCents(): Promise<number> {
  let total = 0
  let startingAfter = ''
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: '100', status: 'paid' })
    if (startingAfter) q.set('starting_after', startingAfter)
    const data = await stripeGet(`/invoices?${q}`)
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
    if (!(await verifyAdminJWT(token))) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const monthCount = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 3), 12)
    const months = getMonths(monthCount)

    // Busca em paralelo: Supabase (contagens) + Stripe (invoices/pagamentos)
    const [supabaseSubs, recentPaidData, failedData, totalRevenueCents] = await Promise.all([
      fetchAllSupabaseSubs(),
      stripeGet('/invoices?limit=20&status=paid&expand[]=data.customer'),
      stripeGet('/invoices?limit=20&status=open&collection_method=charge_automatically&expand[]=data.customer'),
      fetchTotalRevenueCents(),
    ])

    // Contagens direto do Supabase — mesma fonte que Overview e Usuárias
    const activeCount   = supabaseSubs.filter(s => s.status === 'active').length
    const canceledCount = supabaseSubs.filter(s => s.status === 'canceled').length
    const pastDueCount  = supabaseSubs.filter(s => s.status === 'past_due').length
    const currentMRR    = parseFloat((activeCount * PLAN_PRICE).toFixed(2))
    const projectedARR  = parseFloat((currentMRR * 12).toFixed(2))
    const totalRevenue  = parseFloat((totalRevenueCents / 100).toFixed(2))
    const delinquencyRate = (activeCount + pastDueCount) > 0
      ? parseFloat(((pastDueCount / (activeCount + pastDueCount)) * 100).toFixed(1))
      : 0

    // MRR histórico calculado a partir do Supabase (ISO strings)
    const mrrHistory = months.map(m => {
      const active = supabaseSubs.filter(s => {
        const created   = s.created_at as string
        const canceled  = s.canceled_at as string | null
        return created <= m.endISO && (canceled == null || canceled > m.startISO)
      }).length
      return { label: m.label, mrr: parseFloat((active * PLAN_PRICE).toFixed(2)) }
    })

    // Fluxo mensal: novas e canceladas por mês (Supabase)
    const monthlyFlow = months.map(m => ({
      label: m.label,
      new: supabaseSubs.filter(s =>
        (s.created_at as string) >= m.startISO && (s.created_at as string) <= m.endISO
      ).length,
      canceled: supabaseSubs.filter(s =>
        s.canceled_at != null &&
        (s.canceled_at as string) >= m.startISO &&
        (s.canceled_at as string) <= m.endISO
      ).length,
    }))

    // Pagamentos recentes (Stripe) — dados financeiros reais
    const recentPayments = (recentPaidData.data ?? []).map((inv: any) => ({
      id: inv.id,
      email: inv.customer_email ?? inv.customer?.email ?? '—',
      amount: parseFloat((inv.amount_paid / 100).toFixed(2)),
      currency: (inv.currency ?? 'usd').toUpperCase(),
      date: inv.status_transitions?.paid_at ?? inv.created,
      status: 'paid' as const,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }))

    // Pagamentos com falha (Stripe)
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
