import { corsHeaders } from '../_shared/cors.ts'
import { baseLayout  } from '../_shared/email-templates/base.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY')!
// TODO: Voltar para support@natglow.app quando configurar email forwarding/MX records no Namecheap
const SUPPORT_EMAIL        = 'natglowhelp@gmail.com'
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

function contactRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#78716c;font-weight:600;width:90px;vertical-align:top">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1c1917">${value}</td>
  </tr>`
}

async function sendEmail(name: string, email: string, category: string, message: string): Promise<void> {
  const subject = `[NatGlow Contact - ${category}] ${name}`

  const date = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1c1917">Nova mensagem de contato</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#78716c">Recebida via formulário de suporte NatGlow</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${contactRow('Nome', name)}
      ${contactRow('Email', `<a href="mailto:${email}" style="color:#FB45A9;font-weight:600">${email}</a>`)}
      ${contactRow('Categoria', `<span style="display:inline-block;padding:2px 10px;background:#FFF5FA;border:1px solid #FBCFE8;border-radius:9999px;font-size:12px;color:#be185d;font-weight:600">${category}</span>`)}
      ${contactRow('Data', date)}
    </table>

    <div style="margin:0 0 24px;padding:16px 18px;background:#f5f5f4;border-radius:10px;border-left:3px solid #FB45A9">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#a8a29e;text-transform:uppercase;letter-spacing:0.06em">Mensagem</p>
      <p style="margin:0;font-size:14px;color:#1c1917;line-height:1.7;white-space:pre-wrap">${message}</p>
    </div>

    <a href="mailto:${email}?subject=Re%3A%20Sua%20mensagem%20no%20NatGlow" style="display:inline-block;padding:13px 26px;background:linear-gradient(135deg,#FB45A9,#E03594);color:#ffffff;font-weight:700;font-size:14px;border-radius:9999px;text-decoration:none">Responder →</a>

    <p style="margin:16px 0 0;font-size:12px;color:#a8a29e;line-height:1.5">
      Responda direto a este email — o destinatário (<strong style="color:#78716c">${email}</strong>) será automaticamente preenchido.
    </p>
  `

  const html = baseLayout(content, `Nova mensagem de ${name}`)

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
