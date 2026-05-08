import { verifyAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const authHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey:        SUPABASE_SERVICE_KEY,
}
const dbHeaders = {
  ...authHeaders,
  'Content-Type': 'application/json',
  Prefer:         'return=minimal',
}

// Lazy-loaded — same pattern as the D0 test (npm:web-push confirmed working)
let _webpush: any = null
async function getWebpush() {
  if (!_webpush) {
    // @ts-ignore — Deno npm: specifier
    _webpush = (await import('npm:web-push@3')).default
    _webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@natglow.app',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )
  }
  return _webpush
}

interface SendInput {
  user_ids:   string[]
  title_en:   string
  title_es:   string
  body_en:    string
  body_es:    string
  url?:       string
  icon_url?:  string
  channels:   string[]   // ['inapp'] | ['push'] | ['inapp','push']
  history_id?: string
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
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

    const input: SendInput = await req.json()
    const { user_ids, title_en, title_es, body_en, body_es, url: notifUrl, icon_url, channels, history_id } = input

    if (!user_ids?.length)    return json({ error: 'user_ids obrigatório' }, 400)
    if (!title_en || !body_en) return json({ error: 'title_en e body_en obrigatórios' }, 400)
    if (!channels?.length)    return json({ error: 'channels obrigatório' }, 400)

    let sent    = 0
    let failed  = 0
    let deleted = 0

    // ── In-app notifications ──────────────────────────────
    if (channels.includes('inapp')) {
      const rows = user_ids.map(uid => ({
        user_id:       uid,
        title_en,
        title_es,
        body_en,
        body_es,
        url:           notifUrl   ?? null,
        icon_url:      icon_url   ?? null,
        type:          'manual',
        sent_via_push: channels.includes('push'),
      }))

      const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method:  'POST',
        headers: dbHeaders,
        body:    JSON.stringify(rows),
      })
      if (res.ok) sent += user_ids.length
      else        failed += user_ids.length
    }

    // ── Push notifications ────────────────────────────────
    if (channels.includes('push')) {
      const webpush = await getWebpush()

      // Fetch subscriptions for these users (up to 500 at a time)
      const batch     = user_ids.slice(0, 500)
      const idsParam  = batch.join(',')
      const subsRes   = await fetch(
        `${SUPABASE_URL}/rest/v1/notification_subscriptions?select=id,user_id,endpoint,keys&user_id=in.(${idsParam})`,
        { headers: authHeaders },
      )
      const subs: Array<{ id: string; user_id: string; endpoint: string; keys: { p256dh: string; auth: string } }> =
        await subsRes.json()

      const staleIds: string[] = []

      await Promise.all(
        subs.map(async (sub) => {
          const payload = JSON.stringify({
            title:      title_en,
            body:       body_en,
            icon:       icon_url ?? '/pwa-192x192.png',
            url:        notifUrl ?? '/HairDashboard',
            history_id: history_id ?? null,
          })
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
            sent++
          } catch (err: any) {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              staleIds.push(sub.id)
              deleted++
            } else {
              failed++
            }
          }
        }),
      )

      // Clean up stale (unsubscribed) endpoints
      if (staleIds.length) {
        const staleParam = staleIds.join(',')
        await fetch(
          `${SUPABASE_URL}/rest/v1/notification_subscriptions?id=in.(${staleParam})`,
          { method: 'DELETE', headers: dbHeaders },
        )
      }
    }

    return json({ sent, failed, deleted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
