import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Both /quiz-bold and /quiz-detox use plan_key 'one_time_basic' ($17).
// Standard/Premium are legacy plans kept for historical orders.
const PLAN_REVENUE: Record<string, number> = {
  one_time_basic:    17,
  one_time_standard: 27,
  one_time_premium:  47,
}

const PLAN_LABELS_COSTS: Record<string, string> = {
  one_time_basic:    'NatGlow $17 (Bold/Detox)',
  one_time_standard: 'Completo $27 (legado)',
  one_time_premium:  'VIP $47 (legado)',
}

function subRevenue(s: Record<string, unknown>): number {
  if (typeof s.purchase_amount === 'number') return s.purchase_amount
  return PLAN_REVENUE[(s.pricing_plan as string) ?? ''] ?? 0
}

const dbHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ── helpers ────────────────────────────────────────────

function getPeriodDates(period: string, start?: string, end?: string): { startDate: Date; endDate: Date } {
  const now = new Date()
  const endDate = end ? new Date(end) : new Date(now)

  let startDate: Date
  if (period === 'custom' && start) {
    startDate = new Date(start)
  } else if (period === 'today') {
    startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
  } else if (period === '7d') {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === 'current_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 30)
  }

  return { startDate, endDate }
}

function getSixMonths() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startISO  = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const endISO    = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
    const startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
    const endDate   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    const label     = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    months.push({ label, startISO, endISO, startDate, endDate })
  }
  return months
}

async function supabaseGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
  })
  const d = await res.json()
  return Array.isArray(d) ? d : []
}

async function fetchHotmartRevenueInPeriod(
  supabase_url: string, service_key: string,
  startISO: string, endISO: string
): Promise<number> {
  const res = await fetch(
    `${supabase_url}/rest/v1/subscriptions?select=purchase_amount,pricing_plan&status=eq.active&created_at=gte.${startISO}&created_at=lte.${endISO}&limit=2000`,
    { headers: { Authorization: `Bearer ${service_key}`, apikey: service_key } }
  )
  const subs = await res.json()
  if (!Array.isArray(subs)) return 0
  return subs.reduce((acc: number, s: Record<string, unknown>) => acc + subRevenue(s), 0)
}

const CATEGORY_LABELS: Record<string, string> = {
  trafego_pago: 'Tráfego Pago',
  freelancer:   'Freelancer',
  ferramentas:  'Ferramentas',
  outros:       'Outros',
}
const CATEGORY_COLORS: Record<string, string> = {
  trafego_pago: '#7c3aed',
  freelancer:   '#0ea5e9',
  ferramentas:  '#f59e0b',
  outros:       '#6b7280',
}

// ── main handler ───────────────────────────────────────

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const token = req.headers.get('x-admin-token') ?? ''
    if (!(await verifyAdminJWT(token))) return json({ error: 'Não autorizado' }, 401)

    const url  = new URL(req.url)
    const mode = url.searchParams.get('mode')
    const id   = url.searchParams.get('id')

    // ── DELETE ──────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!id) return json({ error: 'id obrigatório' }, 400)
      await fetch(`${SUPABASE_URL}/rest/v1/admin_costs?id=eq.${id}`, {
        method: 'DELETE',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
      })
      return json({ ok: true })
    }

    // ── PATCH (update) ───────────────────────────────────
    if (req.method === 'PATCH') {
      if (!id) return json({ error: 'id obrigatório' }, 400)
      const body = await req.json()
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_costs?id=eq.${id}`, {
        method: 'PATCH',
        headers: dbHeaders,
        body: JSON.stringify(body),
      })
      const patched = await res.json()
      return json(patched[0] ?? { ok: true })
    }

    // ── POST (create) ────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      if (!body.data || !body.categoria || body.valor == null) {
        return json({ error: 'data, categoria e valor são obrigatórios' }, 400)
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_costs`, {
        method: 'POST',
        headers: dbHeaders,
        body: JSON.stringify({
          data:             body.data,
          categoria:        body.categoria,
          descricao_outros: body.descricao_outros ?? null,
          valor:            Number(body.valor),
          observacao:       body.observacao ?? null,
          pricing_plan:     body.pricing_plan ?? null,
          criado_por:       'admin',
        }),
      })
      const inserted = await res.json()
      return json(inserted[0] ?? { ok: true })
    }

    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors })

    // ── GET: list ────────────────────────────────────────
    if (mode === 'list') {
      const page      = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
      const pageSize  = 20
      const offset    = (page - 1) * pageSize
      const categoria = url.searchParams.get('categoria') ?? 'all'
      const period    = url.searchParams.get('period') ?? 'all'
      const startParam = url.searchParams.get('start') ?? ''
      const endParam   = url.searchParams.get('end') ?? ''

      let filter = ''
      if (categoria !== 'all') filter += `&categoria=eq.${categoria}`

      if (period !== 'all') {
        const { startDate, endDate } = getPeriodDates(period, startParam || undefined, endParam || undefined)
        filter += `&data=gte.${startDate.toISOString().slice(0, 10)}`
        filter += `&data=lte.${endDate.toISOString().slice(0, 10)}`
      }

      const listUrl  = `admin_costs?select=*&order=data.desc,criado_em.desc&limit=${pageSize}&offset=${offset}${filter}`
      const countUrl = `admin_costs?select=id${filter}`

      const [costsRes, countRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/${listUrl}`, {
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/${countUrl}`, {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY,
            Prefer: 'count=exact',
          },
        }),
      ])

      const costs = await costsRes.json()
      const countHeader = countRes.headers.get('content-range') ?? ''
      const total = parseInt(countHeader.split('/')[1] ?? '0') || 0

      return json({ costs: Array.isArray(costs) ? costs : [], total, page, pageSize })
    }

    // ── GET: roi ─────────────────────────────────────────
    if (mode === 'roi') {
      const period     = url.searchParams.get('period') ?? '30d'
      const startParam = url.searchParams.get('start') ?? ''
      const endParam   = url.searchParams.get('end') ?? ''

      const { startDate, endDate } = getPeriodDates(period, startParam || undefined, endParam || undefined)
      const startUnix = Math.floor(startDate.getTime() / 1000)
      const endUnix   = Math.floor(endDate.getTime() / 1000)
      const startISO  = startDate.toISOString().slice(0, 10)
      const endISO    = endDate.toISOString().slice(0, 10)

      const sixMonths    = getSixMonths()
      const sixStartDate = sixMonths[0].startDate

      const [periodCostsArr, sixMonthCosts, subs] = await Promise.all([
        supabaseGet(`admin_costs?select=categoria,valor,pricing_plan&data=gte.${startISO}&data=lte.${endISO}`),
        supabaseGet(`admin_costs?select=data,categoria,valor&data=gte.${sixStartDate}&order=data.asc`),
        supabaseGet(`subscriptions?select=created_at,status,pricing_plan,purchase_amount&order=created_at.asc&limit=2000`),
      ])

      const periodRevenue = await fetchHotmartRevenueInPeriod(
        SUPABASE_URL, SUPABASE_SERVICE_KEY,
        startDate.toISOString(), endDate.toISOString()
      )

      // Summary
      const totalCosts   = periodCostsArr.reduce((s, c) => s + Number(c.valor ?? 0), 0)
      const totalRevenue = periodRevenue
      const profit       = totalRevenue - totalCosts
      const margin       = totalRevenue > 0 ? parseFloat(((profit / totalRevenue) * 100).toFixed(1)) : 0
      const trafficCosts = periodCostsArr
        .filter(c => c.categoria === 'trafego_pago')
        .reduce((s, c) => s + Number(c.valor ?? 0), 0)
      const trafficRoi = trafficCosts > 0 ? parseFloat((totalRevenue / trafficCosts).toFixed(2)) : null

      // Six-month chart data
      const sixMonthData = sixMonths.map(m => {
        const monthSubs = subs.filter(s => {
          const c = s.created_at as string
          return c >= m.startISO && c <= m.endISO && s.status === 'active'
        })
        const receita = parseFloat(monthSubs.reduce((acc, s) => acc + subRevenue(s), 0).toFixed(2))
        const custos  = sixMonthCosts
          .filter(c => (c.data as string) >= m.startDate && (c.data as string) <= m.endDate)
          .reduce((s, c) => s + Number(c.valor ?? 0), 0)
        return {
          label:   m.label,
          receita,
          custos:  parseFloat(custos.toFixed(2)),
          lucro:   parseFloat((receita - custos).toFixed(2)),
        }
      })

      // Category distribution for period
      const catMap: Record<string, number> = {}
      for (const c of periodCostsArr) catMap[c.categoria] = (catMap[c.categoria] ?? 0) + Number(c.valor ?? 0)
      const categoryDistribution = Object.entries(catMap).map(([key, value]) => ({
        key,
        name:  CATEGORY_LABELS[key] ?? key,
        color: CATEGORY_COLORS[key] ?? '#6b7280',
        value: parseFloat(value.toFixed(2)),
        pct:   totalCosts > 0 ? parseFloat(((value / totalCosts) * 100).toFixed(1)) : 0,
      }))

      // Traffic ROI by month (last 6 months)
      const trafficRoiByMonth = sixMonths.map(m => {
        const monthSubs = subs.filter(s => {
          const c = s.created_at as string
          return c >= m.startISO && c <= m.endISO && s.status === 'active'
        })
        const receita = parseFloat(monthSubs.reduce((acc, s) => acc + subRevenue(s), 0).toFixed(2))
        const custo   = sixMonthCosts
          .filter(c => c.categoria === 'trafego_pago' &&
            (c.data as string) >= m.startDate && (c.data as string) <= m.endDate)
          .reduce((s, c) => s + Number(c.valor ?? 0), 0)
        return {
          label:   m.label,
          roi:     custo > 0 ? parseFloat((receita / custo).toFixed(2)) : null,
          receita,
          custo:   parseFloat(custo.toFixed(2)),
        }
      })

      // ROI per plan
      const planRoi = Object.keys(PLAN_REVENUE).map(planKey => {
        const planSubs = subs.filter(s => {
          const p = (s.pricing_plan as string | null) ?? 'one_time_basic'
          if (p !== planKey) return false
          const c = s.created_at as string
          return c >= startDate.toISOString() && c <= endDate.toISOString() && s.status === 'active'
        })

        const revenueContribution = parseFloat(planSubs.reduce((acc, s) => acc + subRevenue(s), 0).toFixed(2))

        const planTrafficCosts = parseFloat(
          periodCostsArr
            .filter(c => c.categoria === 'trafego_pago' && c.pricing_plan === planKey)
            .reduce((s, c) => s + Number(c.valor ?? 0), 0)
            .toFixed(2)
        )

        const roi = planTrafficCosts > 0
          ? parseFloat((revenueContribution / planTrafficCosts).toFixed(2))
          : null

        const confidenceLevel: 'high' | 'medium' | 'low' =
          planSubs.length >= 100 ? 'high' : planSubs.length >= 30 ? 'medium' : 'low'

        return {
          plan_key:             planKey,
          label:                PLAN_LABELS_COSTS[planKey] ?? planKey,
          price:                PLAN_REVENUE[planKey] ?? 0,
          active_subs:          planSubs.length,
          revenue_contribution: revenueContribution,
          traffic_costs:        planTrafficCosts,
          roi,
          confidence_level:     confidenceLevel,
        }
      })

      // Global unlinked traffic costs
      const globalTrafficCosts = parseFloat(
        periodCostsArr
          .filter(c => c.categoria === 'trafego_pago' && !PLAN_REVENUE[c.pricing_plan as string])
          .reduce((s, c) => s + Number(c.valor ?? 0), 0)
          .toFixed(2)
      )
      if (globalTrafficCosts > 0) {
        planRoi.push({
          plan_key:             'global',
          label:                'Global (não vinculado)',
          price:                0,
          active_subs:          0,
          revenue_contribution: 0,
          traffic_costs:        globalTrafficCosts,
          roi:                  null,
          confidence_level:     'low' as const,
        })
      }

      return json({
        summary: {
          totalCosts:   parseFloat(totalCosts.toFixed(2)),
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          profit:       parseFloat(profit.toFixed(2)),
          margin,
          trafficRoi,
          trafficCosts: parseFloat(trafficCosts.toFixed(2)),
        },
        sixMonthData,
        categoryDistribution,
        trafficRoiByMonth,
        planRoi,
      })
    }

    return new Response('Bad request', { status: 400, headers: cors })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
