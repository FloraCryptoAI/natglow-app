import { sendFacebookCAPIEvent }   from '../_shared/facebook-capi.ts'
import { sendTikTokEvent }         from '../_shared/tiktok-events-api.ts'
import { sendTransactionalEmail }  from '../send-transactional-email/index.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://natglow.app'

// Reverse map: Stripe price ID → plan_key (fallback when metadata is absent)
const PRICE_TO_PLAN: Record<string, string> = {}
const _envPrices: [string, string][] = [
  ['STRIPE_PRICE_MONTHLY',         'monthly_699'],
  ['STRIPE_PRICE_MONTHLY_CHEAP',   'monthly_499'],
  ['STRIPE_PRICE_MONTHLY_PREMIUM', 'monthly_1499'],
]
for (const [envKey, planKey] of _envPrices) {
  const id = Deno.env.get(envKey)
  if (id) PRICE_TO_PLAN[id] = planKey
}

// Plan → USD price (for CAPI value field)
const PLAN_VALUE: Record<string, number> = {
  monthly_499:  4.99,
  monthly_699:  6.99,
  monthly_1499: 14.99,
}

function resolvePlanKey(priceId: string | null, metaPlanKey: string | null): string | null {
  if (metaPlanKey) return metaPlanKey
  if (priceId && PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId]
  return null
}

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

async function dbUpsert(table: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
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

async function dbInsert(table: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=user_id&limit=1`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const rows = await res.json()
  return rows[0]?.user_id ?? null
}

async function getSubscriptionRowBySubId(subId: string): Promise<{ email: string | null; user_id: string | null }> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}&select=email,user_id&limit=1`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const rows = await res.json()
  return { email: rows[0]?.email ?? null, user_id: rows[0]?.user_id ?? null }
}

async function hasExistingSubscription(userId: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=id&limit=1`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
  )
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0
}

async function adminCreateUser(email: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, email_confirm: true }),
  })
  const data = await res.json()
  return data?.id ?? null
}

async function adminGenerateMagicLink(email: string): Promise<string | null> {
  const res  = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
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
  const data = await res.json()
  return data?.action_link ?? null
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

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          console.log('Processing checkout.session.completed:', {
            session_id: session.id,
            customer: session.customer,
            customer_email: session.customer_details?.email,
            subscription: session.subscription,
            mode: session.mode,
            metadata: session.metadata,
          })
          if (session.mode !== 'subscription') break

          const email = session.customer_details?.email ?? ''
          const sub = await stripeGet(`/subscriptions/${session.subscription}`)

          let userId: string | null = session.metadata?.supabase_uid ?? null
          let isFirstSubscription = false

          if (!userId && email) {
            userId = await getUserIdByEmail(email)
            if (!userId) {
              userId = await adminCreateUser(email)
              isFirstSubscription = true
            }
          }

          const funnelSessionId: string | null = session.metadata?.funnel_session_id ?? null
          const rawPriceId: string | null = sub.items?.data?.[0]?.price?.id ?? null
          const planKey = resolvePlanKey(rawPriceId, session.metadata?.plan_key ?? null)

          // Tracking metadata from checkout session
          const fbEventId:       string | null = session.metadata?.fb_event_id       ?? null
          const ttCompleteId:    string | null = session.metadata?.tt_complete_id    ?? null
          const fbp:             string | null = session.metadata?.fbp               ?? null
          const fbc:             string | null = session.metadata?.fbc               ?? null
          const clientUserAgent: string | null = session.metadata?.client_user_agent ?? null
          const clientIp:        string | null = session.metadata?.client_ip         ?? null
          const attributionRaw:  string | null = session.metadata?.attribution       ?? null

          let attribution: Record<string, string> | null = null
          if (attributionRaw) {
            try { attribution = JSON.parse(attributionRaw) } catch { /* ignore */ }
          }

          if (userId) {
            // Detect first subscription if we got userId from supabase_uid metadata
            if (!isFirstSubscription) {
              isFirstSubscription = !(await hasExistingSubscription(userId))
            }

            const subData: Record<string, unknown> = {
              user_id: userId,
              email,
              stripe_customer_id: session.customer,
              stripe_subscription_id: sub.id,
              status: sub.status ?? 'active',
              price_id: rawPriceId,
              pricing_plan: planKey,
              current_period_end: toISO(sub.current_period_end),
            }
            if (attribution) subData.attribution = attribution

            await dbUpsert('subscriptions', subData)

            // Generate magic link for welcome email (fire-and-forget generate, then pass to email)
            let magicLink: string | null = null
            if (email) {
              try { magicLink = await adminGenerateMagicLink(email) } catch { /* non-fatal */ }
            }

            if (funnelSessionId) {
              await Promise.all([
                dbUpdate('funnel_events', { user_id: userId }, `session_id=eq.${funnelSessionId}`),
                dbInsert('funnel_events', {
                  event_type: 'payment_completed',
                  session_id: funnelSessionId,
                  user_id: userId,
                  pricing_plan: planKey,
                  metadata: attribution ? { attribution } : null,
                }),
              ])
            }

            // Transactional email — fire and forget
            if (email && email.trim().length > 0) {
              try {
                const planLabel = planKey ?? 'Monthly subscription'
                const planAmount = planKey ? `$${(PLAN_VALUE[planKey] ?? 0).toFixed(2)}` : undefined
                const nextDate = sub.current_period_end
                  ? new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : undefined
                const emailTemplate = isFirstSubscription ? 'welcome' : 'payment_success'
                console.log(`Sending ${emailTemplate} email to ${email}`)
                sendTransactionalEmail({
                  to: email.trim(),
                  template: emailTemplate,
                  locale: 'en',
                  data: { plan: planLabel, amount: planAmount, nextDate, magic_link: magicLink ?? undefined },
                }).catch(err => console.error(`${emailTemplate} email failed:`, err))
              } catch (emailErr) {
                console.error('Email setup threw:', emailErr)
              }
            } else {
              console.warn('Skipping transactional email: email is empty')
            }
          }

          // Send Purchase event server-side — fire and forget, must not block the 200 response
          const planValue = planKey ? (PLAN_VALUE[planKey] ?? null) : null
          const purchaseEventId   = fbEventId    ?? `purchase_${session.id}`
          const ttCompleteEventId = ttCompleteId ?? `complete_${session.id}`

          Promise.allSettled([
            sendFacebookCAPIEvent({
              event_name: 'Purchase',
              event_id:   purchaseEventId,
              user_data: {
                email:             email || undefined,
                fbp:               fbp   || undefined,
                fbc:               fbc   || undefined,
                client_user_agent: clientUserAgent || undefined,
                client_ip_address: clientIp        || undefined,
                external_id:       userId           || undefined,
              },
              custom_data: {
                value:        planValue ?? undefined,
                currency:     'USD',
                content_name: planKey   ?? undefined,
              },
            }),
            sendTikTokEvent({
              event:    'CompletePayment',
              event_id: ttCompleteEventId,
              user_data: {
                email:       email  || undefined,
                external_id: userId || undefined,
                ip:          clientIp       || undefined,
                user_agent:  clientUserAgent || undefined,
              },
              properties: {
                value:    planValue ?? undefined,
                currency: 'USD',
                contents: [{
                  content_id:   planKey ?? 'natglow_subscription',
                  content_type: 'product',
                  content_name: planKey ?? 'natglow_subscription',
                  quantity:     1,
                  price:        planValue ?? undefined,
                }],
              },
            }),
          ]).catch(() => { /* never throws */ })

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
          await dbUpdate('subscriptions', {
            status: 'canceled',
            canceled_at: toISO(sub.canceled_at) ?? new Date().toISOString(),
          }, `stripe_subscription_id=eq.${sub.id}`)

          // Cancellation email — fire and forget
          const { email: cancelEmail } = await getSubscriptionRowBySubId(sub.id)
          if (cancelEmail && cancelEmail.trim().length > 0) {
            try {
              const accessUntil = sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : undefined
              console.log(`Sending subscription_canceled email to ${cancelEmail}`)
              sendTransactionalEmail({
                to: cancelEmail.trim(),
                template: 'subscription_canceled',
                locale: 'en',
                data: { accessUntil },
              }).catch(err => console.error('subscription_canceled email failed:', err))
            } catch (emailErr) {
              console.error('Cancellation email setup threw:', emailErr)
            }
          }
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object
          await dbUpdate('subscriptions', { status: 'past_due' }, `stripe_subscription_id=eq.${invoice.subscription}`)

          // Payment failed email — fire and forget
          const { email: failedEmail } = await getSubscriptionRowBySubId(invoice.subscription)
          if (failedEmail && failedEmail.trim().length > 0) {
            try {
              console.log(`Sending payment_failed email to ${failedEmail}`)
              sendTransactionalEmail({
                to: failedEmail.trim(),
                template: 'payment_failed',
                locale: 'en',
                data: { updateUrl: 'https://app.natglow.app/HairSettings' },
              }).catch(err => console.error('payment_failed email failed:', err))
            } catch (emailErr) {
              console.error('Payment failed email setup threw:', emailErr)
            }
          }
          break
        }
      }
    } catch (caseErr) {
      console.error(`Error processing event ${event.type}:`, caseErr)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook fatal error:', err)
    const errMsg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ received: true, error: errMsg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
