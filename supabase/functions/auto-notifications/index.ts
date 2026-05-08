import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET          = Deno.env.get('CRON_SECRET') ?? ''

const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@natglow.app'
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

const authHeaders = {
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey:        SUPABASE_SERVICE_KEY,
}
const dbHeaders = {
  ...authHeaders,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
}

let _webpush: any = null
async function getWebpush() {
  if (!_webpush) {
    // @ts-ignore
    _webpush = (await import('npm:web-push@3')).default
    _webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  }
  return _webpush
}

interface Template {
  id: string
  type: string
  enabled: boolean
  title_en: string
  title_es: string
  body_en: string
  body_es: string
  url: string
  icon_url: string | null
  interval_days: number
}

interface EligibleUser {
  user_id: string
  lang: string
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  // Accepts both Vercel cron secret and admin-called manual trigger
  const cronSecret = req.headers.get('x-cron-secret') ?? ''
  const adminToken = req.headers.get('x-admin-token') ?? ''

  if (cronSecret !== CRON_SECRET && !adminToken) {
    return json({ error: 'Não autorizado' }, 401)
  }

  // If called by admin, verify admin JWT
  if (!cronSecret || cronSecret !== CRON_SECRET) {
    const { verifyAdminJWT } = await import('../_shared/admin-jwt.ts')
    if (!(await verifyAdminJWT(adminToken))) {
      return json({ error: 'Não autorizado' }, 401)
    }
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    // Optional: force a specific type for manual trigger/testing
    const forceType: string | null = body.type ?? null

    // Fetch enabled templates
    const templatesUrl = forceType
      ? `${SUPABASE_URL}/rest/v1/notification_templates?type=eq.${encodeURIComponent(forceType)}&enabled=eq.true`
      : `${SUPABASE_URL}/rest/v1/notification_templates?enabled=eq.true`
    const templatesRes = await fetch(templatesUrl, { headers: authHeaders })
    const templates: Template[] = await templatesRes.json()

    if (!templates.length) return json({ message: 'No enabled templates', sent: 0 })

    const webpush = await getWebpush()
    const results: Record<string, { sent: number; failed: number; deleted: number }> = {}

    for (const tmpl of templates) {
      // Get eligible user_ids via RPC
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_auto_notif_users`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_type: tmpl.type, p_interval_days: tmpl.interval_days }),
      })
      const users: EligibleUser[] = await rpcRes.json()

      if (!users.length) {
        results[tmpl.type] = { sent: 0, failed: 0, deleted: 0 }
        continue
      }

      const userIds = users.map(u => u.user_id)
      const langMap = Object.fromEntries(users.map(u => [u.user_id, u.lang]))

      // Insert notification_history record
      const histRes = await fetch(`${SUPABASE_URL}/rest/v1/notification_history`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          title_en:     tmpl.title_en,
          title_es:     tmpl.title_es,
          body_en:      tmpl.body_en,
          body_es:      tmpl.body_es,
          url:          tmpl.url,
          channels:     ['push'],
          segmentation: { type: 'auto', template: tmpl.type },
          total_sent:   0,
        }),
      })
      const [histRecord] = await histRes.json()
      const historyId: string = histRecord?.id ?? null

      // Fetch push subscriptions for these users
      const idsParam = userIds.slice(0, 500).join(',')
      const subsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/notification_subscriptions?select=id,user_id,endpoint,keys&user_id=in.(${idsParam})`,
        { headers: authHeaders },
      )
      const subs: Array<{ id: string; user_id: string; endpoint: string; keys: { p256dh: string; auth: string } }> =
        await subsRes.json()

      let sent = 0, failed = 0, deleted = 0
      const staleIds: string[] = []

      await Promise.all(
        subs.map(async (sub) => {
          const lang = langMap[sub.user_id] ?? 'en'
          const payload = JSON.stringify({
            title:      lang === 'es' ? tmpl.title_es : tmpl.title_en,
            body:       lang === 'es' ? tmpl.body_es  : tmpl.body_en,
            icon:       tmpl.icon_url ?? '/pwa-192x192.png',
            url:        tmpl.url ?? '/HairDashboard',
            history_id: historyId,
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

      // Clean up stale endpoints
      if (staleIds.length) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/notification_subscriptions?id=in.(${staleIds.join(',')})`,
          { method: 'DELETE', headers: dbHeaders },
        )
      }

      // Update history counts
      if (historyId) {
        await fetch(`${SUPABASE_URL}/rest/v1/notification_history?id=eq.${historyId}`, {
          method: 'PATCH',
          headers: dbHeaders,
          body: JSON.stringify({ total_sent: sent, total_failed: failed }),
        })
      }

      // Mark users as sent (upsert to update sent_at for repeat sends)
      if (userIds.length) {
        const sentRows = userIds.map(uid => ({ user_id: uid, type: tmpl.type, sent_at: new Date().toISOString() }))
        await fetch(`${SUPABASE_URL}/rest/v1/auto_notif_sent`, {
          method: 'POST',
          headers: { ...dbHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(sentRows),
        })
      }

      results[tmpl.type] = { sent, failed, deleted }
    }

    return json({ ok: true, results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return json({ error: msg }, 500)
  }
})
