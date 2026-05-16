import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL    = 'NatGlow <hello@natglow.app>'

const RATE_EMAIL_PER_HOUR = 3
const RATE_IP_PER_HOUR    = 10

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

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

async function checkRateLimit(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const emailRes = await db(
    `auth_codes?email=eq.${encodeURIComponent(email)}&created_at=gte.${since}&select=id`,
  )
  const emailRows = await emailRes.json()
  if (Array.isArray(emailRows) && emailRows.length >= RATE_EMAIL_PER_HOUR) return false

  if (ip !== 'unknown') {
    const ipRes = await db(
      `auth_codes?ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${since}&select=id`,
    )
    const ipRows = await ipRes.json()
    if (Array.isArray(ipRows) && ipRows.length >= RATE_IP_PER_HOUR) return false
  }

  return true
}

async function emailExists(email: string): Promise<boolean> {
  const res = await db(
    `subscriptions?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
  )
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0
}

async function invalidatePreviousCodes(email: string): Promise<void> {
  await db(`auth_codes?email=eq.${encodeURIComponent(email)}&used_at=is.null`, {
    method: 'PATCH',
    body: JSON.stringify({ used_at: new Date().toISOString() }),
  })
}

async function saveCode(email: string, code: string, ip: string | null): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await db('auth_codes', {
    method: 'POST',
    body: JSON.stringify({ email, code, expires_at: expiresAt, ip_address: ip }),
  })
}

function buildCodeEmail(code: string, locale: string): { subject: string; html: string } {
  const isEs = locale.startsWith('es')
  const subject = isEs
    ? `${code} — Tu código de acceso NatGlow`
    : `${code} — Your NatGlow login code`

  const html = `<!DOCTYPE html>
<html lang="${isEs ? 'es' : 'en'}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>NatGlow Login Code</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#FB45A9,#E03594);border-radius:16px 16px 0 0;padding:24px 32px;text-align:center">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">NatGlow</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;border:1px solid #e7e5e4;border-top:none;padding:36px 28px;text-align:center">
          <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#1c1917">
            ${isEs ? 'Tu código de acceso' : 'Your login code'}
          </p>
          <p style="margin:0 0 32px;font-size:14px;color:#78716c;line-height:1.6">
            ${isEs
              ? 'Ingresa este código en NatGlow para acceder a tu cuenta. Válido por <strong>10 minutos</strong>.'
              : 'Enter this code in NatGlow to access your account. Valid for <strong>10 minutes</strong>.'}
          </p>

          <div style="background:#f5f5f4;border-radius:14px;padding:24px 32px;margin:0 auto 32px;display:inline-block">
            <span style="font-size:44px;font-weight:800;letter-spacing:14px;color:#1c1917;font-variant-numeric:tabular-nums">${code}</span>
          </div>

          <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.6;max-width:320px;margin:0 auto">
            ${isEs
              ? '⚠️ Nunca compartas este código con nadie. NatGlow jamás te lo pedirá por teléfono o mensaje.'
              : '⚠️ Never share this code with anyone. NatGlow will never ask for it by phone or message.'}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center">
          <p style="font-size:11px;color:#a8a29e;margin:0 0 6px">
            © ${new Date().getFullYear()} NatGlow
          </p>
          <p style="font-size:11px;color:#a8a29e;margin:0">
            <a href="https://app.natglow.app/privacy" style="color:#a8a29e;text-decoration:none">${isEs ? 'Privacidad' : 'Privacy'}</a>
            &nbsp;·&nbsp;
            <a href="https://app.natglow.app/contact" style="color:#a8a29e;text-decoration:none">${isEs ? 'Soporte' : 'Support'}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  try {
    const body   = await req.json()
    const email  = (body.email  ?? '').trim().toLowerCase()
    const locale = (body.locale ?? 'en').trim()

    // Always return success to avoid email enumeration
    if (!isValidEmail(email)) return json({ success: true })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    const withinLimit = await checkRateLimit(email, ip)
    if (!withinLimit) return json({ success: true })

    const exists = await emailExists(email)
    if (!exists) return json({ success: true })

    await invalidatePreviousCodes(email)

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')

    await saveCode(email, code, ip === 'unknown' ? null : ip)

    const { subject, html } = buildCodeEmail(code, locale)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject, html }),
    })

    return json({ success: true })
  } catch {
    return json({ success: true })
  }
})
