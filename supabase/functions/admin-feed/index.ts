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

      // Create a feed post from admin (auto-approved).
      // Two modes:
      //  - NatGlow official: is_admin=true (shows admin badge "NatGlow")
      //  - Fake user testimonial: is_admin=false + author_name + author_avatar_url
      //    + feeling. Renders identical to a real user post.
      if (mode === 'post') {
        const {
          content,
          image_url,
          image_url_2,
          author_name,
          author_avatar_url,
          feeling,
          is_admin,  // defaults to true (NatGlow official)
        } = body
        if (!content?.trim()) return json({ error: 'content obrigatório' }, 400)

        const isAdmin = is_admin !== false  // default true
        if (!isAdmin && !author_name?.trim()) {
          return json({ error: 'author_name é obrigatório no modo Usuária' }, 400)
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_posts`, {
          method:  'POST',
          headers: dbHeaders,
          body:    JSON.stringify({
            content:           content.trim(),
            image_url:         image_url ?? null,
            image_url_2:       image_url_2 ?? null,
            is_admin:          isAdmin,
            status:            'approved',
            approved_at:       new Date().toISOString(),
            author_name:       isAdmin ? null : author_name.trim(),
            author_avatar_url: isAdmin ? null : (author_avatar_url ?? null),
            feeling:           feeling ?? null,
            user_id:           null,  // admin-created posts aren't tied to a real user
          }),
        })
        const created = await res.json()
        return json({ ok: true, post: Array.isArray(created) ? created[0] : created })
      }

      // Add a fake comment as admin (any author name + avatar)
      if (mode === 'add_comment') {
        const { post_id, author_name, author_avatar_url, content, parent_id } = body
        if (!post_id || !content?.trim() || !author_name?.trim()) {
          return json({ error: 'post_id, author_name e content são obrigatórios' }, 400)
        }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_comments`, {
          method:  'POST',
          headers: dbHeaders,
          body:    JSON.stringify({
            post_id,
            user_id:           null,
            parent_id:         parent_id ?? null,
            content:           content.trim().slice(0, 500),
            author_name:       author_name.trim(),
            author_avatar_url: author_avatar_url ?? null,
          }),
        })
        const created = await res.json()
        return json({ ok: true, comment: Array.isArray(created) ? created[0] : created })
      }

      // Delete a comment by id (admin moderation of fakes or real comments)
      if (mode === 'delete_comment') {
        const { id } = body
        if (!id) return json({ error: 'id obrigatório' }, 400)
        await fetch(`${SUPABASE_URL}/rest/v1/feed_comments?id=eq.${id}`, {
          method: 'DELETE', headers: dbHeaders,
        })
        return json({ ok: true })
      }

      // Set absolute reaction counts on a post — directly patches the JSONB.
      // Doesn't insert into feed_reactions (those need real user_ids and a
      // composite PK; the frontend reads the JSONB counter for display).
      if (mode === 'set_reactions') {
        const { post_id, reactions } = body
        if (!post_id || !reactions) {
          return json({ error: 'post_id e reactions são obrigatórios' }, 400)
        }
        const sanitized = {
          heart: Math.max(0, parseInt(reactions.heart) || 0),
          love:  Math.max(0, parseInt(reactions.love)  || 0),
          clap:  Math.max(0, parseInt(reactions.clap)  || 0),
          wow:   Math.max(0, parseInt(reactions.wow)   || 0),
        }
        await fetch(`${SUPABASE_URL}/rest/v1/feed_posts?id=eq.${post_id}`, {
          method:  'PATCH',
          headers: dbHeaders,
          body:    JSON.stringify({ reactions: sanitized }),
        })
        return json({ ok: true, reactions: sanitized })
      }

      // Delete any post (admin moderation) — also removes images from Storage
      if (mode === 'delete') {
        const { id } = body
        if (!id) return json({ error: 'id obrigatório' }, 400)

        // Fetch image URLs before deleting the row
        const rows = await supabaseGet(`feed_posts?id=eq.${id}&select=image_url,image_url_2`)
        const post  = rows[0]
        const storagePaths: string[] = []
        for (const field of ['image_url', 'image_url_2'] as const) {
          const url = post?.[field]
          if (url) {
            const part = url.split('/feed-images/')
            if (part[1]) storagePaths.push(part[1])
          }
        }

        // Delete images from Storage
        if (storagePaths.length > 0) {
          await fetch(`${SUPABASE_URL}/storage/v1/object/feed-images`, {
            method: 'DELETE',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefixes: storagePaths }),
          })
        }

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

    // Get all comments for a specific post (admin engagement view)
    if (mode === 'get_comments') {
      const post_id = url.searchParams.get('post_id')
      if (!post_id) return json({ error: 'post_id obrigatório' }, 400)
      const comments = await supabaseGet(
        `feed_comments?post_id=eq.${post_id}&order=created_at.asc&select=*`
      )
      return json({ comments })
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
