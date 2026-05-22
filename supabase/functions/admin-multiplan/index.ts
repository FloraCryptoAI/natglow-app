import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PLAN_CONFIG: Record<string, { label: string; price: number; product_id: string }> = {
  one_time_basic:    { label: 'NatGlow Básico · $17.99',   price: 17.99, product_id: '7789064' },
  one_time_standard: { label: 'NatGlow Completo · $27.99', price: 27.99, product_id: '7789077' },
  one_time_premium:  { label: 'NatGlow VIP · $47.99',      price: 47.99, product_id: '7789099' },
}

const PLAN_KEYS = ['one_time_basic', 'one_time_standard', 'one_time_premium'] as const

const FUNNEL_STEPS = ['quiz_started', 'quiz_completed', 'results_viewed', 'cta_clicked', 'payment_completed'] as const

function normalizePlan(p: string | null | undefined): string {
  if (p && PLAN_CONFIG[p]) return p
  return 'one_time_standard'
}

// Two-proportion z-test (returns absolute z value)
function zScore(p1: number, n1: number, p2: number, n2: number): number {
  if (n1 === 0 || n2 === 0) return 0
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  return Math.abs((p1 - p2) / se)
}

type SubRow   = { pricing_plan: string | null; status: string; created_at: string; purchase_amount: number | null }
type EventRow = { session_id: string; event_type: string; pricing_plan: string | null }

const dbH = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
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

    const url         = new URL(req.url)
    const period      = url.searchParams.get('period') ?? '30d'
    const customStart = url.searchParams.get('start')
    const customEnd   = url.searchParams.get('end')

    const now = new Date()
    let sinceISO: string
    let untilISO: string = now.toISOString()

    if (period === '7d') {
      sinceISO = new Date(now.getTime() - 7  * 86400000).toISOString()
    } else if (period === '90d') {
      sinceISO = new Date(now.getTime() - 90 * 86400000).toISOString()
    } else if (period === 'custom' && customStart) {
      sinceISO = new Date(customStart).toISOString()
      if (customEnd) untilISO = new Date(customEnd + 'T23:59:59').toISOString()
    } else {
      sinceISO = new Date(now.getTime() - 30 * 86400000).toISOString()
    }

    const [evRes, subRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/funnel_events?select=session_id,event_type,pricing_plan&created_at=gte.${sinceISO}&created_at=lte.${untilISO}&limit=20000`,
        { headers: dbH }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?select=pricing_plan,status,created_at,purchase_amount&limit=5000`,
        { headers: dbH }
      ),
    ])

    const events:  EventRow[] = await evRes.json().then(d => Array.isArray(d) ? d : [])
    const allSubs: SubRow[]   = await subRes.json().then(d => Array.isArray(d) ? d : [])

    // Group events into plan → step → Set<session_id>
    const planCounts: Record<string, Record<string, Set<string>>> = {}
    for (const pk of PLAN_KEYS) {
      planCounts[pk] = {}
      for (const step of FUNNEL_STEPS) planCounts[pk][step] = new Set()
    }
    for (const ev of events) {
      const pk = normalizePlan(ev.pricing_plan)
      planCounts[pk]?.[ev.event_type]?.add(ev.session_id)
    }

    // Group subscriptions by plan
    const planSubs: Record<string, SubRow[]> = {}
    for (const pk of PLAN_KEYS) planSubs[pk] = []
    for (const s of allSubs) planSubs[normalizePlan(s.pricing_plan)].push(s)

    // Build metrics per plan
    const planMetrics = PLAN_KEYS.map(pk => {
      const cfg    = PLAN_CONFIG[pk]
      const counts = planCounts[pk]

      const started     = counts['quiz_started']?.size      ?? 0
      const completed   = counts['quiz_completed']?.size    ?? 0
      const viewed      = counts['results_viewed']?.size    ?? 0
      const ctaClicked  = counts['cta_clicked']?.size       ?? 0
      const conversions = counts['payment_completed']?.size ?? 0

      const completionRate = started > 0 ? parseFloat(((completed  / started) * 100).toFixed(1)) : 0
      const conversionRate = started > 0 ? parseFloat(((conversions / started) * 100).toFixed(1)) : 0

      // Revenue: prefer stored purchase_amount, fall back to plan price
      const revenuePeriod = parseFloat(
        [...(counts['payment_completed'] ?? new Set())]
          .reduce((_acc, _sid) => _acc + cfg.price, 0) // use plan price for period events
          .toFixed(2)
      )
      const avgTicket = conversions > 0 ? parseFloat((revenuePeriod / conversions).toFixed(2)) : 0

      // Refund rate from all-time subscriptions for this plan
      const subs        = planSubs[pk]
      const totalSubs   = subs.length
      const activeSubs  = subs.filter(s => s.status === 'active').length
      const refundedSubs = subs.filter(s => s.status === 'refunded' || s.status === 'chargeback').length
      const refundRate   = (activeSubs + refundedSubs) > 0
        ? parseFloat((refundedSubs / (activeSubs + refundedSubs) * 100).toFixed(1))
        : 0

      // ROI score = conversion_rate (fraction) × price
      const roiScore = parseFloat(((conversionRate / 100) * cfg.price).toFixed(4))

      return {
        plan_key:        pk,
        label:           cfg.label,
        price:           cfg.price,
        product_id:      cfg.product_id,
        quiz_started:    started,
        quiz_completed:  completed,
        results_viewed:  viewed,
        cta_clicked:     ctaClicked,
        conversions,
        completion_rate: completionRate,
        conversion_rate: conversionRate,
        revenue_period:  revenuePeriod,
        avg_ticket:      avgTicket,
        refund_rate:     refundRate,
        total_subs:      totalSubs,
        active_subs:     activeSubs,
        roi_score:       roiScore,
      }
    })

    // Winner = highest ROI score
    const sorted   = [...planMetrics].sort((a, b) => b.roi_score - a.roi_score)
    const winner   = sorted[0]
    const runnerUp = sorted[1]

    // Statistical significance via z-test on conversion rates
    let sigLevel: 'significant' | 'trend' | 'insufficient' = 'insufficient'
    let zVal  = 0
    let note  = 'Dados insuficientes. Mínimo: 50 visitas por produto.'

    if (winner && runnerUp) {
      const n1 = winner.quiz_started
      const n2 = runnerUp.quiz_started
      if (n1 >= 50 && n2 >= 50) {
        zVal = zScore(winner.conversion_rate / 100, n1, runnerUp.conversion_rate / 100, n2)
        const minN = Math.min(n1, n2)

        if (zVal >= 1.96 && minN >= 100) {
          sigLevel = 'significant'
          note = `Diferença estatisticamente significativa (p<0.05). ${n1} vs ${n2} visitantes.`
        } else if (zVal >= 1.645 || (zVal >= 1.96 && minN < 100)) {
          sigLevel = 'trend'
          note = `Tendência detectada mas amostra ainda pequena (${minN} visitas). Mínimo recomendado: 100/produto.`
        } else {
          sigLevel = 'insufficient'
          note = `Diferença não é estatisticamente significativa ainda. Continue coletando dados.`
        }
      } else {
        note = `Amostra insuficiente (${Math.min(n1 ?? 0, n2 ?? 0)} visitas no menor produto). Necessário ≥50 por produto.`
      }
    }

    return new Response(JSON.stringify({
      plans: planMetrics,
      period: { start: sinceISO, end: untilISO, label: period },
      significance: {
        winner_key:   winner?.plan_key ?? null,
        winner_label: winner?.label    ?? null,
        level:        sigLevel,
        z_score:      parseFloat(zVal.toFixed(3)),
        note,
      },
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
