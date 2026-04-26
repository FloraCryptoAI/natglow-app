import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ADMIN_EMAIL = (Deno.env.get('ADMIN_EMAIL') ?? '').trim().toLowerCase()
const ADMIN_PASSWORD_HASH = (Deno.env.get('ADMIN_PASSWORD_HASH') ?? '').trim()
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? []
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Verifica senha usando PBKDF2 nativo do Deno — formato: "saltHex:hashHex"
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':')
    if (!saltHex || !hashHex) return false

    const salt = hexToBytes(saltHex)
    const expected = hexToBytes(hashHex)

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    )
    const derived = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256
    ))

    if (derived.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i]
    return diff === 0
  } catch {
    return false
  }
}

// Hash do OTP com SHA-256 (OTPs são aleatórios e de curta duração — SHA-256 é suficiente)
async function hashOTP(otp: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp))
  return bytesToHex(new Uint8Array(buf))
}

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const now = new Date()
    const { data: existing, error } = await db
      .from('admin_rate_limits')
      .select('*')
      .eq('ip', ip)
      .eq('step', 'step1')
      .maybeSingle()

    if (error) return true

    if (existing) {
      if (existing.blocked_until && new Date(existing.blocked_until) > now) return false

      const windowExpiry = new Date(existing.first_attempt_at)
      windowExpiry.setMinutes(windowExpiry.getMinutes() + 15)

      if (now > windowExpiry) {
        await db.from('admin_rate_limits')
          .update({ attempt_count: 1, first_attempt_at: now.toISOString(), blocked_until: null })
          .eq('ip', ip).eq('step', 'step1')
        return true
      }

      if (existing.attempt_count >= 5) {
        const blockedUntil = new Date(now)
        blockedUntil.setMinutes(blockedUntil.getMinutes() + 30)
        await db.from('admin_rate_limits')
          .update({ blocked_until: blockedUntil.toISOString() })
          .eq('ip', ip).eq('step', 'step1')
        return false
      }

      await db.from('admin_rate_limits')
        .update({ attempt_count: existing.attempt_count + 1 })
        .eq('ip', ip).eq('step', 'step1')
    } else {
      await db.from('admin_rate_limits').insert({ ip, step: 'step1' })
    }

    return true
  } catch {
    return true
  }
}

async function sendOTP(email: string, otp: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NatGlow Admin <noreply@natglow.app>',
        to: [email],
        subject: `${otp} — Código de acesso admin NatGlow`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;padding:32px">
            <h2 style="color:#1c1917;margin-bottom:8px">Acesso Admin — NatGlow</h2>
            <p style="color:#78716c;margin-bottom:24px">Seu código de verificação:</p>
            <div style="background:#f5f5f4;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1c1917">${otp}</span>
            </div>
            <p style="color:#a8a29e;font-size:13px">Válido por <strong>10 minutos</strong>. Não compartilhe este código.</p>
          </div>`,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function audit(ip: string, email: string, step: string, result: string, notes?: string) {
  try {
    await db.from('admin_audit_log')
      .insert({ ip, email_attempted: email, step, result, notes: notes ?? null })
  } catch { /* silencioso */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const ip = getIP(req)
  let emailAttempted = ''

  try {
    if (!ADMIN_PASSWORD_HASH || !ADMIN_PASSWORD_HASH.includes(':')) {
      return json({ error: 'ADMIN_PASSWORD_HASH inválido. Use o formato pbkdf2 (saltHex:hashHex).' }, 503)
    }
    if (!ADMIN_EMAIL) {
      return json({ error: 'ADMIN_EMAIL não configurado.' }, 503)
    }

    const body = await req.json()
    const { email, password } = body as { email?: string; password?: string }
    emailAttempted = email?.toLowerCase().trim() ?? ''

    if (!emailAttempted || !password) return json({ error: 'Credenciais inválidas' }, 400)

    const allowed = await checkRateLimit(ip)
    if (!allowed) {
      await audit(ip, emailAttempted, 'step1', 'rate_limited')
      return json({ error: 'Credenciais inválidas' }, 429)
    }

    const emailOk = emailAttempted === ADMIN_EMAIL
    const passwordOk = await verifyPassword(password, ADMIN_PASSWORD_HASH)

    if (!emailOk || !passwordOk) {
      await audit(ip, emailAttempted, 'step1', 'invalid_credentials')
      return json({ error: 'Credenciais inválidas' }, 401)
    }

    const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
    const otpHash = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { data: session, error: sessErr } = await db
      .from('admin_otp_sessions')
      .insert({ otp_hash: otpHash, expires_at: expiresAt })
      .select('id')
      .single()

    if (sessErr || !session) {
      await audit(ip, emailAttempted, 'step1', 'session_error', sessErr?.message)
      return json({ error: 'Erro ao criar sessão.' }, 500)
    }

    const sent = await sendOTP(ADMIN_EMAIL, otp)
    if (!sent) {
      await db.from('admin_otp_sessions').delete().eq('id', session.id)
      await audit(ip, emailAttempted, 'step1', 'email_error')
      return json({ error: 'Erro ao enviar código. Verifique RESEND_API_KEY.' }, 500)
    }

    await audit(ip, emailAttempted, 'step1', 'otp_sent')
    return json({ sessionId: session.id })
  } catch (err) {
    await audit(ip, emailAttempted, 'step1', 'exception', err?.message).catch(() => {})
    return json({ error: `Erro interno: ${err?.message ?? 'desconhecido'}` }, 500)
  }
})
