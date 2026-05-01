// ═══════════════════════════════════════════════════════
// admin-config — versão self-contained para Dashboard
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
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const DEFAULTS: Record<string, string> = {
  displayed_price: '6.99',
  crossed_price: '$47.99',
  promo_badge: 'Oferta Especial de Lançamento',
  timer_enabled: 'true',
  timer_minutes: '15',
  maintenance_mode: 'false',
  maintenance_text: 'Estamos em manutenção. Voltamos em breve! 🌿',
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const isWrite = req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT'

  if (isWrite) {
    const token = req.headers.get('x-admin-token') ?? ''
    if (!(await verifyAdminJWT(token))) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    // ── GET: retorna todas as configs ──
    if (req.method === 'GET') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_config?select=chave,valor`,
        { headers: dbHeaders }
      )
      const rows = await res.json()
      const config: Record<string, string> = { ...DEFAULTS }
      if (Array.isArray(rows)) {
        for (const row of rows) config[row.chave] = row.valor ?? ''
      }
      return new Response(JSON.stringify(config), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── POST/PATCH: upsert de uma chave ──
    if (isWrite) {
      const body = await req.json()
      const { chave, valor } = body as { chave: string; valor: string }
      if (!chave) {
        return new Response(JSON.stringify({ error: 'chave obrigatória' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_config?chave=eq.${encodeURIComponent(chave)}`,
        {
          method: 'PATCH',
          headers: { ...dbHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({ valor, atualizado_em: new Date().toISOString() }),
        }
      )
      const patched = await patchRes.json()

      if (!Array.isArray(patched) || patched.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/admin_config`, {
          method: 'POST',
          headers: dbHeaders,
          body: JSON.stringify({ chave, valor, atualizado_em: new Date().toISOString() }),
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405, headers: cors })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
