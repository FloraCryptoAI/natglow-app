import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT_EMAIL = 'support@natglow.app'

const EN = {
  disclaimer: 'This document was drafted with AI assistance as an initial version. We recommend seeking legal counsel to verify its suitability for your specific jurisdiction.',
  title: 'Refund Policy',
  lastUpdated: 'Last updated: May 10, 2026',
  sections: [
    {
      heading: '1. Satisfaction Guarantee',
      body: 'We stand behind the quality of NatGlow. If you are not fully satisfied with your initial subscription, we offer a full refund within the first 7 (seven) days of your first payment. This guarantee applies to new subscribers only and covers the initial subscription charge.',
    },
    {
      heading: '2. How to Request a Refund',
      body: [
        'Send an email to ' + CONTACT_EMAIL + ' within 7 days of your first charge.',
        'Include the subject line: "Refund Request — [your email address]".',
        'Briefly describe the reason for your request (optional, but helps us improve).',
        'We will confirm receipt of your request and process the refund if you are within the eligible period.',
      ],
    },
    {
      heading: '3. Processing Time',
      body: 'Approved refunds are processed within 5–10 business days. The credit will appear on your original payment method statement within the timeframe set by your bank or card issuer, which may vary.',
    },
    {
      heading: '4. Monthly Renewals',
      body: 'After the initial 7-day guarantee period, recurring monthly charges are non-refundable. However, you may cancel your subscription at any time and you will retain full access to the Service until the end of your current paid billing period. You will not be charged for subsequent months after cancellation.',
    },
    {
      heading: '5. Non-Eligible Cases',
      body: [
        'Refund requests submitted after the 7-day guarantee window.',
        'Recurring monthly renewal charges (beyond the first payment).',
        'Accounts found to have violated our Terms of Service.',
        'Cases where fraudulent activity is suspected.',
        'Chargebacks filed with your bank or card issuer without first contacting us — initiating a chargeback may result in immediate account suspension.',
        'Multiple accounts created to exploit the guarantee period more than once.',
      ],
    },
    {
      heading: '6. Contact',
      body: 'For any questions about this policy, please contact us at ' + CONTACT_EMAIL + '. We aim to respond within 24 hours on business days.',
    },
  ],
}

const ES = {
  disclaimer: 'Este documento fue redactado con asistencia de IA como versión inicial. Recomendamos consultar asesoría legal para verificar su adecuación a su jurisdicción específica.',
  title: 'Política de Reembolsos',
  lastUpdated: 'Última actualización: 10 de mayo de 2026',
  sections: [
    {
      heading: '1. Garantía de Satisfacción',
      body: 'Respaldamos la calidad de NatGlow. Si no está completamente satisfecha con su suscripción inicial, ofrecemos un reembolso completo dentro de los primeros 7 (siete) días de su primer pago. Esta garantía aplica únicamente a nuevas suscriptoras y cubre el cargo inicial de suscripción.',
    },
    {
      heading: '2. Cómo Solicitar un Reembolso',
      body: [
        'Envíe un correo a ' + CONTACT_EMAIL + ' dentro de los 7 días de su primer cargo.',
        'Incluya el asunto: "Solicitud de Reembolso — [su correo electrónico]".',
        'Describa brevemente el motivo de su solicitud (opcional, pero nos ayuda a mejorar).',
        'Confirmaremos la recepción de su solicitud y procesaremos el reembolso si está dentro del período elegible.',
      ],
    },
    {
      heading: '3. Tiempo de Procesamiento',
      body: 'Los reembolsos aprobados se procesan en un plazo de 5 a 10 días hábiles. El crédito aparecerá en su método de pago original en el plazo establecido por su banco o emisor de tarjeta, que puede variar.',
    },
    {
      heading: '4. Renovaciones Mensuales',
      body: 'Tras el período de garantía inicial de 7 días, los cargos mensuales recurrentes no son reembolsables. Sin embargo, puede cancelar su suscripción en cualquier momento y conservará el acceso completo al Servicio hasta el final de su período de facturación pagado. No se realizarán cargos en meses posteriores a la cancelación.',
    },
    {
      heading: '5. Casos No Elegibles',
      body: [
        'Solicitudes de reembolso presentadas después de los 7 días de garantía.',
        'Cargos de renovación mensual recurrentes (más allá del primer pago).',
        'Cuentas que hayan violado nuestros Términos de Servicio.',
        'Casos en los que se sospeche actividad fraudulenta.',
        'Contracargos presentados ante su banco o emisor de tarjeta sin contactarnos previamente — iniciar un contracargo puede resultar en la suspensión inmediata de la cuenta.',
        'Cuentas múltiples creadas para aprovechar el período de garantía más de una vez.',
      ],
    },
    {
      heading: '6. Contacto',
      body: 'Para cualquier pregunta sobre esta política, contáctenos en ' + CONTACT_EMAIL + '. Respondemos en un plazo de 24 horas en días hábiles.',
    },
  ],
}

export default function Refund() {
  const { i18n } = useTranslation()
  const content = i18n.language?.startsWith('es') ? ES : EN

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          NatGlow
        </Link>

        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 leading-relaxed">
          {content.disclaimer}
        </div>

        <div className="mb-6 px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl text-sm text-pink-700 font-medium">
          {i18n.language?.startsWith('es')
            ? '✓ Garantía de satisfacción completa en los primeros 7 días'
            : '✓ Full satisfaction guarantee within the first 7 days'}
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
