import { baseLayout, btn, h1, p, divider, small } from './base.ts'

export function paymentSuccessTemplate(
  locale: string,
  data: { amount?: string; plan?: string; nextDate?: string; invoiceUrl?: string },
): { subject: string; html: string } {
  const isEs = locale.startsWith('es')
  const month = new Date().toLocaleDateString(isEs ? 'es' : 'en-US', { month: 'long', year: 'numeric' })

  const subject = isEs
    ? `Pago recibido — NatGlow ${month}`
    : `Payment received — NatGlow ${month}`

  const content = isEs ? `
    ${h1('Pago confirmado ✓')}
    ${p('Tu suscripción a NatGlow está activa. Aquí están los detalles de tu pago:')}
    ${divider()}
    <table style="width:100%">
      ${row('Monto', data.amount ?? 'Ver factura')}
      ${row('Plan', data.plan ?? 'Suscripción mensual')}
      ${data.nextDate ? row('Próximo cobro', data.nextDate) : ''}
    </table>
    ${divider()}
    ${data.invoiceUrl ? btn('Ver factura →', data.invoiceUrl) : ''}
    ${btn('Ir a NatGlow →', 'https://app.natglow.app/HairDashboard')}
    ${divider()}
    ${small('¿Problemas con tu pago? Escríbenos a <a href="mailto:support@natglow.app" style="color:#a8a29e">support@natglow.app</a>.')}
  ` : `
    ${h1('Payment confirmed ✓')}
    ${p('Your NatGlow subscription is active. Here are your payment details:')}
    ${divider()}
    <table style="width:100%">
      ${row('Amount', data.amount ?? 'See invoice')}
      ${row('Plan', data.plan ?? 'Monthly subscription')}
      ${data.nextDate ? row('Next charge', data.nextDate) : ''}
    </table>
    ${divider()}
    ${data.invoiceUrl ? btn('View invoice →', data.invoiceUrl) : ''}
    ${btn('Go to NatGlow →', 'https://app.natglow.app/HairDashboard')}
    ${divider()}
    ${small('Questions about your payment? Write to <a href="mailto:support@natglow.app" style="color:#a8a29e">support@natglow.app</a>.')}
  `

  return { subject, html: baseLayout(content) }
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#78716c;width:130px">${label}</td>
    <td style="padding:7px 0;font-size:13px;color:#1c1917;font-weight:600">${value}</td>
  </tr>`
}
