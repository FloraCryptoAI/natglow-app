import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Teste isolado: valida se npm:web-push funciona em Deno/Supabase Edge Functions.
// Chamada: GET <url> (sem auth — função temporária, remover após validação)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Tenta importar npm:web-push
    // @ts-ignore — Deno npm: specifier
    const webpush = (await import('npm:web-push@3')).default

    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
    const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@natglow.app'

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    let body: { endpoint?: string; p256dh?: string; auth?: string } = {}
    try { body = await req.json() } catch { /* no body */ }

    if (!body.endpoint || !body.p256dh || !body.auth) {
      // Sem subscription para testar: só verifica que a lib importou OK
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'npm:web-push importou com sucesso',
          vapid_public_key_set: !!VAPID_PUBLIC_KEY,
          vapid_private_key_set: !!VAPID_PRIVATE_KEY,
          web_push_version: webpush.supportedContentEncodings ?? 'loaded',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Com subscription: tenta envio real
    const pushSubscription = {
      endpoint: body.endpoint,
      keys: { p256dh: body.p256dh, auth: body.auth },
    }

    const result = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: 'NatGlow Test',
        body: 'npm:web-push funcionou em Deno!',
        url: '/HairDashboard',
      })
    )

    return new Response(
      JSON.stringify({ ok: true, statusCode: result.statusCode, message: 'Push enviado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err), stack: err instanceof Error ? err.stack : undefined }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
