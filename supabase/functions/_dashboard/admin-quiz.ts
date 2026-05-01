// ═══════════════════════════════════════════════════════
// admin-quiz — versão self-contained para Dashboard
// Cole este arquivo inteiro no Supabase Dashboard
// ═══════════════════════════════════════════════════════

// ── shared: cors ──────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://app.natglow.app',
  'https://natglow.app',
  'http://localhost:5173',
  'http://localhost:3000',
]
function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
    'Vary': 'Origin',
  }
}

// ── shared: admin-jwt ─────────────────────────────────
const ADMIN_JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET')!

function b64urlDecode(b64url: string): string {
  const pad = b64url.length % 4
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
  return atob(b64)
}

async function verifyAdminJWT(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [header, body, sig] = parts
    const data = `${header}.${body}`
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(ADMIN_JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(b64urlDecode(sig), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return false
    const payload = JSON.parse(b64urlDecode(body))
    if (payload.role !== 'admin') return false
    if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return false
    return true
  } catch { return false }
}

// ── function body ─────────────────────────────────────
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
const MAIN_FIELDS = ['washFreq', 'waterTemp', 'heatTools', 'hydration', 'chemProducts'] as const

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

    const dist: Record<string, Record<string, number>> = {}
    for (const f of QUESTION_FIELDS) dist[f] = {}

    const diagDist: Record<DiagColor, number> = { red: 0, amber: 0, green: 0 }
    const diagConversion: Record<DiagColor, { total: number; converted: number; rate: number }> = {
      red:   { total: 0, converted: 0, rate: 0 },
      amber: { total: 0, converted: 0, rate: 0 },
      green: { total: 0, converted: 0, rate: 0 },
    }

    const convertedAnswers: Record<string, Record<string, number>> = {}
    const abandonedAnswers: Record<string, Record<string, number>> = {}
    for (const f of MAIN_FIELDS) { convertedAnswers[f] = {}; abandonedAnswers[f] = {} }

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
      for (const field of MAIN_FIELDS) {
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
