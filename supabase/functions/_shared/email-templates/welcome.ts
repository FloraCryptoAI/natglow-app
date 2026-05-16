import { baseLayout, btn, h1 } from './base.ts'

export function welcomeTemplate(locale: string, data: { email?: string; magic_link?: string }): { subject: string; html: string } {
  const isEs   = locale.startsWith('es')
  const ctaUrl = data.magic_link ?? 'https://app.natglow.app/HairDashboard'

  const subject = isEs
    ? '¡Bienvenida a NatGlow! Tu viaje hacia el cabello natural perfecto comienza hoy 🌿'
    : 'Welcome to NatGlow — your natural hair journey starts today 🌿'

  const content = isEs ? `
    ${h1('¡Bienvenida a NatGlow! 🌿')}
    <p style="margin:2px 0 22px;font-size:14px;color:#FB45A9;font-weight:600;letter-spacing:0.01em">Estamos muy felices de tenerte aquí.</p>

    <p style="margin:0 0 18px;font-size:15px;color:#57534e;line-height:1.75">
      Tu decisión de cuidar tu cabello de forma natural es un gesto de amor propio que merece cada atención. Desde hoy, tienes un <strong style="color:#1c1917">plan personalizado de 84 días</strong> construido especialmente para ti — y estaremos contigo en cada etapa del camino.
    </p>

    <div style="background:#fdf2f8;border-left:4px solid #FB45A9;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 18px">
      <p style="margin:0;font-size:14px;color:#9d174d;font-weight:700;line-height:1.6">
        ✨ Tu plan ya está listo y esperándote.
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#be185d;line-height:1.6;font-weight:400">
        Recetas naturales, rutinas semanales y todo el apoyo que necesitas para transformar tu cabello — en un solo lugar.
      </p>
    </div>

    <p style="margin:0 0 26px;font-size:15px;color:#57534e;line-height:1.75">
      Ya sea que estés comenzando tu jornada natural o reencontrándote con tus raíces, NatGlow estará aquí para guiarte, inspirarte y celebrar cada pequeño progreso contigo. No estás sola en esto.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td align="center">
        ${btn('Comenzar Mi Viaje →', ctaUrl)}
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.7;text-align:center">
      Con amor y cuidado,<br/>
      <strong style="color:#78716c;font-size:14px">El equipo NatGlow 🌿</strong>
    </p>
  ` : `
    ${h1('Welcome to NatGlow! 🌿')}
    <p style="margin:2px 0 22px;font-size:14px;color:#FB45A9;font-weight:600;letter-spacing:0.01em">We're so glad you're here.</p>

    <p style="margin:0 0 18px;font-size:15px;color:#57534e;line-height:1.75">
      Choosing to care for your hair naturally is one of the most loving things you can do for yourself. Starting today, you have a <strong style="color:#1c1917">personalised 84-day plan</strong> built just for you — and we'll be right here with you every step of the way.
    </p>

    <div style="background:#fdf2f8;border-left:4px solid #FB45A9;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 18px">
      <p style="margin:0;font-size:14px;color:#9d174d;font-weight:700;line-height:1.6">
        ✨ Your plan is ready and waiting for you.
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#be185d;line-height:1.6;font-weight:400">
        Natural recipes, weekly routines and all the support you need to transform your hair — all in one place.
      </p>
    </div>

    <p style="margin:0 0 26px;font-size:15px;color:#57534e;line-height:1.75">
      Whether you're just beginning your natural journey or finding your way back to your roots, NatGlow will be here to guide you, inspire you and celebrate every small win along the way. You're not doing this alone.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td align="center">
        ${btn('Start My Journey →', ctaUrl)}
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.7;text-align:center">
      With love and care,<br/>
      <strong style="color:#78716c;font-size:14px">The NatGlow Team 🌿</strong>
    </p>
  `

  return { subject, html: baseLayout(content, isEs ? 'Tu plan personalizado de 84 días te está esperando' : 'Your personalised 84-day plan is ready and waiting') }
}
