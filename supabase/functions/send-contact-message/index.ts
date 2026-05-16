import { corsHeaders } from '../_shared/cors.ts'

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

function buildAdminContactHtml(
  name: string, email: string, category: string, message: string, date: string,
): string {
  const replySubject = encodeURIComponent(`Re: Sua mensagem no NatGlow`)
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Nova mensagem de contato</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Pink header band -->
        <tr><td style="background:linear-gradient(135deg,#FB45A9,#E03594);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center">
          <p style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">NatGlow</p>
          <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.92);font-weight:600">Nova mensagem de contato</p>
        </td></tr>

        <!-- Card body -->
        <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;border:1px solid #e7e5e4;border-top:none;padding:32px 28px">

          <!-- Metadata table -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr>
              <td style="padding:9px 0;font-size:13px;color:#78716c;font-weight:600;width:90px;vertical-align:top;border-bottom:1px solid #f5f5f4">Nome</td>
              <td style="padding:9px 0;font-size:14px;color:#1c1917;font-weight:500;border-bottom:1px solid #f5f5f4">${name}</td>
            </tr>
            <tr>
              <td style="padding:9px 0;font-size:13px;color:#78716c;font-weight:600;width:90px;vertical-align:top;border-bottom:1px solid #f5f5f4">Email</td>
              <td style="padding:9px 0;font-size:14px;border-bottom:1px solid #f5f5f4">
                <a href="mailto:${email}" style="color:#FB45A9;font-weight:700;text-decoration:none">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:9px 0;font-size:13px;color:#78716c;font-weight:600;width:90px;vertical-align:top;border-bottom:1px solid #f5f5f4">Categoria</td>
              <td style="padding:9px 0;border-bottom:1px solid #f5f5f4">
                <span style="display:inline-block;padding:3px 12px;background:#FFF5FA;border:1px solid #FBCFE8;border-radius:9999px;font-size:12px;color:#be185d;font-weight:700">${category}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:9px 0;font-size:13px;color:#78716c;font-weight:600;width:90px;vertical-align:top">Data</td>
              <td style="padding:9px 0;font-size:13px;color:#78716c">${date}</td>
            </tr>
          </table>

          <!-- Message block -->
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#a8a29e;text-transform:uppercase;letter-spacing:0.07em">Mensagem da cliente</p>
          <div style="padding:18px 20px;background:#f5f5f4;border-radius:10px;border-left:4px solid #FB45A9">
            <p style="margin:0;font-size:14px;color:#1c1917;line-height:1.75;white-space:pre-wrap">${message}</p>
          </div>

          <!-- Reply button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
            <tr><td align="center">
              <a href="mailto:${email}?subject=${replySubject}"
                 style="display:inline-block;width:100%;max-width:340px;text-align:center;padding:16px 28px;background:linear-gradient(135deg,#FB45A9,#E03594);color:#ffffff;font-weight:800;font-size:15px;border-radius:9999px;text-decoration:none;box-sizing:border-box">
                Responder ao cliente →
              </a>
            </td></tr>
          </table>

          <!-- Reply-to note -->
          <p style="margin:18px 0 0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.6">
            Responda direto a este email — o destinatário<br/>
            (<strong style="color:#78716c">${email}</strong>) será automaticamente preenchido.
          </p>

        </td></tr>

        <!-- Outer footer -->
        <tr><td style="padding-top:20px;text-align:center">
          <p style="font-size:11px;color:#a8a29e;margin:0">
            © ${new Date().getFullYear()} NatGlow &nbsp;·&nbsp; Notificação interna de suporte
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
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

  const date = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const html = buildAdminContactHtml(name, email, category, message, date)

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
