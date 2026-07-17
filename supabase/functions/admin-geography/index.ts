import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { usdAmount } from '../_shared/plan-pricing.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const dbHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

async function fetchEvents(filter: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/funnel_events?${filter}&limit=20000`,
    { headers: dbHeaders },
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// Physical (IP-detected) country names — used for the country×age targeting
// cross-tab, which is about where the buyer physically is, not the offer.
const COUNTRY_NAMES: Record<string, string> = {
  MX: 'México', US: 'EUA', CO: 'Colombia', AR: 'Argentina', PE: 'Peru',
  VE: 'Venezuela', CL: 'Chile', EC: 'Ecuador', GT: 'Guatemala', CU: 'Cuba',
  BO: 'Bolivia', DO: 'Rep. Dominicana', HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador',
  NI: 'Nicaragua', CR: 'Costa Rica', PR: 'Puerto Rico', PA: 'Panamá', UY: 'Uruguay',
  BR: 'Brasil', ES: 'España', PT: 'Portugal', GB: 'Reino Unido', CA: 'Canadá',
  DE: 'Alemanha', FR: 'França', IT: 'Itália', AU: 'Austrália', NZ: 'Nova Zelândia',
}

// Offer country = the ?country= param the visitor entered /quiz with (drives the
// local price/checkout). This is the PRIMARY revenue/conversion dimension —
// NOT physical location. e.g. someone in Brazil opening /quiz?country=mx is a
// México offer. Anything without a valid param (or legacy traffic) → Internacional.
const OFFER_NAMES: Record<string, string> = {
  mx: 'México', co: 'Colombia', pe: 'Perú', cl: 'Chile', default: 'Internacional',
}
const VALID_OFFER = ['mx', 'co', 'pe', 'cl']
function offerBucket(code: unknown): string {
  const c = typeof code === 'string' ? code.toLowerCase() : ''
  return VALID_OFFER.includes(c) ? c : 'default'
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

    // Fetch every event we need to build per-country funnel metrics. Detox is
    // hidden from the admin now, so its event types are NOT unioned here. Legacy
    // (quiz_started/completed, the old /quiz-bold era) and natglow events are.
    // natglow's types MUST be included — omitting them would exclude its visitors
    // from started/completed while still counting its purchases, inflating conv.
    const STARTED_TYPES   = 'in.(quiz_cabello_started)'
    const COMPLETED_TYPES = 'in.(quiz_cabello_completed)'

    const [startedEvents, completedEvents, payEvents, ctaEvents, subsRes] = await Promise.all([
      // metadata included so we can read the offer country (?country=) at the top of funnel
      fetchEvents(`event_type=${STARTED_TYPES}&select=session_id,pais,event_type,metadata,created_at`),
      // metadata included so we can extract answers.age for the country×age cross-tab
      fetchEvents(`event_type=${COMPLETED_TYPES}&select=session_id,event_type,metadata,created_at`),
      fetchEvents('event_type=eq.payment_completed&select=session_id,user_id,metadata,created_at'),
      fetchEvents('event_type=eq.cta_clicked&select=session_id,metadata'),
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=user_id,amount_usd,pricing_plan,excluded_from_revenue,status&status=eq.active&limit=5000`, { headers: dbHeaders }),
    ])

    // Consolidated USD value per sale by user_id (free/test access excluded).
    const subs: { user_id?: string; amount_usd?: number | null; pricing_plan?: string | null; excluded_from_revenue?: boolean }[] =
      await subsRes.json().then((d: unknown) => Array.isArray(d) ? d : [])
    const revenueByUser: Record<string, number> = {}
    for (const s of subs) {
      if (s.user_id && s.excluded_from_revenue !== true) revenueByUser[s.user_id] = usdAmount(s)
    }

    // Build session → PHYSICAL country map (IP `pais`, only on started events).
    // Used for the country×age targeting cross-tab, not for offer revenue.
    const sessionCountry: Record<string, string> = {}
    for (const e of startedEvents) {
      const sid  = e.session_id as string
      const pais = e.pais as string | null
      if (sid && pais && pais !== 'XX' && pais !== 'T1') sessionCountry[sid] = pais
    }

    // Build session → OFFER country map (the ?country= param). Sourced from the
    // started event's metadata.country and the cta_clicked metadata.country.
    const sessionOffer: Record<string, string> = {}
    for (const e of startedEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      const c = (e.metadata as { country?: string } | null)?.country
      if (c != null) sessionOffer[sid] = offerBucket(c)
    }
    for (const e of ctaEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      const c = (e.metadata as { country?: string } | null)?.country
      if (c != null) sessionOffer[sid] = offerBucket(c)
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

    // Offer country of a paid event: prefer the payment's own metadata
    // (stamped by hotmart-webhook), then the session's offer, else Internacional.
    const payOffer = (e: Record<string, unknown>): string => {
      const md = e.metadata as { offer_country?: string } | null
      if (md?.offer_country != null) return offerBucket(md.offer_country)
      return sessionOffer[e.session_id as string] ?? 'default'
    }

    // ── Per-offer-country aggregation (PRIMARY dimension) ─────────────────
    type CountryStats = { started: number; completed: number; paid: number; revenue: number }
    const byCountry: Record<string, CountryStats> = {}
    const ensure = (c: string): CountryStats => {
      if (!byCountry[c]) byCountry[c] = { started: 0, completed: 0, paid: 0, revenue: 0 }
      return byCountry[c]
    }

    // Count unique sessions per offer country (a session = 1 visitor)
    const startedByCountry: Record<string, Set<string>>   = {}
    const completedByCountry: Record<string, Set<string>> = {}
    const paidByCountry: Record<string, Set<string>>      = {}

    for (const e of startedEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      const bucket = sessionOffer[sid] ?? 'default'
      if (!startedByCountry[bucket]) startedByCountry[bucket] = new Set()
      startedByCountry[bucket].add(sid)
    }

    for (const e of completedEvents) {
      const sid = e.session_id as string
      if (!sid) continue
      const bucket = sessionOffer[sid] ?? 'default'
      if (!completedByCountry[bucket]) completedByCountry[bucket] = new Set()
      completedByCountry[bucket].add(sid)
    }

    for (const e of payEvents) {
      const sid    = e.session_id as string
      const uid    = e.user_id as string | undefined
      const bucket = payOffer(e)
      if (!sid) continue
      if (!paidByCountry[bucket]) paidByCountry[bucket] = new Set()
      const sizeBefore = paidByCountry[bucket].size
      paidByCountry[bucket].add(sid)
      if (paidByCountry[bucket].size > sizeBefore) {
        // first time we see this paid session — add its consolidated USD revenue
        ensure(bucket).revenue += (uid && revenueByUser[uid] != null) ? revenueByUser[uid] : 0
      }
    }

    for (const bucket of Object.keys({ ...startedByCountry, ...completedByCountry, ...paidByCountry })) {
      const stats = ensure(bucket)
      stats.started   = startedByCountry[bucket]?.size   ?? 0
      stats.completed = completedByCountry[bucket]?.size ?? 0
      stats.paid      = paidByCountry[bucket]?.size      ?? 0
      stats.revenue   = parseFloat(stats.revenue.toFixed(2))
    }

    const countries = Object.entries(byCountry)
      .map(([pais, s]) => ({
        pais,
        nome:           OFFER_NAMES[pais] ?? pais,
        started:        s.started,
        completed:      s.completed,
        paid:           s.paid,
        revenue:        s.revenue,
        conv_rate:      s.started > 0   ? parseFloat(((s.paid / s.started) * 100).toFixed(2))   : 0,
        completion_rate: s.started > 0  ? parseFloat(((s.completed / s.started) * 100).toFixed(1)) : 0,
        paid_per_completion: s.completed > 0 ? parseFloat(((s.paid / s.completed) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.started - a.started)

    // Consolidated USD value of a paid event (0 if the buyer's sub is excluded).
    const saleAmount = (e: Record<string, unknown>): number => {
      const uid = e.user_id as string | undefined
      return (uid && revenueByUser[uid] != null) ? revenueByUser[uid] : 0
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

    // ── Monthly trend — paid count + USD revenue (detox hidden) ───────────
    const months = getMonths(6)
    const monthlyTrend = months.map(m => {
      let paid = 0, revenue = 0
      for (const e of payEvents) {
        const d = new Date(e.created_at as string)
        if (d < m.start || d > m.end) continue
        paid++
        revenue += saleAmount(e)
      }
      return {
        label: m.label,
        // 'natglow' key kept for the existing chart series; all admin sales are /quiz now
        natglow: paid,
        revenue: parseFloat(revenue.toFixed(2)),
      }
    })

    // ── Recent window stats (this week / month) ───────────────────────────
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let weekNatglow = 0, monthNatglow = 0
    let weekNatglowRevenue = 0, monthNatglowRevenue = 0
    for (const e of payEvents) {
      const d = new Date(e.created_at as string)
      if (d >= weekStart)  { weekNatglow++;  weekNatglowRevenue  += saleAmount(e) }
      if (d >= monthStart) { monthNatglow++; monthNatglowRevenue += saleAmount(e) }
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
        weekNatglow, monthNatglow,
        weekNatglowRevenue: parseFloat(weekNatglowRevenue.toFixed(2)),
        monthNatglowRevenue: parseFloat(monthNatglowRevenue.toFixed(2)),
      },
      // Physical (IP-detected) location × age — for FB Ads targeting, NOT offer.
      countryAgeBreakdown,
      countryAgeIsPhysical: true,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
