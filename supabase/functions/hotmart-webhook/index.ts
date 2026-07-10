import { sendTikTokEvent }        from '../_shared/tiktok-events-api.ts'
import { sendTransactionalEmail } from '../send-transactional-email/index.ts'
import { PLAN_USD }               from '../_shared/plan-pricing.ts'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL             = Deno.env.get('SITE_URL') ?? 'https://app.natglow.app'
const WEBHOOK_TOKEN        = Deno.env.get('HOTMART_WEBHOOK_TOKEN') ?? ''

// Map Hotmart product IDs → plan keys
const PRODUCT_TO_PLAN: Record<string, string> = {}
;([
  ['HOTMART_PRODUCT_ID_BASIC',    'one_time_basic'],
  ['HOTMART_PRODUCT_ID_STANDARD', 'one_time_standard'],
  ['HOTMART_PRODUCT_ID_PREMIUM',  'one_time_premium'],
  ['HOTMART_PRODUCT_ID_NATGLOW',  'natglow'],
] as [string, string][]).forEach(([envKey, planKey]) => {
  const id = Deno.env.get(envKey)
  if (id) PRODUCT_TO_PLAN[id] = planKey
})

const PLAN_VALUE: Record<string, number> = {
  one_time_basic:    17,
  one_time_standard: 27,
  one_time_premium:  47,
  // Reference value only — natglow's price varies by country, and
  // purchaseAmount below always prefers the real value from Hotmart's
  // payload (priceData.value) over this fallback.
  natglow:           7.9,
}

// ---------- Supabase helpers ----------

async function sbFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      Authorization:  `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey:         SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  })
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const res  = await sbFetch(`/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=user_id&limit=1`)
  const rows = await res.json()
  return rows[0]?.user_id ?? null
}

async function adminCreateUser(email: string): Promise<string | null> {
  const res  = await sbFetch(`/auth/v1/admin/users`, {
    method: 'POST',
    body:   JSON.stringify({ email, email_confirm: true }),
  })
  const data = await res.json()
  return data?.id ?? null
}

async function adminGenerateMagicLink(email: string): Promise<string | null> {
  const res  = await sbFetch(`/auth/v1/admin/generate_link`, {
    method: 'POST',
    body:   JSON.stringify({
      type:    'magiclink',
      email,
      options: { redirect_to: `${SITE_URL}/auth/callback` },
    }),
  })
  const data = await res.json()
  return data?.action_link ?? null
}

async function upsertSubscription(data: Record<string, unknown>) {
  await sbFetch(`/rest/v1/subscriptions?on_conflict=user_id`, {
    method:  'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body:    JSON.stringify(data),
  })
}

async function updateSubByTxId(txId: string, data: Record<string, unknown>) {
  await sbFetch(`/rest/v1/subscriptions?hotmart_transaction_id=eq.${encodeURIComponent(txId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
  })
}

async function getEmailByTxId(txId: string): Promise<string | null> {
  const res  = await sbFetch(`/rest/v1/subscriptions?hotmart_transaction_id=eq.${encodeURIComponent(txId)}&select=email&limit=1`)
  const rows = await res.json()
  return rows[0]?.email ?? null
}

// Look up the funnel a purchase came from via the user's most recent cta_clicked
// event. Its metadata carries `source` ('offer_natglow' | 'offer_detox') for
// funnel attribution and `country` (the ?country= offer bucket: 'mx'|'co'|'pe'|
// 'cl'|'default') for offer-country reporting. A single Hotmart product serves
// multiple funnels/countries, so this is how we keep them attributed.
async function getLastCtaContext(userId: string): Promise<{ source: string | null; country: string | null }> {
  try {
    const res = await sbFetch(
      `/rest/v1/funnel_events?event_type=eq.cta_clicked&user_id=eq.${userId}&order=created_at.desc&limit=1&select=metadata`
    )
    const rows = await res.json()
    const md   = rows?.[0]?.metadata ?? {}
    return {
      source:  (md.source  as string | undefined) ?? null,
      country: (md.country as string | undefined) ?? null,
    }
  } catch {
    return { source: null, country: null }
  }
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  // Hotmart sometimes sends a GET request when registering the webhook URL — respond 200 immediately
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const url  = new URL(req.url)

    console.log('Hotmart webhook received:', {
      method:       req.method,
      hottok_header: req.headers.get('x-hotmart-hottok') ? 'present' : 'absent',
      content_type: req.headers.get('content-type'),
    })

    const body = await req.text()

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(body)
    } catch {
      console.error('Hotmart webhook: invalid JSON body')
      // Always 200 — prevents Hotmart from disabling the webhook
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('Hotmart payload structure:', {
      event:         payload.event          ?? 'no event field',
      has_data:      !!payload.data,
      status:        (payload.data as Record<string, unknown>)?.purchase
                       ? ((payload.data as Record<string, unknown>).purchase as Record<string, unknown>)?.status ?? 'no status'
                       : 'no status',
      buyer_email:   (payload.data as Record<string, unknown>)?.buyer
                       ? ((payload.data as Record<string, unknown>).buyer as Record<string, unknown>)?.email ? 'present' : 'absent'
                       : 'absent',
      product_id:    (payload.data as Record<string, unknown>)?.product
                       ? ((payload.data as Record<string, unknown>).product as Record<string, unknown>)?.id ?? 'no product id'
                       : 'no product id',
      transaction:   (payload.data as Record<string, unknown>)?.purchase
                       ? ((payload.data as Record<string, unknown>).purchase as Record<string, unknown>)?.transaction ?? 'no transaction'
                       : 'no transaction',
      hottok_in_body: payload.hottok ? 'present' : 'absent',
    })

    // ---------- Auth ----------
    // v2 API sends hottok as the "x-hotmart-hottok" request header.
    // Fallback: also check the body JSON field "hottok" and the query param for older integrations.
    const receivedToken =
      req.headers.get('x-hotmart-hottok') ||
      (payload.hottok as string) ||
      url.searchParams.get('hottok') ||
      ''

    if (!WEBHOOK_TOKEN || receivedToken !== WEBHOOK_TOKEN) {
      console.error('Hotmart webhook: invalid hottok — ignoring event')
      // Return 200 so Hotmart does NOT deactivate the webhook endpoint
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ---------- Payload extraction ----------
    const event    = (payload.event as string) ?? ''
    const data     = (payload.data  as Record<string, unknown>) ?? {}

    const purchase    = (data.purchase as Record<string, unknown>)   ?? {}
    const product     = (data.product  as Record<string, unknown>)   ?? {}
    const buyer       = (data.buyer    as Record<string, unknown>)   ?? {}
    const priceData   = (purchase.price   as Record<string, unknown>) ?? {}
    const paymentData = (purchase.payment as Record<string, unknown>) ?? {}
    const tracking    = (purchase.tracking as Record<string, unknown>) ?? {}

    // `src` forwarded from the offer page's checkout URL comes back here. It's
    // the quiz attempt's funnel session_id (see OfferNatglow handleCheckout →
    // params.set('src', funnelSessionId)). Using it as the payment event's
    // session_id ties the payment back to the exact quiz attempt, so the funnel/
    // geography can join purchase → country/campaign instead of an orphan total.
    const trackingSrc = (tracking.source as string) ?? (tracking.source_sck as string) ?? null

    const txId             = (purchase.transaction as string) ?? ''
    const email            = ((buyer.email as string) ?? '').toLowerCase().trim()
    const name             = (buyer.name  as string) ?? ''
    const productId        = String((product.id as number | string) ?? '')
    const planKey          = PRODUCT_TO_PLAN[productId] ?? null
    const planValue        = planKey ? (PLAN_VALUE[planKey] ?? null) : null
    const purchaseAmount   = typeof priceData.value === 'number' ? priceData.value : planValue
    const purchaseCurrency = (priceData.currency_value as string) ?? 'USD'
    const purchaseType     = (paymentData.type as string) ?? null

    const purchaseStatus = ((purchase.status as string) ?? '').toUpperCase()

    // Derive the effective action from BOTH the event name and purchase.status.
    // Event name takes precedence for refund/cancel events because Hotmart sometimes
    // sends PURCHASE_REFUNDED with purchase.status = "CANCELLED" or even empty.
    const REFUND_EVENTS     = ['PURCHASE_REFUNDED', 'PURCHASE_CANCELLED', 'PURCHASE_CANCELLATION', 'PURCHASE_REFUND_REQUEST']
    const CHARGEBACK_EVENTS = ['PURCHASE_CHARGEBACK', 'PURCHASE_PROTEST']
    const APPROVED_EVENTS   = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_BILLET_PRINTED']
    const PENDING_EVENTS    = ['PURCHASE_WAITING_PAYMENT', 'PURCHASE_UNDER_ANALYSIS', 'PURCHASE_PRE_ORDER']

    let effectiveStatus = purchaseStatus
    if (REFUND_EVENTS.includes(event))                       effectiveStatus = 'REFUNDED'
    if (CHARGEBACK_EVENTS.includes(event))                   effectiveStatus = 'CHARGEBACK'
    if (APPROVED_EVENTS.includes(event) && !purchaseStatus)  effectiveStatus = 'APPROVED'
    if (PENDING_EVENTS.includes(event)  && !purchaseStatus)  effectiveStatus = 'WAITING_PAYMENT'

    console.log('Hotmart event:', event, 'status:', purchaseStatus, '→ effective:', effectiveStatus, {
      txId, email: email ? '***' : '(empty)', planKey, productId,
    })

    switch (effectiveStatus) {

      // ---- Access granted ----
      case 'APPROVED':
      case 'COMPLETE':
      case 'COMPLETED': {
        if (!email) { console.warn('APPROVED/COMPLETE: no buyer email'); break }

        let userId = await getUserIdByEmail(email)
        if (!userId) userId = await adminCreateUser(email)
        if (!userId) { console.error('Could not create/find user for', email); break }

        // Attribution from the user's last cta_clicked: funnel source + offer country.
        const { source: funnelSource, country: offerCountry } = await getLastCtaContext(userId)

        // Base USD value = plan's fixed list price (fixed-price product sold in
        // local currency). purchase_amount/currency stay as the LOCAL charge
        // (amount_original). Never sum the local charge as if it were USD.
        const amountUsd = PLAN_USD[planKey ?? ''] ?? (typeof purchaseAmount === 'number' ? purchaseAmount : null)

        await upsertSubscription({
          user_id:                userId,
          email,
          status:                 'active',
          pricing_plan:           planKey,
          hotmart_transaction_id: txId || null,
          hotmart_product_id:     productId || null,
          purchase_amount:        purchaseAmount,
          purchase_currency:      purchaseCurrency,
          purchase_type:          purchaseType,
          amount_usd:             amountUsd,
          access_type:            'paid',
          excluded_from_revenue:  false,
          offer_country:          offerCountry,
          payment_provider:       'hotmart',
        })

        // Log payment_completed into funnel_events for the admin funnel chart,
        // attributed to the originating funnel via the cta source looked up above.
        try {
          await sbFetch(`/rest/v1/funnel_events`, {
            method: 'POST',
            body: JSON.stringify({
              // Prefer the forwarded quiz-attempt id (`src`) so this payment
              // shares the session_id of the visitor's quiz/offer/cta events.
              // Falls back to a synthetic id when no src was forwarded (legacy /
              // manual orders), which then counts as an unjoinable total.
              event_type:   'payment_completed',
              session_id:   trackingSrc || `hp_${txId || Date.now()}`,
              user_id:      userId,
              metadata:     {
                source:        funnelSource,        // 'offer_natglow' | 'offer_detox' | null
                offer_country: offerCountry,        // 'mx'|'co'|'pe'|'cl'|'default' | null
                src:           trackingSrc,         // quiz attempt id forwarded via Hotmart, or null
                origin:        'hotmart_webhook',
                tx_id:         txId,
                product_id:    productId,
              },
              pricing_plan: planKey,
            }),
          })
        } catch (err) {
          console.error('Failed to log payment_completed funnel event:', err)
        }

        // Generate magic link for welcome email (non-fatal if fails)
        let magicLink: string | null = null
        try { magicLink = await adminGenerateMagicLink(email) } catch { /* non-fatal */ }

        // Welcome email — fire-and-forget
        sendTransactionalEmail({
          to:       email,
          template: 'welcome',
          locale:   'es',
          data:     { magic_link: magicLink ?? undefined, name },
        }).catch(err => console.error('Welcome email failed:', err))

        // TikTok CompletePayment — Hotmart's native pixel only fires Facebook,
        // so we still need to fire CompletePayment server-side for TikTok.
        // Facebook Purchase is NOT fired here: Hotmart's own Facebook pixel
        // already fires Purchase on the thank-you page, and firing CAPI here
        // would create a duplicate.
        const eventId = `hp_${txId || Date.now()}`
        await sendTikTokEvent({
          event:      'CompletePayment',
          event_id:   eventId,
          user_data:  { email, external_id: userId },
          properties: {
            value:    planValue ?? undefined,
            currency: purchaseCurrency,
            contents: [{
              content_id:   planKey || productId || 'natglow_purchase',
              content_type: 'product',
              content_name: planKey || 'NatGlow',
              quantity:     1,
              price:        planValue ?? undefined,
            }],
          },
        })

        break
      }

      // ---- Awaiting payment (boleto/PIX) ----
      case 'WAITING_PAYMENT':
      case 'PRINTED_BILLET':
      case 'PROCESSING_TRANSACTION':
      case 'PRE_ORDER': {
        if (!email) break
        let userId = await getUserIdByEmail(email)
        if (!userId) userId = await adminCreateUser(email)
        if (userId) {
          await upsertSubscription({
            user_id:                userId,
            email,
            status:                 'pending',
            pricing_plan:           planKey,
            hotmart_transaction_id: txId || null,
            hotmart_product_id:     productId || null,
            purchase_amount:        purchaseAmount,
            purchase_currency:      purchaseCurrency,
            purchase_type:          purchaseType,
          })
        }
        break
      }

      // ---- Refund ----
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED': {
        if (txId) {
          await updateSubByTxId(txId, { status: 'refunded' })
          const refundEmail = email || (await getEmailByTxId(txId))
          if (refundEmail) {
            sendTransactionalEmail({
              to:       refundEmail,
              template: 'purchase_refunded',
              locale:   'es',
              data:     {},
            }).catch(err => console.error('Refund email failed:', err))
          }
        }
        break
      }

      // ---- Chargeback / dispute ----
      case 'CHARGEBACK':
      case 'PROTESTED':
      case 'DISPUTE': {
        if (txId) await updateSubByTxId(txId, { status: 'chargeback' })
        break
      }

      // ---- Terminal states — no access granted, no DB write needed ----
      case 'CANCELLED':
      case 'CANCELED':
      case 'EXPIRED':
      case 'NO_FUNDS':
      case 'BLOCKED':
      case 'OVERDUE':
      case 'UNDER_ANALISYS':
      case 'STARTED': {
        console.log(`Hotmart: terminal/informational status "${purchaseStatus}" — no action taken`)
        break
      }

      default: {
        console.log('Unhandled Hotmart effective/status/event:', effectiveStatus, purchaseStatus, event)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Hotmart webhook fatal error:', err)
    // Always 200 — prevents Hotmart from deactivating the webhook
    return new Response(JSON.stringify({ received: true, error: String(err) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
