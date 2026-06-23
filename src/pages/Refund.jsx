import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT_EMAIL = 'support@natglow.app'

// Project is 100% Spanish (LATAM). English block removed.
// Single payment via Hotmart — no monthly renewals, no recurring charges.
// 7-day satisfaction guarantee processed through Hotmart.
const ES = {
  disclaimer: 'Este documento fue redactado con asistencia de IA como versión inicial. Recomendamos consultar asesoría legal para verificar su adecuación a su jurisdicción específica.',
  title: 'Política de Reembolsos',
  lastUpdated: 'Última actualización: 23 de junio de 2026',
  sections: [
    {
      heading: '1. Garantía de Satisfacción',
      body: 'Respaldamos la calidad de NatGlow. Si no estás completamente satisfecha con tu compra, ofrecemos un reembolso COMPLETO del 100% dentro de los primeros 7 (siete) días desde la fecha de pago, sin necesidad de justificación. Como NatGlow es un pago único (sin suscripción), basta con que solicites el reembolso dentro de ese plazo.',
    },
    {
      heading: '2. Cómo Solicitar un Reembolso',
      body: [
        'Envía un correo a ' + CONTACT_EMAIL + ' dentro de los 7 días posteriores a tu compra.',
        'Incluye el asunto: "Solicitud de Reembolso — [tu correo de compra]".',
        'Describe brevemente el motivo (opcional, pero nos ayuda a mejorar).',
        'Confirmaremos la recepción y procesaremos la solicitud si está dentro del plazo elegible.',
        'Alternativamente, puedes solicitar el reembolso directamente desde tu cuenta de Hotmart, en la sección "Mis compras", también dentro de los 7 días.',
      ],
    },
    {
      heading: '3. Tiempo de Procesamiento',
      body: 'Los reembolsos aprobados son procesados directamente por Hotmart en un plazo de 5 a 10 días hábiles. El crédito aparecerá en tu método de pago original en el plazo establecido por tu banco o emisor de tarjeta, que puede variar.',
    },
    {
      heading: '4. Pago Único — Sin Renovaciones',
      body: 'NatGlow es un pago único. No existen cobros mensuales, anuales ni recurrentes. Una vez transcurridos los 7 días de la garantía, el pago no es reembolsable, pero conservas acceso VITALICIO al contenido. No se cobrará nada más a tu método de pago.',
    },
    {
      heading: '5. Casos No Elegibles',
      body: [
        'Solicitudes de reembolso enviadas después de los 7 días desde la compra.',
        'Cuentas que hayan violado nuestros Términos de Servicio (compartir cuenta, distribuir contenido, etc.).',
        'Casos donde se detecte fraude o abuso de la garantía.',
        'Disputas (chargebacks) abiertas en el banco sin contactarnos primero — abrir una disputa puede resultar en suspensión inmediata de la cuenta.',
        'Múltiples cuentas creadas para abusar de la garantía más de una vez.',
      ],
    },
    {
      heading: '6. Contacto',
      body: 'Si tienes alguna pregunta sobre esta política, contáctanos en ' + CONTACT_EMAIL + '. Buscamos responder en menos de 24 horas en días hábiles.',
    },
  ],
}

export default function Refund() {
  const content = ES

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
          ✓ Garantía de satisfacción completa en los primeros 7 días
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

        <p className="mt-12 text-xs text-stone-300 text-center">© {new Date().getFullYear()} NatGlow. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}
