import { baseLayout, btn, h1, p, divider, small } from './base.ts'

export function subscriptionCanceledTemplate(
  locale: string,
  data: { accessUntil?: string },
): { subject: string; html: string } {
  const isEs = locale.startsWith('es')

  const subject = isEs
    ? 'Tu suscripción a NatGlow ha sido cancelada 💔'
    : 'Your NatGlow subscription has been cancelled 💔'

  const content = isEs ? `
    ${h1('Lo sentimos verte partir 💔')}
    ${p('Tu suscripción a NatGlow ha sido cancelada correctamente.')}
    ${data.accessUntil ? `<div style="margin:16px 0;padding:14px 16px;background:#fafaf9;border-radius:10px;border:1px solid #e7e5e4">
      <p style="margin:0;font-size:14px;color:#57534e">Conservas acceso completo a NatGlow hasta el <strong style="color:#1c1917">${data.accessUntil}</strong>.</p>
    </div>` : ''}
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1c1917">Antes de irte, ¿podría ser que…?</p>
    ${p('Si tuviste un problema técnico, dificultades de pago o el servicio no cumplió tus expectativas, nos encantaría saberlo. Tu opinión nos ayuda a mejorar.')}
    ${btn('Cuéntanos qué pasó', 'https://app.natglow.app/contact')}
    ${divider()}
    <p style="margin:0 0 6px;font-size:13px;color:#78716c">Si algún día quieres volver, estaremos aquí:</p>
    ${btn('Volver a NatGlow →', 'https://app.natglow.app/quiz')}
    ${divider()}
    ${small('¿Tienes preguntas sobre tu facturación o necesitas ayuda? Escríbenos a <a href="mailto:support@natglow.app" style="color:#a8a29e">support@natglow.app</a>.')}
  ` : `
    ${h1('We\'re sorry to see you go 💔')}
    ${p('Your NatGlow subscription has been successfully cancelled.')}
    ${data.accessUntil ? `<div style="margin:16px 0;padding:14px 16px;background:#fafaf9;border-radius:10px;border:1px solid #e7e5e4">
      <p style="margin:0;font-size:14px;color:#57534e">You retain full access to NatGlow until <strong style="color:#1c1917">${data.accessUntil}</strong>.</p>
    </div>` : ''}
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1c1917">Before you go — could it be that…?</p>
    ${p('If you experienced a technical issue, payment difficulty, or the service didn\'t meet your expectations, we\'d love to hear about it. Your feedback helps us improve.')}
    ${btn('Tell us what happened', 'https://app.natglow.app/contact')}
    ${divider()}
    <p style="margin:0 0 6px;font-size:13px;color:#78716c">If you ever want to come back, we\'ll be here:</p>
    ${btn('Return to NatGlow →', 'https://app.natglow.app/quiz')}
    ${divider()}
    ${small('Questions about your billing or need help? Write to <a href="mailto:support@natglow.app" style="color:#a8a29e">support@natglow.app</a>.')}
  `

  return { subject, html: baseLayout(content) }
}
