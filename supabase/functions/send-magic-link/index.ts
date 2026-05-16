import { corsHeaders } from '../_shared/cors.ts'
import { magicLinkTemplate } from '../_shared/email-templates/magic-link.ts'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')!
const SITE_URL          = Deno.env.get('SITE_URL') ?? 'https://app.natglow.app'

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const ok = new Response(JSON.stringify({ success: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

  try {
    const { email, locale = 'en' } = await req.json()
    if (!email) return ok // privacy: no error exposure

    // Generate magic link via Supabase admin API
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email,
        options: { redirect_to: `${SITE_URL}/auth/callback` },
      }),
    })
    const linkData = await linkRes.json()
    const magicLink: string | undefined = linkData?.action_link

    if (!magicLink) return ok // user not found or link gen failed — privacy

    // Send via Resend using our branded template
    const { subject, html } = magicLinkTemplate(locale, { magic_link: magicLink })
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NatGlow <noreply@natglow.app>',
        to: email,
        subject,
        html,
      }),
    })
  } catch { /* privacy: never expose errors */ }

  return ok
})
