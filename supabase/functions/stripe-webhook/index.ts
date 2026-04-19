const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

async function verifySignature(payload: string, sigHeader: string): Promise<boolean> {
  const timestamp = sigHeader.split(',').find(p => p.startsWith('t='))?.slice(2)
  const signature = sigHeader.split(',').find(p => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !signature) return false

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const expected = Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
  return expected === signature
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  return res.json()
}

async function dbUpsert(table: string, data: Record<string, unknown>, onConflict: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: `resolution=merge-duplicates`,
    },
    body: JSON.stringify(data),
  })
}

async function dbUpdate(table: string, data: Record<string, unknown>, filter: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

function toISO(ts: number | null | undefined): string | null {
  if (!ts) return null
  const d = new Date(ts * 1000)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

Deno.serve(async (req) => {
  try {
    const sigHeader = req.headers.get('stripe-signature') ?? ''
    const body = await req.text()

    if (!(await verifySignature(body, sigHeader))) {
      return new Response('Assinatura inválida', { status: 400 })
    }

    const event = JSON.parse(body)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break
        const sub = await stripeGet(`/subscriptions/${session.subscription}`)
        await dbUpsert('subscriptions', {
          user_id: session.metadata?.supabase_uid,
          email: session.customer_details?.email ?? '',
          stripe_customer_id: session.customer,
          stripe_subscription_id: sub.id,
          status: sub.status ?? 'active',
          price_id: sub.items?.data?.[0]?.price?.id ?? null,
          current_period_end: toISO(sub.current_period_end),
        }, 'user_id')
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        await dbUpdate('subscriptions', {
          status: sub.status,
          price_id: sub.items?.data?.[0]?.price?.id ?? null,
          current_period_end: toISO(sub.current_period_end),
        }, `stripe_subscription_id=eq.${sub.id}`)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await dbUpdate('subscriptions', { status: 'canceled' }, `stripe_subscription_id=eq.${sub.id}`)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await dbUpdate('subscriptions', { status: 'past_due' }, `stripe_subscription_id=eq.${invoice.subscription}`)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
