import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

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

    const { stripe_subscription_id } = await req.json()
    if (!stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'stripe_subscription_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Cancel at period end (not immediate) — prevents accidental immediate termination
    const cancelRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${STRIPE_KEY}` },
      }
    )
    const canceled = await cancelRes.json()
    if (canceled.error) throw new Error(canceled.error.message)

    // Reflect cancellation in Supabase
    await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${stripe_subscription_id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'canceled' }),
      }
    )

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
