import { createClient } from 'npm:@supabase/supabase-js@2'
import { createAdminJWT } from '../_shared/admin-jwt.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function verifyOTP(otp: string, storedHash: string): Promise<boolean> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp))
  const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return hash === storedHash
}

function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function json(cors: Record<string, string>, data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function audit(ip: string, step: string, result: string, notes?: string) {
  await db.from('admin_audit_log')
    .insert({ ip, step, result, notes: notes ?? null })
    .then(() => {}).catch(() => {})
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const ip = getIP(req)

  try {
    const body = await req.json()
    const { sessionId, otp } = body as { sessionId?: string; otp?: string }

    if (!sessionId || !otp || !/^\d{6}$/.test(otp)) {
      return json(cors, { error: 'Código inválido' }, 400)
    }

    const { data: session, error: sessErr } = await db
      .from('admin_otp_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessErr || !session) {
      await audit(ip, 'step2', 'session_not_found')
      return json(cors, { error: 'Sessão inválida. Reinicie o login.' }, 401)
    }

    if (new Date(session.expires_at) < new Date()) {
      await db.from('admin_otp_sessions').delete().eq('id', sessionId)
      await audit(ip, 'step2', 'otp_expired')
      return json(cors, { error: 'Código expirado. Reinicie o login.' }, 401)
    }

    if (session.used_at) {
      await audit(ip, 'step2', 'otp_already_used')
      return json(cors, { error: 'Código já utilizado. Reinicie o login.' }, 401)
    }

    if (session.attempt_count >= 3) {
      await db.from('admin_otp_sessions').delete().eq('id', sessionId)
      await audit(ip, 'step2', 'max_attempts')
      return json(cors, { error: 'Muitas tentativas. Reinicie o login.' }, 429)
    }

    await db.from('admin_otp_sessions')
      .update({ attempt_count: session.attempt_count + 1 })
      .eq('id', sessionId)

    const otpMatch = await verifyOTP(otp, session.otp_hash)

    if (!otpMatch) {
      const remaining = 2 - session.attempt_count
      await audit(ip, 'step2', 'otp_invalid')
      if (remaining <= 0) {
        await db.from('admin_otp_sessions').delete().eq('id', sessionId)
        return json(cors, { error: 'Muitas tentativas. Reinicie o login.' }, 429)
      }
      return json(cors, {
        error: `Código incorreto. ${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.`,
      }, 401)
    }

    await db.from('admin_otp_sessions')
      .update({ used_at: new Date().toISOString() })
      .eq('id', sessionId)

    const token = await createAdminJWT(7200)
    await audit(ip, 'step2', 'login_success')

    return json(cors, { token })
  } catch (err) {
    await audit(ip, 'step2', 'exception', err?.message).catch(() => {})
    return json(cors, { error: 'Erro interno' }, 500)
  }
})
