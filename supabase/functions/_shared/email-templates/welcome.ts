import { baseLayout, btn, h1 } from './base.ts'

export function welcomeTemplate(_locale: string, data: { email?: string; magic_link?: string; name?: string }): { subject: string; html: string } {
  const ctaUrl    = data.magic_link ?? 'https://app.natglow.app/HairDashboard'
  const firstName = data.name?.split(' ')[0] ?? ''

  const subject = '¡Tu compra de NatGlow fue confirmada! Accede ahora 🌿'

  const greeting = firstName
    ? `¡Bienvenida, ${firstName}! 🌿`
    : '¡Bienvenida a NatGlow! 🌿'

  const content = `
    ${h1(greeting)}
    <p style="margin:2px 0 22px;font-size:14px;color:#FB45A9;font-weight:600;letter-spacing:0.01em">
      Tu compra fue confirmada. Estamos muy felices de tenerte aquí.
    </p>

    <p style="margin:0 0 18px;font-size:15px;color:#57534e;line-height:1.75">
      Tu decisión de cuidar tu cabello de forma natural es un gesto de amor propio que merece cada atención. Desde hoy, tienes acceso completo a tu <strong style="color:#1c1917">plan personalizado de 84 días</strong> — construido especialmente para ti.
    </p>

    <div style="background:#fdf2f8;border-left:4px solid #FB45A9;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 18px">
      <p style="margin:0;font-size:14px;color:#9d174d;font-weight:700;line-height:1.6">
        ✨ Tu plan ya está listo y esperándote.
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#be185d;line-height:1.6;font-weight:400">
        Recetas naturales, rutinas semanales y todo el apoyo que necesitas para transformar tu cabello — en un solo lugar.
      </p>
    </div>

    <p style="margin:0 0 10px;font-size:14px;color:#57534e;line-height:1.7">
      Haz clic en el botón de abajo para acceder a tu cuenta ahora mismo. El enlace es válido por <strong style="color:#1c1917">24 horas</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td align="center">
        ${btn('Acceder a mi plan ahora →', ctaUrl)}
      </td></tr>
    </table>

    <p style="margin:0 0 16px;font-size:13px;color:#a8a29e;line-height:1.7;text-align:center">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
      <a href="${ctaUrl}" style="color:#FB45A9;word-break:break-all;font-size:12px">${ctaUrl}</a>
    </p>

    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.7;text-align:center">
      Con amor y cuidado,<br/>
      <strong style="color:#78716c;font-size:14px">El equipo NatGlow 🌿</strong>
    </p>
  `

  return {
    subject,
    html: baseLayout(content, 'Tu compra fue confirmada — accede a tu plan personalizado de 84 días'),
  }
}
