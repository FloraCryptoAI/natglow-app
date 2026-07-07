import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Flat price — correct for /quiz-detox (always $17). /quiz (natglow) is a
// separate Hotmart product with variable per-country pricing; its revenue is
// computed from real purchase_amount instead (see revenueByUser below), this
// constant is only used as a fallback for legacy rows without one. Funnel
// attribution comes from funnel_events.payment_completed.metadata.source
// ('offer_natglow' | 'offer_detox').
const PRODUCT_PRICE = 17

// Legacy plan keys are still mapped so historical subs (Stripe era) still
// contribute revenue to global totals; they no longer appear as separate
// rows in the ROI breakdown.
const LEGACY_PLAN_REVENUE: Record<string, number> = {
  one_time_basic:    17,
  one_time_standard: 27,
  one_time_premium:  47,
}

const FUNNEL_LABELS: Record<string, string> = {
  natglow: '/quiz',
  detox:   'Quiz Detox',
  global:  'Global / não vinculado',
}

function subRevenue(s: Record<string, unknown>): number {
  if (typeof s.purchase_amount === 'number') return s.purchase_amount
  return LEGACY_PLAN_REVENUE[(s.pricing_plan as string) ?? ''] ?? PRODUCT_PRICE
}

function sourceToFunnel(src: string | null | undefined): 'natglow' | 'detox' | 'unknown' {
  if (src === 'offer_natglow') return 'natglow'
  if (src === 'offer_detox')   return 'detox'
  return 'unknown'
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

      const [periodCostsArr, sixMonthCosts, subs, periodPayEvents] = await Promise.all([
        supabaseGet(`admin_costs?select=categoria,valor,pricing_plan&data=gte.${startISO}&data=lte.${endISO}`),
        supabaseGet(`admin_costs?select=data,categoria,valor&data=gte.${sixStartDate}&order=data.asc`),
        supabaseGet(`subscriptions?select=created_at,status,pricing_plan,purchase_amount,user_id&order=created_at.asc&limit=2000`),
        // Funnel attribution data: payment_completed events in the period with source metadata
        supabaseGet(`funnel_events?select=metadata,user_id&event_type=eq.payment_completed&created_at=gte.${startDate.toISOString()}&created_at=lte.${endDate.toISOString()}&limit=5000`),
      ])

      // Real per-sale amount by user_id — natglow's price varies by country,
      // so a flat constant would misreport its revenue. Detox keeps the flat
      // price (correct for it) via subRevenue()'s fallback.
      const revenueByUser: Record<string, number> = {}
      for (const s of subs) {
        if (s.status === 'active' && s.user_id) revenueByUser[s.user_id as string] = subRevenue(s)
      }

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

      // ── ROI per FUNNEL (Natglow / Detox / Global) ─────────────────────
      // Revenue comes from funnel_events.payment_completed.metadata.source
      // (set by hotmart-webhook based on user's last cta_clicked source).
      // Real purchase_amount per sale is used (not a flat price) since
      // natglow's price varies by country — detox still nets the same
      // result as before since its price really is flat $17.
      const funnelSales: Record<'natglow' | 'detox' | 'unknown', number> = {
        natglow: 0, detox: 0, unknown: 0,
      }
      const funnelRevenue: Record<'natglow' | 'detox' | 'unknown', number> = {
        natglow: 0, detox: 0, unknown: 0,
      }
      for (const ev of periodPayEvents) {
        const src = (ev.metadata as { source?: string } | null)?.source
        const uid = ev.user_id as string | undefined
        const f   = sourceToFunnel(src)
        funnelSales[f]++
        funnelRevenue[f] += (uid && revenueByUser[uid] != null) ? revenueByUser[uid] : PRODUCT_PRICE
      }
      // Legacy/non-funnel revenue (Stripe era, manual orders, etc.) still
      // counts in totals but goes to 'global' for the breakdown.
      const periodSubsRevenue = subs
        .filter(s => {
          const c = s.created_at as string
          return c >= startDate.toISOString() && c <= endDate.toISOString() && s.status === 'active'
        })
        .reduce((acc, s) => acc + subRevenue(s), 0)
      const funnelEventsRevenue = funnelRevenue.natglow + funnelRevenue.detox + funnelRevenue.unknown
      const unattributedRevenue = Math.max(0, periodSubsRevenue - funnelEventsRevenue)

      // Ad costs per funnel — admin_costs.pricing_plan now accepts 'natglow' / 'detox'
      // as overloaded funnel identifiers. Legacy plan_keys (one_time_*) roll up to global.
      const costsByFunnel = (key: 'natglow' | 'detox' | 'global') =>
        periodCostsArr
          .filter(c => {
            if (c.categoria !== 'trafego_pago') return false
            const pp = c.pricing_plan as string | null
            if (key === 'global') {
              return !pp || (pp !== 'natglow' && pp !== 'detox')
            }
            return pp === key
          })
          .reduce((s, c) => s + Number(c.valor ?? 0), 0)

      const funnelRoi = (['natglow', 'detox'] as const).map(funnel => {
        const sales        = funnelSales[funnel]
        const revenue       = funnelRevenue[funnel]
        const trafficCost  = parseFloat(costsByFunnel(funnel).toFixed(2))
        const roi          = trafficCost > 0 ? parseFloat((revenue / trafficCost).toFixed(2)) : null
        const cpa          = sales > 0 ? parseFloat((trafficCost / sales).toFixed(2)) : null

        const confidenceLevel: 'high' | 'medium' | 'low' =
          sales >= 50 ? 'high' : sales >= 15 ? 'medium' : 'low'

        return {
          funnel,
          label:                FUNNEL_LABELS[funnel],
          price:                PRODUCT_PRICE,
          sales,
          revenue_contribution: parseFloat(revenue.toFixed(2)),
          traffic_costs:        trafficCost,
          roi,
          cpa,
          confidence_level:     confidenceLevel,
        }
      })

      const globalTrafficCosts = parseFloat(costsByFunnel('global').toFixed(2))
      const globalSalesAttributed = funnelSales.unknown
      const globalRevenue = funnelRevenue.unknown + unattributedRevenue
      if (globalTrafficCosts > 0 || globalSalesAttributed > 0 || unattributedRevenue > 0) {
        funnelRoi.push({
          funnel:               'global' as 'natglow' | 'detox',
          label:                FUNNEL_LABELS.global,
          price:                PRODUCT_PRICE,
          sales:                globalSalesAttributed,
          revenue_contribution: parseFloat(globalRevenue.toFixed(2)),
          traffic_costs:        globalTrafficCosts,
          roi:                  globalTrafficCosts > 0 ? parseFloat((globalRevenue / globalTrafficCosts).toFixed(2)) : null,
          cpa:                  globalSalesAttributed > 0 ? parseFloat((globalTrafficCosts / globalSalesAttributed).toFixed(2)) : null,
          confidence_level:     'low',
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
        funnelRoi,
        // Legacy alias so older frontend doesn't crash mid-deploy
        planRoi: funnelRoi,
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
