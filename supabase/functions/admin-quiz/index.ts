import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const dbHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

// Build PostgREST plan filter fragment (appended to query string)
function planFilter(plan: string | null): string {
  if (!plan || plan === 'all') return ''
  if (plan === 'one_time_standard') {
    // Old events with null pricing_plan are treated as one_time_standard
    return '&or=(pricing_plan.eq.one_time_standard,pricing_plan.is.null)'
  }
  return `&pricing_plan=eq.${encodeURIComponent(plan)}`
}

async function fetchEvents(filter: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/funnel_events?${filter}&limit=10000`,
    { headers: dbHeaders }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

type DiagColor = 'red' | 'amber' | 'green'

function computeDiagnosis(a: Record<string, string>): DiagColor {
  let score = 0
  // 'frecuente'/'aveces' are natglow's chemProducts vocabulary (yes_heavy/
  // yes_mild are bold/detox's). natglow has no hydration question at all —
  // that scoring component (max +3) simply never contributes for it, which
  // structurally skews its distribution slightly greener than bold/detox.
  // This is accepted (there's no real signal to substitute), not a bug to fix.
  if (a.chemProducts === 'yes_heavy' || a.chemProducts === 'frecuente') score += 3
  else if (a.chemProducts === 'yes_mild' || a.chemProducts === 'aveces') score += 2
  if (a.waterTemp === 'hot') score += 2
  else if (a.waterTemp === 'warm') score += 1
  if (a.heatTools === 'daily') score += 3
  else if (a.heatTools === 'few') score += 2
  if (a.hydration === 'never') score += 3
  else if (a.hydration === 'sometimes') score += 2
  if (a.washFreq === 'daily') score += 2
  else if (a.washFreq === '3_4') score += 1
  if (score >= 8) return 'red'
  if (score >= 4) return 'amber'
  return 'green'
}

// Includes legacy quiz fields, persuasive-funnel fields (symptomsIntensity /
// finalChoice), and natglow-only fields (hairGoal, timeAvailable). Admin UI
// renders cards for all of these, so the distribution counter must populate
// every key.
const QUESTION_FIELDS = [
  'washFreq', 'waterTemp', 'heatTools', 'hydration', 'chemProducts',
  'hairType', 'age',
  'symptomsIntensity', 'finalChoice',
  'hairGoal', 'timeAvailable',
] as const

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

    const url    = new URL(req.url)
    const plan   = url.searchParams.get('plan') ?? 'all'  // 'all' | plan_key
    const funnel = url.searchParams.get('funnel') ?? 'all'  // 'all' | 'natglow' | 'detox'
    const pf     = planFilter(plan)

    // Map funnel to event types. Persuasive funnels fire
    // quiz_natglow_started/quiz_detox_started instead of the legacy quiz_started.
    // Legacy 'quiz_started'/'quiz_completed' are kept for historical data.
    const startedEventTypes =
      funnel === 'natglow' ? ['quiz_natglow_started'] :
      funnel === 'detox'   ? ['quiz_detox_started'] :
      ['quiz_started', 'quiz_natglow_started', 'quiz_detox_started']

    const completedEventTypes =
      funnel === 'natglow' ? ['quiz_natglow_completed'] :
      funnel === 'detox'   ? ['quiz_detox_completed'] :
      ['quiz_completed', 'quiz_natglow_completed', 'quiz_detox_completed']

    const inOp = (types: string[]) => `in.(${types.map(encodeURIComponent).join(',')})`

    const [quizEvents, payEvents, startedEvents] = await Promise.all([
      fetchEvents(`event_type=${inOp(completedEventTypes)}&select=session_id,idioma,metadata,created_at${pf}`),
      fetchEvents(`event_type=eq.payment_completed&select=session_id,created_at${pf}`),
      fetchEvents(`event_type=${inOp(startedEventTypes)}&select=session_id,idioma,pais${pf}`),
    ])

    const convertedSessions = new Set(payEvents.map(e => e.session_id as string))
    const startedCount = new Set(startedEvents.map(e => e.session_id as string)).size

    // ── Per-question distributions ────────────────────────────────────────
    const dist: Record<string, Record<string, number>> = {}
    for (const f of QUESTION_FIELDS) dist[f] = {}

    const diagDist: Record<DiagColor, number> = { red: 0, amber: 0, green: 0 }
    const diagConversion: Record<DiagColor, { total: number; converted: number; rate: number }> = {
      red:   { total: 0, converted: 0, rate: 0 },
      amber: { total: 0, converted: 0, rate: 0 },
      green: { total: 0, converted: 0, rate: 0 },
    }

    // mainFields are the dimensions we cut Converted vs Abandoned by.
    // Adding age + hairType lets the admin see which demographics convert
    // best, not just which habits correlate with conversion.
    const mainFields = ['age', 'hairType', 'washFreq', 'waterTemp', 'heatTools', 'hydration', 'chemProducts'] as const
    const convertedAnswers: Record<string, Record<string, number>> = {}
    const abandonedAnswers: Record<string, Record<string, number>> = {}
    for (const f of mainFields) { convertedAnswers[f] = {}; abandonedAnswers[f] = {} }

    // Per-age cross-tabulation: for each age bucket, distribution of the
    // other quiz answers + conversion rate. Powers the 'Análise por faixa
    // etária' section in the admin — lets the user see *what problems* each
    // age group has and which age converts best, so ad targeting + creative
    // copy can be tailored per cohort.
    const ageBreakdown: Record<string, {
      started: number
      converted: number
      hairType: Record<string, number>
      symptomsIntensity: Record<string, number>
      heatTools: Record<string, number>
      chemProducts: Record<string, number>
      hydration: Record<string, number>
      finalChoice: Record<string, number>
    }> = {}
    const ensureAgeBucket = (k: string) => {
      if (!ageBreakdown[k]) {
        ageBreakdown[k] = {
          started: 0, converted: 0,
          hairType: {}, symptomsIntensity: {}, heatTools: {},
          chemProducts: {}, hydration: {}, finalChoice: {},
        }
      }
      return ageBreakdown[k]
    }
    const crossFields = ['hairType', 'symptomsIntensity', 'heatTools', 'chemProducts', 'hydration', 'finalChoice'] as const

    for (const e of quizEvents) {
      const raw = e.metadata as Record<string, unknown> | null
      const answers = (raw?.answers ?? raw ?? {}) as Record<string, string>
      if (!answers || typeof answers !== 'object') continue

      const isConverted = convertedSessions.has(e.session_id as string)
      const diag = computeDiagnosis(answers)
      diagDist[diag]++
      diagConversion[diag].total++
      if (isConverted) diagConversion[diag].converted++

      for (const field of QUESTION_FIELDS) {
        const val = answers[field]
        if (!val) continue
        dist[field][val] = (dist[field][val] ?? 0) + 1
      }
      for (const field of mainFields) {
        const val = answers[field]
        if (!val) continue
        const bucket = isConverted ? convertedAnswers : abandonedAnswers
        bucket[field][val] = (bucket[field][val] ?? 0) + 1
      }

      // Cross-tab by age
      const ageVal = answers.age
      if (ageVal) {
        const ageStats = ensureAgeBucket(ageVal)
        ageStats.started++
        if (isConverted) ageStats.converted++
        for (const cf of crossFields) {
          const v = answers[cf]
          if (!v) continue
          ageStats[cf][v] = (ageStats[cf][v] ?? 0) + 1
        }
      }
    }

    // Compute per-age conversion rate (used by frontend for sorting / display)
    const ageBreakdownWithRates: Record<string, typeof ageBreakdown[string] & { conv_rate: number }> = {}
    for (const [age, stats] of Object.entries(ageBreakdown)) {
      ageBreakdownWithRates[age] = {
        ...stats,
        conv_rate: stats.started > 0
          ? parseFloat(((stats.converted / stats.started) * 100).toFixed(1))
          : 0,
      }
    }

    for (const key of Object.keys(diagConversion) as DiagColor[]) {
      const d = diagConversion[key]
      d.rate = d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : 0
    }

    // ── Language distribution (from quiz_started) ─────────────────────────
    const langDist: Record<string, number> = {}
    for (const ev of startedEvents) {
      const lang = (ev.idioma as string | null) ?? 'unknown'
      langDist[lang] = (langDist[lang] ?? 0) + 1
    }

    // ── Country distribution — top 10 (from quiz_started) ─────────────────
    const countryCounts: Record<string, number> = {}
    for (const ev of startedEvents) {
      const country = ev.pais as string | null
      if (!country || country === 'XX' || country === 'T1') continue
      countryCounts[country] = (countryCounts[country] ?? 0) + 1
    }
    const countryDist = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    const completionRate = startedCount > 0
      ? parseFloat(((quizEvents.length / startedCount) * 100).toFixed(1))
      : 0

    return new Response(JSON.stringify({
      totalCompleted: quizEvents.length,
      totalStarted: startedCount,
      completionRate,
      dist,
      diagDist,
      diagConversion,
      convertedAnswers,
      abandonedAnswers,
      langDist,
      countryDist,
      ageBreakdown: ageBreakdownWithRates,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
