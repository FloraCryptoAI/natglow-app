import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const dbHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

// Flat price — correct for detox (always $17), but natglow's price varies by
// country ($7.90 USD to $149 MXN etc). Used only as a fallback for legacy
// rows without a real purchase_amount; natglow revenue is computed from the
// real purchase_amount below instead of count × this constant.
const PRODUCT_PRICE_USD = 17

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

// Distinguish natglow vs detox by the cta_clicked metadata.source value
function funnelFromSource(source: string | null | undefined): 'natglow' | 'detox' | 'unknown' {
  if (source === 'offer_natglow') return 'natglow'
  if (source === 'offer_detox')   return 'detox'
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
    // Legacy (quiz_started/quiz_completed), detox, and natglow events are all
    // unioned so historical data remains visible. natglow's event types MUST
    // be included here — omitting them would exclude its visitors from
    // started/completed counts while still counting its purchases, silently
    // inflating conv_rate/completion_rate per country.
    const STARTED_TYPES   = 'in.(quiz_started,quiz_natglow_started,quiz_detox_started)'
    const COMPLETED_TYPES = 'in.(quiz_completed,quiz_natglow_completed,quiz_detox_completed)'

    const [startedEvents, completedEvents, payEvents, ctaEvents, subsRes] = await Promise.all([
      fetchEvents(`event_type=${STARTED_TYPES}&select=session_id,pais,event_type,created_at`),
      // metadata included so we can extract answers.age for the country×age cross-tab
      fetchEvents(`event_type=${COMPLETED_TYPES}&select=session_id,event_type,metadata,created_at`),
      fetchEvents('event_type=eq.payment_completed&select=session_id,user_id,metadata,created_at'),
      fetchEvents('event_type=eq.cta_clicked&select=session_id,metadata'),
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=user_id,purchase_amount,status&status=eq.active&limit=5000`, { headers: dbHeaders }),
    ])

    // Real per-sale amount by user_id — natglow's price varies by country, so
    // a flat constant would misreport its revenue. Detox keeps the flat price
    // (correct for it) via the fallback below.
    const subs: { user_id?: string; purchase_amount?: number | null }[] = await subsRes.json().then((d: unknown) => Array.isArray(d) ? d : [])
    const revenueByUser: Record<string, number> = {}
    for (const s of subs) {
      if (s.user_id && typeof s.purchase_amount === 'number') revenueByUser[s.user_id] = s.purchase_amount
    }

    // Build session → country map (from quiz_started, the only event with pais)
    const sessionCountry: Record<string, string> = {}
    for (const e of startedEvents) {
      const sid  = e.session_id as string
      const pais = e.pais as string | null
      if (sid && pais && pais !== 'XX' && pais !== 'T1') sessionCountry[sid] = pais
    }

    // Build session → age map (from quiz_*_completed.metadata.answers.age).
    // Used below for the country × age cross-tab. age values are buckets:
    // '18_29' | '30_39' | '40_49' | '50_plus'.
    const sessionAge: Record<string, string> = {}
    for (const e of completedEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      const raw = e.metadata as { answers?: Record<string, string> } | null
      const age = raw?.answers?.age
      if (age) sessionAge[sid] = age
    }

    // Build session → funnel map (from cta_clicked metadata.source).
    // The event_type prefix on quiz_started/completed also tells us natglow vs detox.
    const sessionFunnel: Record<string, 'natglow' | 'detox' | 'unknown'> = {}
    for (const e of startedEvents) {
      const sid = e.session_id as string
      const t   = e.event_type as string
      if (!sid) continue
      if (t === 'quiz_natglow_started') sessionFunnel[sid] = 'natglow'
      if (t === 'quiz_detox_started')   sessionFunnel[sid] = 'detox'
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
      natglow_paid: number
      detox_paid: number
    }
    const byCountry: Record<string, CountryStats> = {}
    const ensure = (c: string): CountryStats => {
      if (!byCountry[c]) {
        byCountry[c] = { started: 0, completed: 0, paid: 0, revenue: 0, natglow_paid: 0, detox_paid: 0 }
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
      const uid  = e.user_id as string | undefined
      const pais = sessionCountry[sid]
      if (!sid || !pais) continue
      if (!paidByCountry[pais]) paidByCountry[pais] = new Set()
      const sizeBefore = paidByCountry[pais].size
      paidByCountry[pais].add(sid)
      if (paidByCountry[pais].size > sizeBefore) {
        // first time we see this paid session — attribute to natglow/detox
        // and add its real revenue (falls back to the flat price if no
        // purchase_amount was recorded, e.g. legacy rows).
        const stats = ensure(pais)
        const f = sessionFunnel[sid] ?? 'unknown'
        if (f === 'natglow') stats.natglow_paid++
        if (f === 'detox')   stats.detox_paid++
        stats.revenue += (uid && revenueByUser[uid] != null) ? revenueByUser[uid] : PRODUCT_PRICE_USD
      }
    }

    for (const pais of Object.keys({ ...startedByCountry, ...completedByCountry, ...paidByCountry })) {
      const stats = ensure(pais)
      stats.started   = startedByCountry[pais]?.size   ?? 0
      stats.completed = completedByCountry[pais]?.size ?? 0
      stats.paid      = paidByCountry[pais]?.size      ?? 0
      stats.revenue   = parseFloat(stats.revenue.toFixed(2))
    }

    const countries = Object.entries(byCountry)
      .map(([pais, s]) => ({
        pais,
        nome:           COUNTRY_NAMES[pais] ?? pais,
        started:        s.started,
        completed:      s.completed,
        paid:           s.paid,
        revenue:        s.revenue,
        natglow_paid:   s.natglow_paid,
        detox_paid:     s.detox_paid,
        conv_rate:      s.started > 0   ? parseFloat(((s.paid / s.started) * 100).toFixed(2))   : 0,
        completion_rate: s.started > 0  ? parseFloat(((s.completed / s.started) * 100).toFixed(1)) : 0,
        paid_per_completion: s.completed > 0 ? parseFloat(((s.paid / s.completed) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.started - a.started)

    // Real per-sale amount, falling back to the flat price for legacy rows
    // without a recorded purchase_amount (correct as-is for detox, which is
    // always $17).
    const saleAmount = (e: Record<string, unknown>): number => {
      const uid = e.user_id as string | undefined
      return (uid && revenueByUser[uid] != null) ? revenueByUser[uid] : PRODUCT_PRICE_USD
    }

    // ── Totals across all countries ───────────────────────────────────────
    const totalStarted   = countries.reduce((a, c) => a + c.started, 0)
    const totalCompleted = countries.reduce((a, c) => a + c.completed, 0)
    const totalPaid      = countries.reduce((a, c) => a + c.paid, 0)
    const totalRevenue   = parseFloat(countries.reduce((a, c) => a + c.revenue, 0).toFixed(2))
    const overallConv    = totalStarted > 0
      ? parseFloat(((totalPaid / totalStarted) * 100).toFixed(2))
      : 0

    // Best converting country (require at least 10 quiz starts to avoid noise)
    const bestConverter = countries
      .filter(c => c.started >= 10)
      .sort((a, b) => b.conv_rate - a.conv_rate)[0] ?? null

    // ── Monthly trend — split by funnel (natglow vs detox) ─────────────────
    const months = getMonths(6)
    const monthlyTrend = months.map(m => {
      let natglow = 0, detox = 0, revenue = 0
      for (const e of payEvents) {
        const d   = new Date(e.created_at as string)
        if (d < m.start || d > m.end) continue
        const sid = e.session_id as string
        const f   = sessionFunnel[sid] ?? 'unknown'
        if (f === 'natglow') natglow++
        if (f === 'detox')   detox++
        revenue += saleAmount(e)
      }
      return {
        label: m.label,
        natglow,
        detox,
        revenue: parseFloat(revenue.toFixed(2)),
      }
    })

    // ── Recent window stats (this week / month) by funnel ─────────────────
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let weekNatglow = 0, weekDetox = 0, monthNatglow = 0, monthDetox = 0
    let weekNatglowRevenue = 0, monthNatglowRevenue = 0
    for (const e of payEvents) {
      const d   = new Date(e.created_at as string)
      const sid = e.session_id as string
      const f   = sessionFunnel[sid] ?? 'unknown'
      if (d >= weekStart) {
        if (f === 'natglow') { weekNatglow++; weekNatglowRevenue += saleAmount(e) }
        if (f === 'detox')   weekDetox++
      }
      if (d >= monthStart) {
        if (f === 'natglow') { monthNatglow++; monthNatglowRevenue += saleAmount(e) }
        if (f === 'detox')   monthDetox++
      }
    }

    // ── Country × Age cross-tab ──────────────────────────────────────────
    // For each country with traffic, per-age breakdown of started/paid/conv_rate.
    // Lets the admin answer "in México, which age converts best?" — critical
    // for FB Ads targeting since the winning age cohort varies by country.
    const AGE_BUCKETS = ['18_29', '30_39', '40_49', '50_plus'] as const
    type AgeBucket = typeof AGE_BUCKETS[number]
    const byCountryAge: Record<string, Record<string, { started: Set<string>; paid: Set<string> }>> = {}
    const countryRevenue: Record<string, number> = {}
    const ensureCA = (c: string, age: string) => {
      if (!byCountryAge[c]) byCountryAge[c] = {}
      if (!byCountryAge[c][age]) byCountryAge[c][age] = { started: new Set(), paid: new Set() }
      return byCountryAge[c][age]
    }

    for (const e of startedEvents) {
      const sid  = e.session_id as string
      const pais = sessionCountry[sid]
      const age  = sessionAge[sid]
      if (!sid || !pais || !age) continue
      ensureCA(pais, age).started.add(sid)
    }
    for (const e of payEvents) {
      const sid  = e.session_id as string
      const pais = sessionCountry[sid]
      const age  = sessionAge[sid]
      if (!sid || !pais) continue
      countryRevenue[pais] = (countryRevenue[pais] ?? 0) + saleAmount(e)
      if (!age) continue
      ensureCA(pais, age).paid.add(sid)
    }

    const countryAgeBreakdown = Object.entries(byCountryAge).map(([pais, byAge]) => {
      const by_age: Record<string, { started: number; paid: number; conv_rate: number }> = {}
      let countryStarted = 0
      let countryPaid    = 0
      for (const age of AGE_BUCKETS) {
        const slot   = byAge[age]
        const start  = slot?.started.size ?? 0
        const paid   = slot?.paid.size    ?? 0
        const conv   = start > 0 ? parseFloat(((paid / start) * 100).toFixed(2)) : 0
        by_age[age]  = { started: start, paid, conv_rate: conv }
        countryStarted += start
        countryPaid    += paid
      }
      // Best converting age that has at least 5 starts (avoid noise from tiny cohorts)
      const topAgeEntry = AGE_BUCKETS
        .filter(age => by_age[age].started >= 5)
        .sort((a, b) => by_age[b].conv_rate - by_age[a].conv_rate)[0]
      return {
        pais,
        nome:          COUNTRY_NAMES[pais] ?? pais,
        total_started: countryStarted,
        total_paid:    countryPaid,
        conv_rate:     countryStarted > 0 ? parseFloat(((countryPaid / countryStarted) * 100).toFixed(2)) : 0,
        revenue:       parseFloat((countryRevenue[pais] ?? 0).toFixed(2)),
        by_age,
        top_age:       topAgeEntry ?? null,
      }
    })
    // Keep only countries with at least 10 starts; sort by total_paid desc
    .filter(c => c.total_started >= 10)
    .sort((a, b) => b.total_paid - a.total_paid)

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
      recent: {
        weekNatglow, weekDetox, monthNatglow, monthDetox,
        weekNatglowRevenue: parseFloat(weekNatglowRevenue.toFixed(2)),
        monthNatglowRevenue: parseFloat(monthNatglowRevenue.toFixed(2)),
      },
      countryAgeBreakdown,
      product_price_usd: PRODUCT_PRICE_USD,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
