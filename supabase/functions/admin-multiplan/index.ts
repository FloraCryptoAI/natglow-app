import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PLAN_CONFIG: Record<string, { label: string; price: number; interval: string; mrr: number }> = {
  monthly_499:  { label: 'Monthly $4.99',  price: 4.99,  interval: 'month', mrr: 4.99  },
  monthly_699:  { label: 'Monthly $6.99',  price: 6.99,  interval: 'month', mrr: 6.99  },
  monthly_1499: { label: 'Monthly $14.99', price: 14.99, interval: 'month', mrr: 14.99 },
}

const PLAN_KEYS = ['monthly_499', 'monthly_699', 'monthly_1499']

const FUNNEL_STEPS = ['quiz_started', 'quiz_completed', 'results_viewed', 'cta_clicked', 'payment_completed'] as const

function normalizePlan(p: string | null | undefined): string {
  if (!p || !PLAN_CONFIG[p]) return 'monthly_699'
  return p
}

// Two-proportion z-test (returns absolute z value)
function zScore(p1: number, n1: number, p2: number, n2: number): number {
  if (n1 === 0 || n2 === 0) return 0
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  return Math.abs((p1 - p2) / se)
}

type SubRow   = { pricing_plan: string | null; status: string; created_at: string; canceled_at: string | null }
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

    const url        = new URL(req.url)
    const period     = url.searchParams.get('period') ?? '30d'
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

    // Parallel fetch: events in period + all subscriptions (for all-time churn)
    const [evRes, subRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/funnel_events?select=session_id,event_type,pricing_plan&created_at=gte.${sinceISO}&created_at=lte.${untilISO}&limit=20000`,
        { headers: dbH }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?select=pricing_plan,status,created_at,canceled_at&limit=5000`,
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
      const revenuePeriod  = parseFloat((conversions * cfg.price).toFixed(2))
      const mrrAdded       = parseFloat((conversions * cfg.mrr).toFixed(2))

      // Churn (all-time for this plan)
      const subs        = planSubs[pk]
      const totalSubs   = subs.length
      const activeSubs  = subs.filter(s => s.status === 'active').length

      const MS_7D  = 7  * 86400000
      const MS_30D = 30 * 86400000

      const canceled7d  = subs.filter(s => {
        if (!s.canceled_at) return false
        return (new Date(s.canceled_at).getTime() - new Date(s.created_at).getTime()) <= MS_7D
      }).length

      const canceled30d = subs.filter(s => {
        if (!s.canceled_at) return false
        return (new Date(s.canceled_at).getTime() - new Date(s.created_at).getTime()) <= MS_30D
      }).length

      const churn7dPct  = totalSubs > 0 ? parseFloat(((canceled7d  / totalSubs) * 100).toFixed(1)) : 0
      const churn30dPct = totalSubs > 0 ? parseFloat(((canceled30d / totalSubs) * 100).toFixed(1)) : 0

      // Average days active before cancellation
      const canceledWithDates = subs.filter(s => s.canceled_at != null)
      const avgDaysActive = canceledWithDates.length > 0
        ? parseFloat((
            canceledWithDates.reduce((acc, s) =>
              acc + (new Date(s.canceled_at!).getTime() - new Date(s.created_at).getTime()) / 86400000
            , 0) / canceledWithDates.length
          ).toFixed(1))
        : null

      // LTV 90-day estimate + confidence
      let ltv90d: number | null = null
      let ltvConfidence: 'sufficient' | 'trend' | 'insufficient' = 'insufficient'

      if (totalSubs >= 100) ltvConfidence = 'sufficient'
      else if (totalSubs >= 30) ltvConfidence = 'trend'

      if (ltvConfidence !== 'insufficient') {
        if (avgDaysActive !== null && avgDaysActive > 0) {
          const avgMonths     = avgDaysActive / 30
          const cappedMonths  = Math.min(avgMonths, 3)
          ltv90d = parseFloat((cappedMonths * cfg.mrr).toFixed(2))
        } else {
          // No churned users yet — optimistic: assume 3 months full retention
          ltv90d = parseFloat((3 * cfg.mrr).toFixed(2))
        }
      }

      // ROI score = conversion_rate (fraction) × effective_ltv
      const effectiveLtv = ltv90d ?? cfg.mrr * 2
      const roiScore     = parseFloat(((conversionRate / 100) * effectiveLtv).toFixed(4))

      return {
        plan_key: pk,
        label: cfg.label,
        price: cfg.price,
        mrr_per_user: cfg.mrr,
        interval: cfg.interval,
        quiz_started:    started,
        quiz_completed:  completed,
        results_viewed:  viewed,
        cta_clicked:     ctaClicked,
        conversions,
        completion_rate: completionRate,
        conversion_rate: conversionRate,
        revenue_period:  revenuePeriod,
        mrr_added:       mrrAdded,
        total_subs:      totalSubs,
        active_subs:     activeSubs,
        churn_7d_pct:    churn7dPct,
        churn_30d_pct:   churn30dPct,
        avg_days_active: avgDaysActive,
        ltv_90d:         ltv90d,
        ltv_confidence:  ltvConfidence,
        roi_score:       roiScore,
      }
    })

    // Winner = highest ROI score
    const sorted    = [...planMetrics].sort((a, b) => b.roi_score - a.roi_score)
    const winner    = sorted[0]
    const runnerUp  = sorted[1]

    // Statistical significance via z-test on conversion rates
    let sigLevel: 'significant' | 'trend' | 'insufficient' = 'insufficient'
    let zVal  = 0
    let note  = 'Dados insuficientes. Mínimo: 50 visitas por caminho.'

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
          note = `Tendência detectada mas amostra ainda pequena (${minN} visitas). Mínimo recomendado: 100/caminho.`
        } else {
          sigLevel = 'insufficient'
          note = `Diferença não é estatisticamente significativa ainda. Continue coletando dados.`
        }
      } else {
        note = `Amostra insuficiente (${Math.min(n1 ?? 0, n2 ?? 0)} visitas no menor caminho). Necessário ≥50 por caminho.`
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
