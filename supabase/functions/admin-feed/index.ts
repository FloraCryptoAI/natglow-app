import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const authHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey:        SUPABASE_SERVICE_KEY,
}
const dbHeaders = {
  ...authHeaders,
  'Content-Type': 'application/json',
  Prefer:         'return=representation',
}

async function supabaseGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: authHeaders })
  const d   = await res.json()
  return Array.isArray(d) ? d : []
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const token = req.headers.get('x-admin-token') ?? ''
    if (!(await verifyAdminJWT(token))) return json({ error: 'Não autorizado' }, 401)

    const url  = new URL(req.url)
    const mode = url.searchParams.get('mode') ?? ''

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()

      // Approve a pending post
      if (mode === 'approve') {
        const { id } = body
        if (!id) return json({ error: 'id obrigatório' }, 400)
        const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_posts?id=eq.${id}`, {
          method:  'PATCH',
          headers: dbHeaders,
          body:    JSON.stringify({ status: 'approved', approved_at: new Date().toISOString() }),
        })
        const updated = await res.json()
        return json({ ok: true, post: Array.isArray(updated) ? updated[0] : updated })
      }

      // Reject a pending post
      if (mode === 'reject') {
        const { id, reason } = body
        if (!id) return json({ error: 'id obrigatório' }, 400)
        const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_posts?id=eq.${id}`, {
          method:  'PATCH',
          headers: dbHeaders,
          body:    JSON.stringify({ status: 'rejected', rejection_reason: reason ?? null }),
        })
        const updated = await res.json()
        return json({ ok: true, post: Array.isArray(updated) ? updated[0] : updated })
      }

      // Create an admin post (auto-approved)
      if (mode === 'post') {
        const { content, image_url } = body
        if (!content?.trim()) return json({ error: 'content obrigatório' }, 400)
        const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_posts`, {
          method:  'POST',
          headers: dbHeaders,
          body:    JSON.stringify({
            content:     content.trim(),
            image_url:   image_url ?? null,
            is_admin:    true,
            status:      'approved',
            approved_at: new Date().toISOString(),
          }),
        })
        const created = await res.json()
        return json({ ok: true, post: Array.isArray(created) ? created[0] : created })
      }

      // Delete any post (admin moderation)
      if (mode === 'delete') {
        const { id } = body
        if (!id) return json({ error: 'id obrigatório' }, 400)
        await fetch(`${SUPABASE_URL}/rest/v1/feed_posts?id=eq.${id}`, {
          method: 'DELETE', headers: dbHeaders,
        })
        return json({ ok: true })
      }

      return json({ error: 'mode inválido para POST' }, 400)
    }

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors })

    // Moderation queue: pending posts with display_name
    if (mode === 'queue') {
      const posts = await supabaseGet(
        'feed_posts?status=eq.pending&order=created_at.asc&select=*'
      )
      // Enrich with display_name from subscriptions
      const userIds = [...new Set(posts.filter(p => p.user_id).map(p => p.user_id as string))]
      let nameMap: Record<string, string> = {}
      if (userIds.length) {
        const subs = await supabaseGet(
          `subscriptions?user_id=in.(${userIds.join(',')})&select=user_id,display_name`
        )
        nameMap = Object.fromEntries(subs.map(s => [s.user_id, s.display_name ?? 'Usuária']))
      }
      const enriched = posts.map(p => ({ ...p, display_name: nameMap[p.user_id] ?? 'Usuária' }))
      return json({ posts: enriched })
    }

    // All posts paginated (any status)
    if (mode === 'list') {
      const page     = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
      const pageSize = 20
      const offset   = (page - 1) * pageSize

      const [postsRes, countRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/feed_posts?order=created_at.desc&limit=${pageSize}&offset=${offset}&select=*`,
          { headers: authHeaders },
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/feed_posts?select=id`,
          { headers: { ...authHeaders, Prefer: 'count=exact' } },
        ),
      ])
      const posts = await postsRes.json()
      const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] ?? '0')
      return json({ posts: Array.isArray(posts) ? posts : [], total, page, pageSize })
    }

    return new Response('Bad request', { status: 400, headers: cors })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
