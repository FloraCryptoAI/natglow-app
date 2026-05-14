export function baseLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>NatGlow</title>
  ${preheader ? `<div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>` : ''}
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr><td style="padding-bottom:24px;text-align:center">
          <span style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#FB45A9,#E03594);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#FB45A9">
            NatGlow
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e7e5e4;padding:32px 28px">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center">
          <p style="font-size:11px;color:#a8a29e;margin:0 0 8px">
            © ${new Date().getFullYear()} NatGlow. All rights reserved.
          </p>
          <p style="font-size:11px;color:#a8a29e;margin:0">
            <a href="https://app.natglow.app/privacy" style="color:#a8a29e">Privacy Policy</a>
            &nbsp;·&nbsp;
            <a href="https://app.natglow.app/terms" style="color:#a8a29e">Terms</a>
            &nbsp;·&nbsp;
            <a href="https://app.natglow.app/contact" style="color:#a8a29e">Support</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#FB45A9,#E03594);color:#ffffff;font-weight:700;font-size:14px;border-radius:9999px;text-decoration:none;margin-top:20px">${label}</a>`
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1c1917;line-height:1.3">${text}</h1>`
}

export function p(text: string): string {
  return `<p style="margin:12px 0;font-size:15px;color:#57534e;line-height:1.6">${text}</p>`
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0"/>`
}

export function small(text: string): string {
  return `<p style="margin:8px 0;font-size:12px;color:#a8a29e;line-height:1.5">${text}</p>`
}
