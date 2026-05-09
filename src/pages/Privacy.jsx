import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT_EMAIL = 'contact@natglow.app'

const EN = {
  disclaimer: 'This document is an initial version and may be revised by legal counsel in the future.',
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: May 2026',
  sections: [
    {
      heading: '1. Who We Are',
      body: 'NatGlow ("we", "us", or "our") operates the app available at app.natglow.app. We are committed to protecting your personal data and respecting your privacy.',
    },
    {
      heading: '2. Data We Collect',
      body: [
        'Email address — provided when you purchase a subscription.',
        'Quiz answers — hair type, concerns, and preferences entered during the quiz flow.',
        'Payment information — processed securely by Stripe. We do not store full card numbers.',
        'Usage data — pages visited, actions taken, and time spent in the app (via analytics cookies, if consented).',
        'Device and browser information — IP address, browser type, and device identifiers used for analytics and security.',
      ],
    },
    {
      heading: '3. How We Use Your Data',
      body: [
        'Provide and personalise the NatGlow service.',
        'Process payments and manage subscriptions.',
        'Send transactional emails (login links, subscription updates).',
        'Improve our product through aggregated, anonymised analytics.',
        'Measure the effectiveness of our marketing campaigns (Facebook and TikTok advertising), only if you have consented to analytics cookies.',
      ],
    },
    {
      heading: '4. Cookies and Tracking',
      body: 'We use cookies and similar technologies for session management, analytics, and advertising. Analytics and advertising cookies (such as the Facebook Pixel and TikTok Pixel) are only loaded after you give explicit consent. You may withdraw consent at any time by clicking "Reject" on the cookie banner or by contacting us.',
    },
    {
      heading: '5. Third-Party Services',
      body: [
        'Stripe — payment processing (stripe.com/privacy)',
        'Supabase — database and authentication (supabase.com/privacy)',
        'Meta (Facebook) — advertising analytics, subject to your consent',
        'TikTok — advertising analytics, subject to your consent',
        'Vercel — application hosting (vercel.com/legal/privacy-policy)',
      ],
    },
    {
      heading: '6. Data Retention',
      body: 'We retain your personal data for as long as your account is active. If you cancel your subscription, we retain your data for up to 12 months before deletion. Aggregated, anonymised analytics data may be retained indefinitely.',
    },
    {
      heading: '7. Your Rights',
      body: [
        'Access — request a copy of the data we hold about you.',
        'Correction — ask us to correct inaccurate data.',
        'Deletion — request erasure of your personal data.',
        'Objection — object to processing for marketing purposes.',
        'Portability — receive your data in a structured, machine-readable format.',
      ],
    },
    {
      heading: '8. Minimum Age',
      body: 'NatGlow is intended for users aged 18 and over. We do not knowingly collect data from minors.',
    },
    {
      heading: '9. Server Location',
      body: 'Your data is stored on servers located in the United States (Supabase) and may be processed by our third-party providers in other jurisdictions.',
    },
    {
      heading: '10. Contact',
      body: `If you have questions about this policy or wish to exercise your rights, please contact us at ${CONTACT_EMAIL}.`,
    },
  ],
}

const ES = {
  disclaimer: 'Este documento es una versión inicial y puede ser revisada por asesoría legal en el futuro.',
  title: 'Política de Privacidad',
  lastUpdated: 'Última actualización: mayo de 2026',
  sections: [
    {
      heading: '1. Quiénes somos',
      body: 'NatGlow ("nosotros" o "nuestro") opera la app disponible en app.natglow.app. Nos comprometemos a proteger sus datos personales y respetar su privacidad.',
    },
    {
      heading: '2. Datos que recopilamos',
      body: [
        'Correo electrónico — proporcionado al contratar una suscripción.',
        'Respuestas del quiz — tipo de cabello, preocupaciones y preferencias ingresadas durante el quiz.',
        'Datos de pago — procesados de forma segura por Stripe. No almacenamos números de tarjeta completos.',
        'Datos de uso — páginas visitadas, acciones realizadas y tiempo en la app (mediante cookies de analítica, si ha dado su consentimiento).',
        'Información de dispositivo y navegador — dirección IP, tipo de navegador e identificadores de dispositivo usados para analítica y seguridad.',
      ],
    },
    {
      heading: '3. Cómo usamos sus datos',
      body: [
        'Proveer y personalizar el servicio NatGlow.',
        'Procesar pagos y gestionar suscripciones.',
        'Enviar correos transaccionales (enlaces de acceso, actualizaciones de suscripción).',
        'Mejorar nuestro producto mediante analítica agregada y anonimizada.',
        'Medir la efectividad de nuestras campañas de marketing (publicidad en Facebook y TikTok), solo si ha dado su consentimiento para cookies de analítica.',
      ],
    },
    {
      heading: '4. Cookies y seguimiento',
      body: 'Utilizamos cookies y tecnologías similares para gestión de sesión, analítica y publicidad. Las cookies de analítica y publicidad (como el Facebook Pixel y el TikTok Pixel) solo se cargan tras otorgar su consentimiento explícito. Puede revocar el consentimiento en cualquier momento haciendo clic en "Rechazar" en el banner de cookies o contactándonos.',
    },
    {
      heading: '5. Servicios de terceros',
      body: [
        'Stripe — procesamiento de pagos (stripe.com/privacy)',
        'Supabase — base de datos y autenticación (supabase.com/privacy)',
        'Meta (Facebook) — analítica publicitaria, sujeto a su consentimiento',
        'TikTok — analítica publicitaria, sujeto a su consentimiento',
        'Vercel — hospedaje de la aplicación (vercel.com/legal/privacy-policy)',
      ],
    },
    {
      heading: '6. Retención de datos',
      body: 'Conservamos sus datos mientras su cuenta esté activa. Si cancela su suscripción, los retenemos hasta 12 meses antes de eliminarlos. Los datos de analítica agregados y anonimizados pueden conservarse indefinidamente.',
    },
    {
      heading: '7. Sus derechos',
      body: [
        'Acceso — solicitar una copia de los datos que tenemos sobre usted.',
        'Corrección — pedirnos que corrija datos inexactos.',
        'Eliminación — solicitar el borrado de sus datos personales.',
        'Oposición — oponerse al tratamiento con fines de marketing.',
        'Portabilidad — recibir sus datos en formato estructurado y legible por máquina.',
      ],
    },
    {
      heading: '8. Edad mínima',
      body: 'NatGlow está destinado a mayores de 18 años. No recopilamos datos de menores de manera intencional.',
    },
    {
      heading: '9. Ubicación de servidores',
      body: 'Sus datos se almacenan en servidores ubicados en Estados Unidos (Supabase) y pueden ser procesados por nuestros proveedores en otras jurisdicciones.',
    },
    {
      heading: '10. Contacto',
      body: `Si tiene preguntas sobre esta política o desea ejercer sus derechos, contáctenos en ${CONTACT_EMAIL}.`,
    },
  ],
}

export default function Privacy() {
  const { i18n } = useTranslation()
  const content = i18n.language?.startsWith('es') ? ES : EN

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          NatGlow
        </Link>

        {/* Disclaimer */}
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 leading-relaxed">
          {content.disclaimer}
        </div>

        <h1 className="text-2xl font-bold text-stone-900 mb-1">{content.title}</h1>
        <p className="text-sm text-stone-400 mb-10">{content.lastUpdated}</p>

        <div className="space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold text-stone-800 mb-2">{section.heading}</h2>
              {Array.isArray(section.body) ? (
                <ul className="space-y-1.5 list-disc list-inside">
                  {section.body.map((item, i) => (
                    <li key={i} className="text-sm text-stone-600 leading-relaxed">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-600 leading-relaxed">{section.body}</p>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-stone-300 text-center">© {new Date().getFullYear()} NatGlow</p>
      </div>
    </div>
  )
}
