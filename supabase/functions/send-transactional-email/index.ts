import { welcomeTemplate }           from '../_shared/email-templates/welcome.ts'
import { paymentSuccessTemplate }     from '../_shared/email-templates/payment_success.ts'
import { purchaseRefundedTemplate }   from '../_shared/email-templates/purchase_refunded.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = 'NatGlow <hello@natglow.app>'

export type EmailTemplate =
  | 'welcome'
  | 'payment_success'
  | 'purchase_refunded'

export interface SendEmailParams {
  to:       string
  template: EmailTemplate
  locale?:  string
  data?:    Record<string, string | undefined>
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not configured' }

  const locale = params.locale ?? 'es'
  const data   = params.data   ?? {}

  let subject: string
  let html:    string

  switch (params.template) {
    case 'welcome':
      ;({ subject, html } = welcomeTemplate(locale, data))
      break
    case 'payment_success':
      ;({ subject, html } = paymentSuccessTemplate(locale, data))
      break
    case 'purchase_refunded':
      ;({ subject, html } = purchaseRefundedTemplate(locale, data))
      break
    default:
      return { ok: false, error: `Unknown template: ${params.template}` }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      params.to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Resend error ${res.status}: ${body}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch failed' }
  }
}

// HTTP entry point when deployed as a standalone function
if (import.meta.main) {
  Deno.serve(async (req) => {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }
    try {
      const params: SendEmailParams = await req.json()
      if (!params.to || !params.template) {
        return new Response(JSON.stringify({ error: 'to and template are required' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        })
      }
      const result = await sendTransactionalEmail(params)
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'error' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }
  })
}
