// Public endpoint that proxies frontend pixel events to the server-side CAPI
// (Facebook Conversions API + TikTok Events API). Fires fire-and-forget so the
// client doesn't block waiting for CAPI to respond.
//
// Why this exists:
// - Browser pixels (fbq.track / ttq.track) only fire client-side and don't
//   include the test_event_code from app_config.
// - CAPI calls automatically include test_event_code and log to
//   tracking_events_log (which powers the Admin > Tracking dashboard).
// - With both firing using the same event_id, FB/TikTok dedupe on their end.

import { corsHeaders } from '../_shared/cors.ts'
import { sendFacebookCAPIEvent } from '../_shared/facebook-capi.ts'
import { sendTikTokEvent } from '../_shared/tiktok-events-api.ts'

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  try {
    const body = await req.json()
    const {
      platform,        // 'facebook' | 'tiktok'
      event_name,      // 'ViewContent' | 'Lead' | 'InitiateCheckout' | 'CompletePayment' | 'SubmitForm' | etc
      event_id,        // for dedupe with browser pixel
      user_data,       // { email?, external_id?, fbp?, fbc?, ttclid? }
      custom_data,     // FB-specific: { content_name, content_category, value, currency, ... }
      properties,      // TT-specific: { value, currency, contents: [...] }
    } = body

    if (!platform || !event_name || !event_id) {
      return new Response(JSON.stringify({ ok: false, error: 'missing required fields' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const ip = req.headers.get('CF-Connecting-IP')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? undefined
    const userAgent = req.headers.get('user-agent') ?? undefined

    if (platform === 'facebook') {
      // Fire-and-forget — don't block response on CAPI roundtrip
      sendFacebookCAPIEvent({
        event_name,
        event_id,
        user_data: {
          ...(user_data || {}),
          ip,
          user_agent: userAgent,
        },
        custom_data: custom_data || {},
      }).catch(() => { /* logged inside */ })
    } else if (platform === 'tiktok') {
      sendTikTokEvent({
        event: event_name,
        event_id,
        user_data: {
          ...(user_data || {}),
          ip,
          user_agent: userAgent,
        },
        properties: properties || {},
      }).catch(() => { /* logged inside */ })
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'unknown platform' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
