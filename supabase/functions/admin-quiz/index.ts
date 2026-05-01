import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const dbHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
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
  if (a.chemProducts === 'yes_heavy') score += 3
  else if (a.chemProducts === 'yes_mild') score += 2
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

const QUESTION_FIELDS = ['washFreq', 'waterTemp', 'heatTools', 'hydration', 'chemProducts', 'hairType', 'age'] as const

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

    const [quizEvents, payEvents, startedEvents] = await Promise.all([
      fetchEvents('event_type=eq.quiz_completed&select=session_id,idioma,metadata,created_at'),
      fetchEvents('event_type=eq.payment_completed&select=session_id,created_at'),
      fetchEvents('event_type=eq.quiz_started&select=session_id'),
    ])

    const convertedSessions = new Set(payEvents.map(e => e.session_id as string))
    const startedCount = new Set(startedEvents.map(e => e.session_id as string)).size

    // Distributions per question
    const dist: Record<string, Record<string, number>> = {}
    for (const f of QUESTION_FIELDS) dist[f] = {}

    const diagDist: Record<DiagColor, number> = { red: 0, amber: 0, green: 0 }

    const diagConversion: Record<DiagColor, { total: number; converted: number; rate: number }> = {
      red:   { total: 0, converted: 0, rate: 0 },
      amber: { total: 0, converted: 0, rate: 0 },
      green: { total: 0, converted: 0, rate: 0 },
    }

    // Converted vs abandoned per question (only the 5 main questions)
    const mainFields = ['washFreq', 'waterTemp', 'heatTools', 'hydration', 'chemProducts'] as const
    const convertedAnswers: Record<string, Record<string, number>> = {}
    const abandonedAnswers: Record<string, Record<string, number>> = {}
    for (const f of mainFields) { convertedAnswers[f] = {}; abandonedAnswers[f] = {} }

    for (const e of quizEvents) {
      // metadata shape can be { answers: {...} } or directly the answers object
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
    }

    for (const key of Object.keys(diagConversion) as DiagColor[]) {
      const d = diagConversion[key]
      d.rate = d.total > 0 ? parseFloat(((d.converted / d.total) * 100).toFixed(1)) : 0
    }

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
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
