// ═══════════════════════════════════════════════════════
// admin-geography — versão self-contained para Dashboard
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

function normLang(idioma: unknown): 'es' | 'en' {
  return String(idioma ?? '').startsWith('es') ? 'es' : 'en'
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

    const [startedEvents, completedEvents, payEvents] = await Promise.all([
      fetchEvents('event_type=eq.quiz_started&select=session_id,idioma,pais,created_at'),
      fetchEvents('event_type=eq.quiz_completed&select=session_id,idioma,created_at'),
      fetchEvents('event_type=eq.payment_completed&select=session_id,idioma,created_at'),
    ])

    const sessionLang: Record<string, 'es' | 'en'> = {}
    for (const e of startedEvents) {
      if (e.session_id) sessionLang[e.session_id as string] = normLang(e.idioma)
    }
    for (const e of completedEvents) {
      if (e.session_id && !sessionLang[e.session_id as string])
        sessionLang[e.session_id as string] = normLang(e.idioma)
    }
    for (const e of payEvents) {
      if (e.session_id && !sessionLang[e.session_id as string])
        sessionLang[e.session_id as string] = normLang(e.idioma)
    }

    const langStarts = { es: 0, en: 0 }
    for (const e of startedEvents) langStarts[normLang(e.idioma)]++

    const langConverts = { es: 0, en: 0 }
    for (const e of payEvents) {
      const lang = sessionLang[e.session_id as string] ?? normLang(e.idioma)
      langConverts[lang]++
    }

    const countryCounts: Record<string, number> = {}
    for (const e of startedEvents) {
      const pais = e.pais as string
      if (pais && pais !== 'XX' && pais !== 'T1')
        countryCounts[pais] = (countryCounts[pais] ?? 0) + 1
    }
    const topCountries = Object.entries(countryCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([pais, count]) => ({ pais, nome: COUNTRY_NAMES[pais] ?? pais, count }))

    const months = getMonths(6)
    const monthlyTrend = months.map(m => {
      let es = 0, en = 0
      for (const e of payEvents) {
        const d = new Date(e.created_at as string)
        if (d >= m.start && d <= m.end) {
          const lang = sessionLang[e.session_id as string] ?? normLang(e.idioma)
          if (lang === 'es') es++; else en++
        }
      }
      return { label: m.label, es, en }
    })

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let weekEs = 0, weekEn = 0, monthEs = 0, monthEn = 0
    for (const e of payEvents) {
      const d = new Date(e.created_at as string)
      const lang = sessionLang[e.session_id as string] ?? normLang(e.idioma)
      if (d >= weekStart) { if (lang === 'es') weekEs++; else weekEn++ }
      if (d >= monthStart) { if (lang === 'es') monthEs++; else monthEn++ }
    }

    return new Response(JSON.stringify({
      langStarts, langConverts, topCountries, monthlyTrend,
      weekEs, weekEn, monthEs, monthEn,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
