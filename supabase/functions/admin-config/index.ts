import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

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
    // ── GET: return all config as key:value object ──
    if (req.method === 'GET') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_config?select=chave,valor`,
        { headers: dbHeaders }
      )
      const rows = await res.json()
      const config: Record<string, string> = { ...DEFAULTS }
      if (Array.isArray(rows)) {
        for (const row of rows) {
          config[row.chave] = row.valor ?? ''
        }
      }
      return new Response(JSON.stringify(config), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── POST/PATCH: upsert a single key ──
    if (isWrite) {
      const body = await req.json()
      const { chave, valor } = body as { chave: string; valor: string }
      if (!chave) {
        return new Response(JSON.stringify({ error: 'chave obrigatória' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      // Try PATCH first
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_config?chave=eq.${encodeURIComponent(chave)}`,
        {
          method: 'PATCH',
          headers: { ...dbHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({ valor, atualizado_em: new Date().toISOString() }),
        }
      )
      const patched = await patchRes.json()

      // If no row was updated, insert
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
