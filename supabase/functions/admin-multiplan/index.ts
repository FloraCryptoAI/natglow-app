import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Detox uses the same plan_key in `subscriptions.pricing_plan` as the old
// bold funnel (one_time_basic, $17). natglow is a separate Hotmart product
// with its own plan_key and variable per-country price — `price` below is
// only a documentation/fallback value, never used for the main revenue calc
// (see roiScore, which uses the real avgTicket instead). natglow also has no
// results/diagnosis page, so `events.results` is optional — omit it entirely
// rather than pointing it at a non-existent event.
const FUNNEL_CONFIG: Record<string, {
  label:       string
  price:       number
  product_id:  string
  plan_key:    string  // what's written to subscriptions.pricing_plan
  cta_source:  string  // metadata.source for cta_clicked
  events: { started: string; completed: string; results?: string; offer: string }
}> = {
  natglow: {
    label:      '/quiz',
    price:      7.9,
    product_id: 'F105945011B',
    plan_key:   'natglow',
    cta_source: 'offer_natglow',
    events: {
      started:   'quiz_natglow_started',
      completed: 'quiz_natglow_completed',
      offer:     'offer_natglow_viewed',
    },
  },
  detox: {
    label:      'Quiz Detox · $17',
    price:      17,
    product_id: '7789064',
    plan_key:   'one_time_basic',
    cta_source: 'offer_detox',
    events: {
      started:   'quiz_detox_started',
      completed: 'quiz_detox_completed',
      results:   'results_detox_viewed',
      offer:     'offer_detox_viewed',
    },
  },
}

const FUNNEL_KEYS = ['natglow', 'detox'] as const

// Two-proportion z-test (returns absolute z value)
function zScore(p1: number, n1: number, p2: number, n2: number): number {
  if (n1 === 0 || n2 === 0) return 0
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  return Math.abs((p1 - p2) / se)
}

type SubRow   = { pricing_plan: string | null; status: string; created_at: string; purchase_amount: number | null; user_id?: string }
type EventRow = { session_id: string; event_type: string; user_id?: string | null; metadata?: { source?: string } | null }

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
        `${SUPABASE_URL}/rest/v1/funnel_events?select=session_id,event_type,user_id,metadata&created_at=gte.${sinceISO}&created_at=lte.${untilISO}&limit=20000`,
        { headers: dbH }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?select=pricing_plan,status,created_at,purchase_amount,user_id&limit=5000`,
        { headers: dbH }
      ),
    ])

    const events:  EventRow[] = await evRes.json().then((d: unknown) => Array.isArray(d) ? d : [])
    const allSubs: SubRow[]   = await subRes.json().then((d: unknown) => Array.isArray(d) ? d : [])

    // Build per-funnel stage sets
    const funnelSessions: Record<string, Record<string, Set<string>>> = {}
    const funnelUserIds:  Record<string, Set<string>> = {}

    for (const fk of FUNNEL_KEYS) {
      funnelSessions[fk] = {
        started:   new Set(),
        completed: new Set(),
        results:   new Set(),
        offer:     new Set(),
        cta:       new Set(),
      }
      funnelUserIds[fk] = new Set()
    }

    for (const ev of events) {
      for (const fk of FUNNEL_KEYS) {
        const cfg = FUNNEL_CONFIG[fk]
        if (ev.event_type === cfg.events.started)   funnelSessions[fk].started.add(ev.session_id)
        if (ev.event_type === cfg.events.completed) funnelSessions[fk].completed.add(ev.session_id)
        if (ev.event_type === cfg.events.results)   funnelSessions[fk].results.add(ev.session_id)
        if (ev.event_type === cfg.events.offer)     funnelSessions[fk].offer.add(ev.session_id)
        if (ev.event_type === 'cta_clicked' && ev.metadata?.source === cfg.cta_source) {
          funnelSessions[fk].cta.add(ev.session_id)
          if (ev.user_id) funnelUserIds[fk].add(ev.user_id)
        }
      }
    }

    // Conversions: subscriptions whose user_id appears in funnel's cta-clicked set
    // (best-effort attribution since both funnels write the same plan_key)
    const periodSubs = allSubs.filter(s => s.created_at >= sinceISO && s.created_at <= untilISO)

    const funnelMetrics = FUNNEL_KEYS.map(fk => {
      const cfg     = FUNNEL_CONFIG[fk]
      const stages  = funnelSessions[fk]
      const userIds = funnelUserIds[fk]

      const started     = stages.started.size
      const completed   = stages.completed.size
      const resultsView = stages.results.size
      const offerView   = stages.offer.size
      const ctaClicked  = stages.cta.size

      const conversionSubs = periodSubs.filter(
        s => s.status === 'active' && s.user_id && userIds.has(s.user_id)
      )
      const conversions   = conversionSubs.length
      const revenuePeriod = parseFloat(
        conversionSubs.reduce((acc, s) => acc + (s.purchase_amount ?? cfg.price), 0).toFixed(2)
      )

      const completionRate = started > 0 ? parseFloat(((completed   / started) * 100).toFixed(1)) : 0
      const conversionRate = started > 0 ? parseFloat(((conversions / started) * 100).toFixed(1)) : 0
      const avgTicket      = conversions > 0 ? parseFloat((revenuePeriod / conversions).toFixed(2)) : 0

      // Refund rate from all-time subscriptions matching this funnel's user_ids
      // (only those with user_id we attributed to this funnel)
      const allFunnelSubs = allSubs.filter(s => s.user_id && userIds.has(s.user_id))
      const totalSubs     = allFunnelSubs.length
      const activeSubs    = allFunnelSubs.filter(s => s.status === 'active').length
      const refundedSubs  = allFunnelSubs.filter(s => s.status === 'refunded' || s.status === 'chargeback').length
      const refundRate    = (activeSubs + refundedSubs) > 0
        ? parseFloat((refundedSubs / (activeSubs + refundedSubs) * 100).toFixed(1))
        : 0

      // Use the real average ticket, not the fixed `cfg.price` — natglow's
      // price varies by country, so a flat number would misrank it against
      // detox. For detox this is numerically identical to before (flat $17
      // price === real avgTicket).
      const roiScore = parseFloat(((conversionRate / 100) * avgTicket).toFixed(4))

      return {
        plan_key:        fk,                  // 'natglow' | 'detox'
        label:           cfg.label,
        price:           cfg.price,
        product_id:      cfg.product_id,
        quiz_started:    started,
        quiz_completed:  completed,
        results_viewed:  cfg.events.results ? resultsView : null,
        offer_viewed:    offerView,
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
    const sorted   = [...funnelMetrics].sort((a, b) => b.roi_score - a.roi_score)
    const winner   = sorted[0]
    const runnerUp = sorted[1]

    let sigLevel: 'significant' | 'trend' | 'insufficient' = 'insufficient'
    let zVal  = 0
    let note  = 'Dados insuficientes. Mínimo: 50 visitas por funil.'

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
          note = `Tendência detectada mas amostra ainda pequena (${minN} visitas). Mínimo recomendado: 100/funil.`
        } else {
          sigLevel = 'insufficient'
          note = `Diferença não é estatisticamente significativa ainda. Continue coletando dados.`
        }
      } else {
        note = `Amostra insuficiente (${Math.min(n1 ?? 0, n2 ?? 0)} visitas no menor funil). Necessário ≥50 por funil.`
      }
    }

    return new Response(JSON.stringify({
      plans: funnelMetrics,
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
