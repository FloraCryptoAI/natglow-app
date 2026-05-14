import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY')!
const SUPPORT_EMAIL        = 'support@natglow.app'
const FROM_EMAIL           = 'NatGlow <hello@natglow.app>'

const RATE_LIMIT_PER_HOUR = 3

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contact_messages?ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${since}&select=id`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    },
  )
  const rows = await res.json()
  return Array.isArray(rows) && rows.length < RATE_LIMIT_PER_HOUR
}

async function saveToDb(data: {
  name: string; email: string; category: string; message: string;
  ip_address: string | null; user_agent: string | null;
}): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

async function sendEmail(name: string, email: string, category: string, message: string): Promise<void> {
  const subject = `[NatGlow Contact - ${category}] ${name}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#FB45A9;margin-bottom:4px">New Contact Message</h2>
      <p style="color:#78716c;font-size:14px;margin-bottom:24px">via NatGlow support form</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#57534e;font-size:13px;font-weight:600;width:100px">From</td>
            <td style="padding:8px 0;color:#1c1917;font-size:14px">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#57534e;font-size:13px;font-weight:600">Reply-to</td>
            <td style="padding:8px 0;color:#1c1917;font-size:14px"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#57534e;font-size:13px;font-weight:600">Category</td>
            <td style="padding:8px 0;color:#1c1917;font-size:14px">${category}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#fafaf9;border-radius:8px;border:1px solid #e7e5e4">
        <p style="color:#57534e;font-size:13px;font-weight:600;margin:0 0 8px">Message</p>
        <p style="color:#1c1917;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap">${message}</p>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#a8a29e">Reply directly to this email to respond to the user.</p>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      reply_to: email,
      subject,
      html,
    }),
  })
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  try {
    const body = await req.json()
    const { name, email, category, message } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return json({ error: 'Name is required (min 2 characters).' }, 400)
    }
    if (!email || !isValidEmail(email)) {
      return json({ error: 'A valid email address is required.' }, 400)
    }
    if (!category || typeof category !== 'string') {
      return json({ error: 'Category is required.' }, 400)
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return json({ error: 'Message must be at least 10 characters.' }, 400)
    }
    if (message.trim().length > 2000) {
      return json({ error: 'Message must be under 2000 characters.' }, 400)
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const userAgent = req.headers.get('user-agent') ?? null

    const withinLimit = await checkRateLimit(ip)
    if (!withinLimit) {
      return json({ error: 'Too many requests. Please try again in an hour.' }, 429)
    }

    await Promise.all([
      saveToDb({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        message: message.trim(),
        ip_address: ip,
        user_agent: userAgent,
      }),
      sendEmail(name.trim(), email.trim(), category, message.trim()),
    ])

    return json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return json({ error: msg }, 500)
  }
})
