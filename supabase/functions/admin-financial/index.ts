import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { PLAN_USD, usdAmount } from '../_shared/plan-pricing.ts'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Plan labels keyed by plan_key as stored in `subscriptions.pricing_plan`.
// /quiz (natglow) is a Hotmart product with per-country local pricing that all
// maps to the same US$7.90 list price. Standard/Premium/one_time_basic kept as
// legacy so historical orders still render with a proper label.
const PLAN_LABELS: Record<string, string> = {
  natglow:                     '/quiz (US$7,90)',
  natglow_free_hotmart_review: 'NatGlow Free / Acesso Hotmart',
  one_time_basic:              'NatGlow · $17 (legado)',
  one_time_standard:           'NatGlow Completo · $27 (legado)',
  one_time_premium:            'NatGlow VIP · $47 (legado)',
  monthly_499:                 'Monthly $4.99 (legado)',
  monthly_699:                 'Monthly $6.99 (legado)',
  monthly_1499:                'Monthly $14.99 (legado)',
}

// USD list price per plan (shared source of truth). Used for the "Preço" column.
const PLAN_PRICE = PLAN_USD

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

// Base USD value of a sub for consolidated reporting (never the local charge).
function subAmount(s: Record<string, unknown>): number {
  return usdAmount({
    amount_usd:   s.amount_usd as number | null | undefined,
    pricing_plan: s.pricing_plan as string | null | undefined,
  })
}

// Rows explicitly marked free/test access (e.g. Hotmart's product-review access)
// must not count toward revenue, ticket, paid-count or ROI anywhere.
function isRevenue(s: Record<string, unknown>): boolean {
  return s.excluded_from_revenue !== true
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

    // Paid subs = active AND not flagged as free/test access. Free/test rows
    // (e.g. the Hotmart product-review access) are excluded from every count and
    // every revenue figure, but still exist in the DB for the Usuárias page.
    const paidActive      = subs.filter(s => s.status === 'active' && isRevenue(s))
    const activeCount     = paidActive.length
    const pendingCount    = subs.filter(s => s.status === 'pending' && isRevenue(s)).length
    const refundedCount   = subs.filter(s => s.status === 'refunded' && isRevenue(s)).length
    const chargebackCount = subs.filter(s => s.status === 'chargeback' && isRevenue(s)).length
    const totalSold       = activeCount + refundedCount + chargebackCount

    const totalRevenue = parseFloat(
      paidActive.reduce((acc, s) => acc + subAmount(s), 0).toFixed(2)
    )

    const avgTicket  = activeCount > 0 ? parseFloat((totalRevenue / activeCount).toFixed(2)) : 0
    const refundRate = totalSold > 0
      ? parseFloat(((refundedCount + chargebackCount) / totalSold * 100).toFixed(1))
      : 0

    // Sales history grouped by month (USD; free/test access excluded)
    const salesHistory = months.map(m => {
      const monthSubs = subs.filter(s => {
        const c = s.created_at as string
        return c >= m.startISO && c <= m.endISO
      })
      const revenue = monthSubs
        .filter(s => s.status === 'active' && isRevenue(s))
        .reduce((acc, s) => acc + subAmount(s), 0)
      return {
        label:   m.label,
        revenue: parseFloat(revenue.toFixed(2)),
        count:   monthSubs.filter(s => (s.status === 'active' || s.status === 'pending') && isRevenue(s)).length,
      }
    })

    // Per-plan breakdown (active + paid only for revenue)
    const planKeys = [...new Set(paidActive.map(s => (s.pricing_plan as string) ?? '').filter(Boolean))]
    const planBreakdown = planKeys.map(key => {
      const planSubs = paidActive.filter(s => (s.pricing_plan as string) === key)
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

    // Recent purchases (last 20, all statuses). Expose BOTH the local charge
    // (amount_original/currency_original) and the consolidated USD value so the
    // UI can render e.g. "BRL R$44,89 / US$7,90". access_type flags free/test.
    const recentPurchases = subs.slice(0, 20).map(s => ({
      id:                s.id,
      email:             s.email ?? '—',
      plan:              s.pricing_plan ?? '—',
      plan_label:        PLAN_LABELS[(s.pricing_plan as string) ?? ''] ?? ((s.pricing_plan as string) ?? '—'),
      amount_usd:        subAmount(s),
      amount_original:   typeof s.purchase_amount === 'number' ? s.purchase_amount : null,
      currency_original: (s.purchase_currency as string) ?? 'USD',
      access_type:       (s.access_type as string) ?? 'paid',
      excluded:          s.excluded_from_revenue === true,
      date:              s.created_at,
      status:            (s.status as string) ?? 'active',
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
