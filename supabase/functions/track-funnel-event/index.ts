import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { event_type, session_id, idioma, metadata, user_id, pricing_plan } = body

    if (!event_type || !session_id) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Country from Cloudflare header (available on Deno Deploy / Supabase Edge)
    const pais = req.headers.get('CF-IPCountry') ?? req.headers.get('x-country') ?? null

    await fetch(`${SUPABASE_URL}/rest/v1/funnel_events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type,
        session_id,
        user_id: user_id ?? null,
        idioma: idioma ?? null,
        pais,
        metadata: metadata ?? null,
        pricing_plan: pricing_plan ?? null,
      }),
    })
  } catch {
    // silently succeed — tracking is non-critical
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
