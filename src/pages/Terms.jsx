import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT_EMAIL = 'support@natglow.app'

// Project is 100% Spanish (LATAM). English block removed.
// Business model: single payment via Hotmart ($17), lifetime access.
// No monthly subscription, no recurring charges, no Stripe.
const ES = {
  disclaimer: 'Este documento fue redactado con asistencia de IA como versión inicial. Recomendamos consultar asesoría legal para verificar su adecuación a su jurisdicción específica.',
  title: 'Términos de Servicio',
  lastUpdated: 'Última actualización: 23 de junio de 2026',
  sections: [
    {
      heading: '1. Aceptación de los Términos',
      body: 'Al acceder o usar NatGlow ("el Servicio"), usted acepta quedar vinculada por estos Términos de Servicio. Si no está de acuerdo, no use el Servicio. El uso continuo después de cualquier actualización constituye aceptación de los Términos revisados.',
    },
    {
      heading: '2. Descripción del Servicio',
      body: 'NatGlow es un servicio digital que ofrece rutinas personalizadas de cuidado capilar natural, recetas, planes y contenido educativo. El acceso se otorga mediante un pago único realizado a través de Hotmart, sin suscripción ni cobros recurrentes.',
    },
    {
      heading: '3. Edad Mínima',
      body: 'El Servicio está destinado exclusivamente a usuarias mayores de 18 (dieciocho) años. Al usar NatGlow, usted confirma que cumple este requisito de edad. Nos reservamos el derecho de cancelar cuentas pertenecientes a menores.',
    },
    {
      heading: '4. Cuenta y Responsabilidades',
      body: [
        'Usted es responsable de mantener la confidencialidad de las credenciales de su cuenta.',
        'Debe proporcionar información precisa y actualizada al registrarse.',
        'Es responsable de toda actividad realizada bajo su cuenta.',
        'Debe notificarnos inmediatamente a ' + CONTACT_EMAIL + ' si sospecha de acceso no autorizado.',
        'Las cuentas son personales e intransferibles. Compartir su cuenta con terceros está prohibido.',
      ],
    },
    {
      heading: '5. Pago y Acceso',
      body: [
        'El acceso a NatGlow se obtiene mediante un único pago, procesado en dólares estadounidenses (USD) a través de Hotmart.',
        'No existe suscripción mensual, anual ni cobros recurrentes. Tu pago es único.',
        'Una vez confirmado el pago, recibes acceso VITALICIO al contenido disponible al momento de la compra.',
        'Hotmart procesa el pago de forma segura. NatGlow no almacena datos de tarjeta de crédito.',
        'Los precios pueden cambiar para nuevas compradoras sin previo aviso, pero esto no afecta a quienes ya hayan comprado.',
      ],
    },
    {
      heading: '6. Reembolsos',
      body: 'Ofrecemos una garantía de satisfacción de 7 días desde la fecha de compra. Si no quedas conforme dentro de ese plazo, te devolvemos el 100% del valor pagado, sin necesidad de justificación. Después de los 7 días no se procesan reembolsos. Consulta nuestra Política de Reembolsos para más detalles.',
    },
    {
      heading: '7. Propiedad Intelectual',
      body: 'Todo el contenido del Servicio — recetas, planes, textos, imágenes, marca, código — es propiedad de NatGlow o está licenciado a NatGlow. Se otorga una licencia personal, no exclusiva e intransferible para uso individual. Está prohibida la reproducción, distribución o comercialización del contenido sin autorización por escrito.',
    },
    {
      heading: '8. Uso Aceptable',
      body: [
        'No utilice el Servicio para fines ilegales o no autorizados.',
        'No intente acceder al sistema mediante medios automatizados, scraping o ingeniería inversa.',
        'No comparta el contenido con terceros que no hayan adquirido el Servicio.',
        'No use el Servicio para crear productos competidores.',
        'Nos reservamos el derecho de suspender cuentas que violen estas reglas.',
      ],
    },
    {
      heading: '9. Naturaleza del Contenido',
      body: 'El contenido de NatGlow tiene fines educativos basados en principios de cuidado capilar natural. No constituye consejo médico ni dermatológico. Los resultados individuales varían. Recomendamos consultar a un profesional de la salud antes de aplicar cualquier ingrediente si tiene alergias conocidas, condiciones del cuero cabelludo o cualquier preocupación médica.',
    },
    {
      heading: '10. Limitación de Responsabilidad',
      body: 'NatGlow proporciona el Servicio "tal como está". En la máxima medida permitida por la ley aplicable, no seremos responsables por daños indirectos, incidentales o consecuentes derivados del uso del Servicio, incluyendo pero no limitado a reacciones alérgicas a ingredientes aplicados según las recetas. La responsabilidad máxima de NatGlow frente a usted nunca excederá el monto efectivamente pagado por el Servicio.',
    },
    {
      heading: '11. Modificaciones al Servicio',
      body: 'Podemos actualizar, modificar o discontinuar funciones del Servicio en cualquier momento. Cuando una modificación afecte materialmente derechos adquiridos por compradoras existentes, comunicaremos los cambios con antelación razonable.',
    },
    {
      heading: '12. Ley Aplicable',
      body: 'Estos Términos se rigen por las leyes aplicables a la jurisdicción del operador del Servicio. Cualquier disputa será sometida a los tribunales competentes en esa jurisdicción, salvo cuando la ley del consumidor proteja sus derechos en su país de residencia.',
    },
    {
      heading: '13. Contacto',
      body: 'Si tiene preguntas sobre estos Términos o necesita ayuda, contáctenos en ' + CONTACT_EMAIL + '.',
    },
  ],
}

export default function Terms() {
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
