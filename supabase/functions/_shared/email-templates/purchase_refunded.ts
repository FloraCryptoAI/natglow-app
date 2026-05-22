import { baseLayout, btn, h1 } from './base.ts'

export function purchaseRefundedTemplate(_locale: string, _data: Record<string, string | undefined>): { subject: string; html: string } {
  const subject = 'Tu reembolso de NatGlow ha sido procesado ✅'

  const content = `
    ${h1('Reembolso procesado ✅')}
    <p style="margin:2px 0 22px;font-size:14px;color:#FB45A9;font-weight:600;letter-spacing:0.01em">
      Hemos recibido tu solicitud.
    </p>

    <p style="margin:0 0 18px;font-size:15px;color:#57534e;line-height:1.75">
      Tu reembolso ha sido procesado exitosamente. El valor de tu compra será devuelto al método de pago original en un plazo de <strong style="color:#1c1917">5 a 10 días hábiles</strong>, dependiendo de tu banco o emisor de tarjeta.
    </p>

    <div style="background:#fef9f0;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 18px">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:700;line-height:1.6">
        ¿Tienes alguna duda?
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#b45309;line-height:1.6;font-weight:400">
        Si no ves el reembolso en el plazo indicado, contáctanos en
        <a href="https://app.natglow.app/contact" style="color:#FB45A9;font-weight:700;text-decoration:none">app.natglow.app/contact</a>
        y te ayudamos enseguida.
      </p>
    </div>

    <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.75">
      Lamentamos que la experiencia no haya sido la que esperabas. Si en algún momento deseas volver, estaremos aquí para darte la bienvenida de nuevo.
    </p>

    <p style="margin:0;font-size:13px;color:#a8a29e;line-height:1.7;text-align:center">
      Con cariño,<br/>
      <strong style="color:#78716c;font-size:14px">El equipo NatGlow 🌿</strong>
    </p>
  `

  return {
    subject,
    html: baseLayout(content, 'Tu reembolso ha sido procesado exitosamente'),
  }
}
