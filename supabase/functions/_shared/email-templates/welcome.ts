import { baseLayout, btn, h1, p, divider } from './base.ts'

export function welcomeTemplate(locale: string, data: { email?: string; magic_link?: string }): { subject: string; html: string } {
  const isEs   = locale.startsWith('es')
  const ctaUrl = data.magic_link ?? 'https://app.natglow.app/HairDashboard'

  const subject = isEs
    ? '¡Bienvenida a NatGlow! Tu camino hacia un cabello sano comienza ahora 🌿'
    : 'Welcome to NatGlow! Your hair journey starts now 🌿'

  const content = isEs ? `
    ${h1('¡Bienvenida a NatGlow! 🌿')}
    ${p('Estás a punto de transformar tu rutina capilar. Tu plan personalizado de 84 días ya te está esperando.')}
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1c1917">Tus próximos pasos:</p>
    <table style="width:100%;margin-bottom:8px">
      ${step('1', 'Instala la app', 'Toca el botón de compartir en Safari o el menú de Chrome → "Agregar a pantalla de inicio" para acceso rápido.')}
      ${step('2', 'Completa el quiz', 'Si no lo has hecho todavía, responde las preguntas sobre tu cabello para personalizar tu plan.')}
      ${step('3', 'Explora tus recetas', 'Encuentra recetas naturales curadas especialmente para tu tipo de cabello.')}
      ${step('4', 'Sigue tu progreso', 'Registra tus resultados semanalmente para ver tu transformación.')}
    </table>
    ${btn('Ir a NatGlow →', ctaUrl)}
  ` : `
    ${h1('Welcome to NatGlow! 🌿')}
    ${p('Your personalised 84-day hair care journey is ready and waiting. Here\'s how to get started:')}
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1c1917">Your next steps:</p>
    <table style="width:100%;margin-bottom:8px">
      ${step('1', 'Install the app', 'Tap the share button in Safari or Chrome\'s menu → "Add to Home Screen" for quick access.')}
      ${step('2', 'Complete the quiz', 'If you haven\'t already, answer the hair profile questions to personalise your plan.')}
      ${step('3', 'Explore your recipes', 'Browse natural hair care recipes curated for your hair type.')}
      ${step('4', 'Track your progress', 'Log your results weekly to see your transformation unfold.')}
    </table>
    ${btn('Go to NatGlow →', ctaUrl)}
  `

  return { subject, html: baseLayout(content, isEs ? 'Tu plan personalizado te está esperando' : 'Your personalised plan is ready') }
}

function step(num: string, title: string, desc: string): string {
  return `<tr>
    <td style="padding:8px 0;vertical-align:top;width:28px">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#FB45A9,#E03594);color:#fff;font-size:11px;font-weight:700">${num}</span>
    </td>
    <td style="padding:8px 0 8px 10px;vertical-align:top">
      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#1c1917">${title}</p>
      <p style="margin:0;font-size:13px;color:#78716c;line-height:1.5">${desc}</p>
    </td>
  </tr>`
}
