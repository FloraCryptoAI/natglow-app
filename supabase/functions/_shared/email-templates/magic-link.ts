import { baseLayout, btn, h1 } from './base.ts'

export function magicLinkTemplate(locale: string, data: { magic_link: string }): { subject: string; html: string } {
  const isEs = locale.startsWith('es')

  const subject = isEs ? 'Tu enlace de acceso a NatGlow' : 'Your NatGlow login link'

  const content = isEs ? `
    ${h1('Tu enlace de acceso 🔑')}
    <p style="margin:6px 0 24px;font-size:14px;color:#78716c;line-height:1.7">
      Haz clic en el botón de abajo para entrar a NatGlow.<br/>
      Este enlace expira en <strong style="color:#1c1917">1 hora</strong> y solo puede usarse una vez.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td align="center">
        ${btn('Entrar a NatGlow →', data.magic_link)}
      </td></tr>
    </table>

    <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;text-align:center">
      Si no solicitaste este enlace, puedes ignorar este correo.<br/>
      Nunca compartas este enlace con nadie.
    </p>
  ` : `
    ${h1('Your login link 🔑')}
    <p style="margin:6px 0 24px;font-size:14px;color:#78716c;line-height:1.7">
      Click the button below to log in to NatGlow.<br/>
      This link expires in <strong style="color:#1c1917">1 hour</strong> and can only be used once.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td align="center">
        ${btn('Enter NatGlow →', data.magic_link)}
      </td></tr>
    </table>

    <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;text-align:center">
      If you didn't request this, you can safely ignore this email.<br/>
      Never share this link with anyone.
    </p>
  `

  return { subject, html: baseLayout(content, isEs ? 'Tu enlace para entrar al app' : 'Your link to enter the app') }
}
