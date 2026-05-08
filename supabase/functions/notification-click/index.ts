import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return json({ ok: false, error: 'id obrigatório' }, 400)

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_notification_clicks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ row_id: id }),
    })

    if (!rpcRes.ok) {
      const err = await rpcRes.text()
      return json({ ok: false, error: err }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
