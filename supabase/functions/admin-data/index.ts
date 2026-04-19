const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getUser(authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
  })
  if (!res.ok) return null
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const user = await getUser(req.headers.get('Authorization') ?? '')
    if (!user?.email || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const [subsRes, usersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      }),
      fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      }),
    ])

    const subscriptions = await subsRes.json()
    const usersData = await usersRes.json()

    return new Response(JSON.stringify({
      subscriptions,
      totalUsers: usersData.users?.length ?? 0,
      activeCount: subscriptions.filter((s: { status: string }) => s.status === 'active').length,
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
