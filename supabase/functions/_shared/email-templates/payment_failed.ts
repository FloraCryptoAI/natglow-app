import { baseLayout, btn, h1, p, divider, small } from './base.ts'

export function paymentFailedTemplate(
  locale: string,
  data: { updateUrl?: string },
): { subject: string; html: string } {
  const isEs = locale.startsWith('es')

  const subject = isEs
    ? 'Acción requerida: actualiza tu método de pago — NatGlow'
    : 'Action required: Update your payment method — NatGlow'

  const content = isEs ? `
    ${h1('Tu pago no pudo procesarse')}
    ${p('Hubo un problema al renovar tu suscripción a NatGlow. Por favor, actualiza tu método de pago para no perder el acceso.')}
    <div style="margin:20px 0;padding:16px;background:#fff5f5;border-radius:10px;border:1px solid #fecaca">
      <p style="margin:0;font-size:14px;color:#ef4444;font-weight:600">⚠ Tu acceso puede suspenderse en los próximos 3 días si no se actualiza el pago.</p>
    </div>
    ${divider()}
    ${btn('Actualizar método de pago →', data.updateUrl ?? 'https://app.natglow.app/HairSettings')}
    ${divider()}
    ${p('Si crees que esto es un error o necesitas ayuda, responde este correo o escríbenos a <a href="mailto:support@natglow.app" style="color:#FB45A9">support@natglow.app</a>.')}
    ${small('Estamos aquí para ayudarte.')}
  ` : `
    ${h1('Your payment could not be processed')}
    ${p('There was a problem renewing your NatGlow subscription. Please update your payment method to avoid losing access.')}
    <div style="margin:20px 0;padding:16px;background:#fff5f5;border-radius:10px;border:1px solid #fecaca">
      <p style="margin:0;font-size:14px;color:#ef4444;font-weight:600">⚠ Your access may be suspended within the next 3 days if payment is not updated.</p>
    </div>
    ${divider()}
    ${btn('Update payment method →', data.updateUrl ?? 'https://app.natglow.app/HairSettings')}
    ${divider()}
    ${p('If you think this is an error or need help, reply to this email or write to <a href="mailto:support@natglow.app" style="color:#FB45A9">support@natglow.app</a>.')}
    ${small('We\'re here to help.')}
  `

  return { subject, html: baseLayout(content) }
}
