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
  Prefer:         'return=representation',
}

async function supabaseGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: authHeaders })
  const d   = await res.json()
  return Array.isArray(d) ? d : []
}

async function resolveUserIds(segmentation: string): Promise<string[]> {
  if (segmentation === 'all_active') {
    const rows = await supabaseGet('subscriptions?select=user_id&status=eq.active&limit=2000')
    return rows.map((r: any) => r.user_id)
  }

  if (segmentation.startsWith('by_plan:')) {
    const plan = encodeURIComponent(segmentation.replace('by_plan:', ''))
    const rows = await supabaseGet(`subscriptions?select=user_id&status=eq.active&pricing_plan=eq.${plan}&limit=2000`)
    return rows.map((r: any) => r.user_id)
  }

  if (segmentation.startsWith('by_status:')) {
    const status = encodeURIComponent(segmentation.replace('by_status:', ''))
    const rows   = await supabaseGet(`subscriptions?select=user_id&status=eq.${status}&limit=2000`)
    return rows.map((r: any) => r.user_id)
  }

  if (segmentation.startsWith('inactive_days:')) {
    const days   = parseInt(segmentation.replace('inactive_days:', ''))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const rows   = await supabaseGet(
      `subscriptions?select=user_id&status=eq.active&updated_at=lte.${cutoff.toISOString()}&limit=2000`
    )
    return rows.map((r: any) => r.user_id)
  }

  if (segmentation.startsWith('user_email:')) {
    const email   = segmentation.replace('user_email:', '')
    const authRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=50`,
      { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } },
    )
    const data = await authRes.json()
    const user = (data?.users ?? []).find((u: any) => u.email === email)
    return user ? [user.id] : []
  }

  return []
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
    const mode = url.searchParams.get('mode')

    // ── POST: dispatch notification ───────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      const { segmentation, title_en, title_es, body_en, body_es, url: notifUrl, icon_url, channels } = body

      if (!segmentation || !title_en || !body_en || !channels?.length) {
        return json({ error: 'segmentation, title_en, body_en e channels são obrigatórios' }, 400)
      }

      const user_ids = await resolveUserIds(segmentation)
      if (!user_ids.length) {
        return json({ error: 'Nenhum usuário encontrado para esta segmentação' }, 400)
      }

      // Create history record upfront so we have the ID for push payloads
      const histRes  = await fetch(`${SUPABASE_URL}/rest/v1/notification_history`, {
        method:  'POST',
        headers: dbHeaders,
        body:    JSON.stringify({
          segmentation: { type: segmentation },
          title_en, title_es: title_es ?? title_en,
          body_en,  body_es:  body_es  ?? body_en,
          url:      notifUrl ?? null,
          channels,
          total_sent:    0,
          total_failed:  0,
          total_clicked: 0,
        }),
      })
      const histData = await histRes.json()
      const histId   = Array.isArray(histData) ? histData[0]?.id : histData?.id ?? null

      // Call send-push-notification (same host, passes through admin token)
      const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method:  'POST',
        headers: {
          ...authHeaders,
          'Content-Type':  'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          user_ids, title_en, title_es: title_es ?? title_en,
          body_en, body_es: body_es ?? body_en,
          url: notifUrl, icon_url, channels, history_id: histId,
        }),
      })
      const result = await sendRes.json()

      // Update history with actual counts
      if (histId) {
        await fetch(`${SUPABASE_URL}/rest/v1/notification_history?id=eq.${histId}`, {
          method:  'PATCH',
          headers: { ...dbHeaders, Prefer: 'return=minimal' },
          body:    JSON.stringify({ total_sent: result.sent ?? 0, total_failed: result.failed ?? 0 }),
        })
      }

      return json({ ok: true, history_id: histId, users_targeted: user_ids.length, ...result })
    }

    // ── PATCH: update notification template ──────────────
    if (req.method === 'PATCH' && mode === 'update_template') {
      const { id, ...fields } = await req.json()
      if (!id) return json({ error: 'id obrigatório' }, 400)
      const allowed = ['title_en','title_es','body_en','body_es','url','icon_url','interval_days','enabled']
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of allowed) {
        if (key in fields) patch[key] = fields[key]
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/notification_templates?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...dbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      })
      const updated = await res.json()
      return json({ ok: true, template: Array.isArray(updated) ? updated[0] : updated })
    }

    // ── POST: trigger auto notification manually ──────────
    if (req.method === 'POST' && mode === 'trigger_auto') {
      const { type } = await req.json().catch(() => ({}))
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-notifications`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ type }),
      })
      const result = await res.json()
      return json(result)
    }

    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors })

    // ── GET: stats ────────────────────────────────────────
    if (mode === 'stats') {
      const now        = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const thirtyAgo  = new Date(now); thirtyAgo.setDate(thirtyAgo.getDate() - 29)

      const [subsRes, activeRes, monthHistRows, chartRows] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/notification_subscriptions?select=id`, {
          headers: { ...authHeaders, Prefer: 'count=exact' },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=user_id&status=eq.active`, {
          headers: { ...authHeaders, Prefer: 'count=exact' },
        }),
        supabaseGet(
          `notification_history?select=total_sent,total_failed,total_clicked&sent_at=gte.${monthStart}`
        ),
        supabaseGet(
          `notification_history?select=sent_at,total_sent,total_clicked&sent_at=gte.${thirtyAgo.toISOString()}&order=sent_at.asc`
        ),
      ])

      const optInCount  = parseInt(subsRes.headers.get('content-range')?.split('/')[1]    ?? '0')
      const activeCount = parseInt(activeRes.headers.get('content-range')?.split('/')[1]  ?? '0')
      const optInRate   = activeCount > 0
        ? parseFloat(((optInCount / activeCount) * 100).toFixed(1))
        : 0

      const monthSent   = monthHistRows.reduce((s: number, h: any) => s + (h.total_sent ?? 0), 0)
      const withClicks  = monthHistRows.filter((h: any) => (h.total_sent ?? 0) > 0)
      const avgClickRate = withClicks.length > 0
        ? parseFloat(
            (withClicks.reduce((s: number, h: any) =>
              s + (h.total_clicked ?? 0) / h.total_sent, 0) / withClicks.length * 100
            ).toFixed(1)
          )
        : 0

      // Group chart by day
      const dayMap: Record<string, { sent: number; clicked: number }> = {}
      for (const h of chartRows) {
        const day = (h.sent_at as string).slice(0, 10)
        if (!dayMap[day]) dayMap[day] = { sent: 0, clicked: 0 }
        dayMap[day].sent    += h.total_sent    ?? 0
        dayMap[day].clicked += h.total_clicked ?? 0
      }
      const chartData = Object.entries(dayMap).map(([date, v]) => ({
        date,
        label:   new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        sent:    v.sent,
        clicked: v.clicked,
      }))

      return json({ optInCount, optInRate, monthSent, avgClickRate, chartData })
    }

    // ── GET: history ──────────────────────────────────────
    if (mode === 'history') {
      const page     = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
      const pageSize = 20
      const offset   = (page - 1) * pageSize

      const [histRes, countRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/notification_history?select=*&order=sent_at.desc&limit=${pageSize}&offset=${offset}`,
          { headers: authHeaders },
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/notification_history?select=id`,
          { headers: { ...authHeaders, Prefer: 'count=exact' } },
        ),
      ])

      const history = await histRes.json()
      const total   = parseInt(countRes.headers.get('content-range')?.split('/')[1] ?? '0')
      return json({ history: Array.isArray(history) ? history : [], total, page, pageSize })
    }

    // ── GET: templates ───────────────────────────────────
    if (mode === 'templates') {
      const templates = await supabaseGet('notification_templates?order=type.asc')
      return json({ templates: Array.isArray(templates) ? templates : [] })
    }

    // ── PATCH: update template ────────────────────────────
    if (mode === 'update_template' && req.method === 'PATCH') {
      // already handled above in POST block — but PATCH arrives as a separate method
    }

    // ── GET: lookup ───────────────────────────────────────
    if (mode === 'lookup') {
      const email = url.searchParams.get('email') ?? ''
      if (!email) return json({ found: false, error: 'email obrigatório' }, 400)

      const authRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=50`,
        { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } },
      )
      const authData = await authRes.json()
      const user     = (authData?.users ?? []).find((u: any) => u.email === email)
      if (!user) return json({ found: false })

      const subs = await supabaseGet(
        `subscriptions?select=pricing_plan,status&user_id=eq.${user.id}&limit=1`
      )
      const sub = subs[0]

      return json({
        found:   true,
        user_id: user.id,
        email:   user.email,
        name:    user.user_metadata?.name ?? user.email ?? '',
        plan:    sub?.pricing_plan ?? null,
        status:  sub?.status       ?? null,
      })
    }

    return new Response('Bad request', { status: 400, headers: cors })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
