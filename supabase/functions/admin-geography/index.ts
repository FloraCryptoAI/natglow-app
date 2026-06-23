import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const dbHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

const PRODUCT_PRICE_USD = 17  // single product, both Bold and Detox funnels

async function fetchEvents(filter: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/funnel_events?${filter}&limit=20000`,
    { headers: dbHeaders },
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

const COUNTRY_NAMES: Record<string, string> = {
  MX: 'México', US: 'EUA', CO: 'Colombia', AR: 'Argentina', PE: 'Peru',
  VE: 'Venezuela', CL: 'Chile', EC: 'Ecuador', GT: 'Guatemala', CU: 'Cuba',
  BO: 'Bolivia', DO: 'Rep. Dominicana', HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador',
  NI: 'Nicaragua', CR: 'Costa Rica', PR: 'Puerto Rico', PA: 'Panamá', UY: 'Uruguay',
  BR: 'Brasil', ES: 'España', PT: 'Portugal', GB: 'Reino Unido', CA: 'Canadá',
  DE: 'Alemanha', FR: 'França', IT: 'Itália', AU: 'Austrália', NZ: 'Nova Zelândia',
}

function getMonths(n: number) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return {
      label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  })
}

// Distinguish bold vs detox by the cta_clicked metadata.source value
function funnelFromSource(source: string | null | undefined): 'bold' | 'detox' | 'unknown' {
  if (source === 'offer_bold')  return 'bold'
  if (source === 'offer_detox') return 'detox'
  return 'unknown'
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

    // Fetch every event we need to build per-country funnel metrics.
    // Both legacy (quiz_started/quiz_completed) and persuasive (quiz_*_started/completed)
    // events are unioned so historical data remains visible.
    const STARTED_TYPES   = 'in.(quiz_started,quiz_bold_started,quiz_detox_started)'
    const COMPLETED_TYPES = 'in.(quiz_completed,quiz_bold_completed,quiz_detox_completed)'

    const [startedEvents, completedEvents, payEvents, ctaEvents] = await Promise.all([
      fetchEvents(`event_type=${STARTED_TYPES}&select=session_id,pais,event_type,created_at`),
      fetchEvents(`event_type=${COMPLETED_TYPES}&select=session_id,event_type,created_at`),
      fetchEvents('event_type=eq.payment_completed&select=session_id,user_id,metadata,created_at'),
      fetchEvents('event_type=eq.cta_clicked&select=session_id,metadata'),
    ])

    // Build session → country map (from quiz_started, the only event with pais)
    const sessionCountry: Record<string, string> = {}
    for (const e of startedEvents) {
      const sid  = e.session_id as string
      const pais = e.pais as string | null
      if (sid && pais && pais !== 'XX' && pais !== 'T1') sessionCountry[sid] = pais
    }

    // Build session → funnel map (from cta_clicked metadata.source).
    // The event_type prefix on quiz_started/completed also tells us bold vs detox.
    const sessionFunnel: Record<string, 'bold' | 'detox' | 'unknown'> = {}
    for (const e of startedEvents) {
      const sid = e.session_id as string
      const t   = e.event_type as string
      if (!sid) continue
      if (t === 'quiz_bold_started')  sessionFunnel[sid] = 'bold'
      if (t === 'quiz_detox_started') sessionFunnel[sid] = 'detox'
    }
    for (const e of ctaEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      const src = (e.metadata as { source?: string } | null)?.source
      const f   = funnelFromSource(src)
      if (f !== 'unknown') sessionFunnel[sid] = f
    }
    // Fall back: payment_completed events also carry metadata.source
    for (const e of payEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      if (sessionFunnel[sid]) continue
      const src = (e.metadata as { source?: string } | null)?.source
      const f   = funnelFromSource(src)
      if (f !== 'unknown') sessionFunnel[sid] = f
    }

    // ── Per-country aggregation ───────────────────────────────────────────
    type CountryStats = {
      started: number
      completed: number
      paid: number
      revenue: number
      bold_paid: number
      detox_paid: number
    }
    const byCountry: Record<string, CountryStats> = {}
    const ensure = (c: string): CountryStats => {
      if (!byCountry[c]) {
        byCountry[c] = { started: 0, completed: 0, paid: 0, revenue: 0, bold_paid: 0, detox_paid: 0 }
      }
      return byCountry[c]
    }

    // Count unique sessions per country (a session = 1 visitor)
    const startedByCountry: Record<string, Set<string>>   = {}
    const completedByCountry: Record<string, Set<string>> = {}
    const paidByCountry: Record<string, Set<string>>      = {}

    for (const e of startedEvents) {
      const sid  = e.session_id as string
      const pais = sessionCountry[sid]
      if (!sid || !pais) continue
      if (!startedByCountry[pais]) startedByCountry[pais] = new Set()
      startedByCountry[pais].add(sid)
    }

    for (const e of completedEvents) {
      const sid  = e.session_id as string
      const pais = sessionCountry[sid]
      if (!sid || !pais) continue
      if (!completedByCountry[pais]) completedByCountry[pais] = new Set()
      completedByCountry[pais].add(sid)
    }

    for (const e of payEvents) {
      const sid  = e.session_id as string
      const pais = sessionCountry[sid]
      if (!sid || !pais) continue
      if (!paidByCountry[pais]) paidByCountry[pais] = new Set()
      const sizeBefore = paidByCountry[pais].size
      paidByCountry[pais].add(sid)
      if (paidByCountry[pais].size > sizeBefore) {
        // first time we see this paid session — attribute to bold/detox
        const stats = ensure(pais)
        const f = sessionFunnel[sid] ?? 'unknown'
        if (f === 'bold')  stats.bold_paid++
        if (f === 'detox') stats.detox_paid++
      }
    }

    for (const pais of Object.keys({ ...startedByCountry, ...completedByCountry, ...paidByCountry })) {
      const stats = ensure(pais)
      stats.started   = startedByCountry[pais]?.size   ?? 0
      stats.completed = completedByCountry[pais]?.size ?? 0
      stats.paid      = paidByCountry[pais]?.size      ?? 0
      stats.revenue   = stats.paid * PRODUCT_PRICE_USD
    }

    const countries = Object.entries(byCountry)
      .map(([pais, s]) => ({
        pais,
        nome:           COUNTRY_NAMES[pais] ?? pais,
        started:        s.started,
        completed:      s.completed,
        paid:           s.paid,
        revenue:        s.revenue,
        bold_paid:      s.bold_paid,
        detox_paid:     s.detox_paid,
        conv_rate:      s.started > 0   ? parseFloat(((s.paid / s.started) * 100).toFixed(2))   : 0,
        completion_rate: s.started > 0  ? parseFloat(((s.completed / s.started) * 100).toFixed(1)) : 0,
        paid_per_completion: s.completed > 0 ? parseFloat(((s.paid / s.completed) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.started - a.started)

    // ── Totals across all countries ───────────────────────────────────────
    const totalStarted   = countries.reduce((a, c) => a + c.started, 0)
    const totalCompleted = countries.reduce((a, c) => a + c.completed, 0)
    const totalPaid      = countries.reduce((a, c) => a + c.paid, 0)
    const totalRevenue   = totalPaid * PRODUCT_PRICE_USD
    const overallConv    = totalStarted > 0
      ? parseFloat(((totalPaid / totalStarted) * 100).toFixed(2))
      : 0

    // Best converting country (require at least 10 quiz starts to avoid noise)
    const bestConverter = countries
      .filter(c => c.started >= 10)
      .sort((a, b) => b.conv_rate - a.conv_rate)[0] ?? null

    // ── Monthly trend — split by funnel (bold vs detox) ───────────────────
    const months = getMonths(6)
    const monthlyTrend = months.map(m => {
      let bold = 0, detox = 0
      for (const e of payEvents) {
        const d   = new Date(e.created_at as string)
        if (d < m.start || d > m.end) continue
        const sid = e.session_id as string
        const f   = sessionFunnel[sid] ?? 'unknown'
        if (f === 'bold')  bold++
        if (f === 'detox') detox++
      }
      return {
        label: m.label,
        bold,
        detox,
        revenue: (bold + detox) * PRODUCT_PRICE_USD,
      }
    })

    // ── Recent window stats (this week / month) by funnel ─────────────────
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let weekBold = 0, weekDetox = 0, monthBold = 0, monthDetox = 0
    for (const e of payEvents) {
      const d   = new Date(e.created_at as string)
      const sid = e.session_id as string
      const f   = sessionFunnel[sid] ?? 'unknown'
      if (d >= weekStart) {
        if (f === 'bold')  weekBold++
        if (f === 'detox') weekDetox++
      }
      if (d >= monthStart) {
        if (f === 'bold')  monthBold++
        if (f === 'detox') monthDetox++
      }
    }

    return new Response(JSON.stringify({
      countries,
      totals: {
        countries_with_traffic: countries.length,
        started:    totalStarted,
        completed:  totalCompleted,
        paid:       totalPaid,
        revenue:    totalRevenue,
        conv_rate:  overallConv,
      },
      bestConverter,
      monthlyTrend,
      recent: { weekBold, weekDetox, monthBold, monthDetox },
      product_price_usd: PRODUCT_PRICE_USD,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
