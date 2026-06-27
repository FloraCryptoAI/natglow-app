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

    // Country detection: prefer CF-IPCountry header (server-side IP geo, most
    // accurate). Fall back to body.pais (browser timezone-derived) when the
    // header isn't forwarded — without this fallback the Geografia admin tab
    // stays at 0 countries because Supabase Edge doesn't always pass through
    // the CF header.
    const headerPais     = req.headers.get('CF-IPCountry') ?? req.headers.get('x-country')
    const cleanHeader    = headerPais && headerPais !== 'XX' && headerPais !== 'T1' ? headerPais : null
    const fallbackPais   = typeof body.pais === 'string' ? body.pais : null
    const pais           = cleanHeader ?? fallbackPais ?? null

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
