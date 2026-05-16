import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL     = Deno.env.get('SITE_URL') ?? 'https://app.natglow.app'

async function db(path: string, opts?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  let diff = ab.length ^ bb.length
  const len = Math.min(ab.length, bb.length)
  for (let i = 0; i < len; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  try {
    const body  = await req.json()
    const email = (body.email ?? '').trim().toLowerCase()
    const code  = (body.code  ?? '').trim()

    if (!email || !/^\d{6}$/.test(code)) {
      return json({ error: 'invalid_input' }, 400)
    }

    // Fetch most recent valid code for this email
    const res  = await db(
      `auth_codes?email=eq.${encodeURIComponent(email)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=1`,
    )
    const rows = await res.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return json({ error: 'invalid_or_expired' }, 401)
    }

    const row = rows[0]

    if (row.attempts >= 5) {
      return json({ error: 'too_many_attempts' }, 429)
    }

    const match = timingSafeEqual(code, row.code)

    if (!match) {
      await db(`auth_codes?id=eq.${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ attempts: row.attempts + 1 }),
      })
      const remaining = Math.max(0, 4 - row.attempts)
      return json({ error: 'invalid_code', attempts_remaining: remaining }, 401)
    }

    // Mark code as used
    await db(`auth_codes?id=eq.${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    })

    // Ensure user exists in Supabase Auth
    const listRes  = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1&email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } },
    )
    const listData = await listRes.json()
    const existing = (listData?.users ?? []).find(
      (u: { email: string }) => u.email?.toLowerCase() === email,
    )

    if (!existing) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, email_confirm: true }),
      })
    }

    // Generate magic link (backend-only — never sent to user here)
    const linkRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email,
        options: { redirect_to: `${SITE_URL}/HairDashboard` },
      }),
    })
    const linkData = await linkRes.json()

    if (!linkData?.hashed_token) {
      return json({ error: 'token_generation_failed' }, 500)
    }

    // Verify the token server-side to get session (keeps tokens out of frontend URL)
    const verifyRes  = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'magiclink', token_hash: linkData.hashed_token }),
    })
    const sessionData = await verifyRes.json()

    if (!sessionData?.access_token) {
      return json({ error: 'session_creation_failed' }, 500)
    }

    return json({
      access_token:  sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'internal_error' }, 500)
  }
})
