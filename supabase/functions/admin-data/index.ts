import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const token = req.headers.get('x-admin-token') ?? ''
    const payload = await verifyAdminJWT(token)

    if (!payload) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const monthStartUnix = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000
    )

    const [subsRes, usersRes, eventsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc&limit=1000`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }),
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }),
      fetch(
        `https://api.stripe.com/v1/events?type=customer.subscription.deleted&created[gte]=${monthStartUnix}&limit=100`,
        { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
      ),
    ])

    const subscriptions = await subsRes.json()
    const usersData = await usersRes.json()
    const eventsData = await eventsRes.json()

    const activeCount = subscriptions.filter((s: { status: string }) => s.status === 'active').length
    const canceledCount = subscriptions.filter((s: { status: string }) => s.status === 'canceled').length
    const pastDueCount = subscriptions.filter((s: { status: string }) => s.status === 'past_due').length
    const canceledThisMonth: number = eventsData.data?.length ?? 0

    return new Response(
      JSON.stringify({
        subscriptions,
        totalUsers: usersData.users?.length ?? 0,
        activeCount,
        canceledCount,
        pastDueCount,
        canceledThisMonth,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
