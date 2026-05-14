import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT_EMAIL = 'support@natglow.app'

const EN = {
  disclaimer: 'This document was drafted with AI assistance as an initial version. We recommend seeking legal counsel to verify its suitability for your specific jurisdiction.',
  title: 'Terms of Service',
  lastUpdated: 'Last updated: May 10, 2026',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: 'By accessing or using NatGlow ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. Continued use after any updates constitutes acceptance of the revised Terms.',
    },
    {
      heading: '2. Description of Service',
      body: 'NatGlow is a subscription-based digital service that provides personalised natural hair care routines, recipes, plans, and educational content. Access is granted through a monthly subscription billed in US dollars (USD) via Stripe.',
    },
    {
      heading: '3. Minimum Age',
      body: 'The Service is intended exclusively for users aged 18 (eighteen) years or older. By using NatGlow, you confirm that you meet this age requirement. We reserve the right to terminate accounts found to belong to minors.',
    },
    {
      heading: '4. Account and Responsibilities',
      body: [
        'You are responsible for maintaining the confidentiality of your account credentials.',
        'You must provide accurate and up-to-date information when registering.',
        'You are responsible for all activity that occurs under your account.',
        'You must notify us immediately at ' + CONTACT_EMAIL + ' if you suspect unauthorised access to your account.',
        'Accounts are personal and non-transferable. Sharing your account with third parties is prohibited.',
      ],
    },
    {
      heading: '5. Payment and Automatic Renewal',
      body: [
        'Subscriptions are billed monthly in advance in US dollars (USD) via Stripe.',
        'By subscribing, you authorise NatGlow to charge your payment method on a recurring monthly basis.',
        'Your subscription renews automatically at the end of each billing period unless you cancel before the renewal date.',
        'We reserve the right to change subscription prices with 30 (thirty) days\' advance notice by email. Continued use after the notice period constitutes acceptance of the new price.',
        'All payments are processed securely by Stripe. NatGlow does not store full card numbers.',
      ],
    },
    {
      heading: '6. Cancellation',
      body: 'You may cancel your subscription at any time through the account settings or by contacting ' + CONTACT_EMAIL + '. Upon cancellation, you retain access to the Service until the end of the current paid billing period. No partial refunds are issued for unused time within a billing period, except as described in our Refund Policy.',
    },
    {
      heading: '7. Intellectual Property',
      body: 'All content available through the Service — including but not limited to hair care routines, recipes, plans, texts, images, and the NatGlow name and logo — is the exclusive intellectual property of NatGlow and is protected by applicable copyright and intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to access and use the content solely for your personal, non-commercial purposes during your active subscription.',
    },
    {
      heading: '8. Prohibited Conduct',
      body: [
        'Reverse engineering, decompiling, or attempting to extract the source code of the Service.',
        'Scraping, crawling, or using automated means to access or collect data from the Service.',
        'Reproducing, distributing, publicly displaying, or creating derivative works from any NatGlow content without prior written permission.',
        'Using the Service for any unlawful purpose or in violation of any applicable law or regulation.',
        'Attempting to gain unauthorised access to any part of the Service or its infrastructure.',
        'Creating multiple accounts to circumvent account restrictions or abuse trial or guarantee periods.',
      ],
    },
    {
      heading: '9. Medical and Health Disclaimer',
      body: 'THE CONTENT PROVIDED THROUGH NATGLOW IS FOR EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY AND DOES NOT CONSTITUTE MEDICAL, DERMATOLOGICAL, OR PROFESSIONAL HEALTH ADVICE. NatGlow recipes, routines, and recommendations are not a substitute for professional medical or dermatological care. You should consult a qualified healthcare professional before applying any recipe or product, particularly if you have known skin conditions, allergies, scalp disorders, or any other health concerns. NatGlow assumes no responsibility for adverse reactions resulting from the use of suggested ingredients or routines.',
    },
    {
      heading: '10. Limitation of Liability',
      body: 'To the maximum extent permitted by applicable law, NatGlow shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of revenue, or personal injury arising from your use of the Service. NatGlow\'s total aggregate liability for any claim arising from these Terms shall not exceed the amount paid by you for the Service in the three months preceding the claim.',
    },
    {
      heading: '11. Applicable Law and Jurisdiction',
      body: 'These Terms shall be governed by and construed in accordance with the laws of the Federative Republic of Brazil. Any disputes arising from or related to these Terms shall be subject to the exclusive jurisdiction of the courts of the Comarca de São José dos Campos, State of São Paulo, Brazil, to which both parties irrevocably submit.',
    },
    {
      heading: '12. Modifications to Terms',
      body: 'These Terms may be updated at any time. The version in effect is always the one published on this page. Material changes will be communicated via email at least 30 (thirty) days before taking effect. Your continued use of the Service after the effective date of any change constitutes acceptance of the updated Terms. Note: this version is operated by a natural person ("NatGlow") and will be updated to reflect any future formalised legal entity structure.',
    },
    {
      heading: '13. Contact',
      body: 'If you have questions about these Terms or need assistance, please contact us at ' + CONTACT_EMAIL + '.',
    },
  ],
}

const ES = {
  disclaimer: 'Este documento fue redactado con asistencia de IA como versión inicial. Recomendamos consultar asesoría legal para verificar su adecuación a su jurisdicción específica.',
  title: 'Términos de Servicio',
  lastUpdated: 'Última actualización: 10 de mayo de 2026',
  sections: [
    {
      heading: '1. Aceptación de los Términos',
      body: 'Al acceder o utilizar NatGlow ("el Servicio"), usted acepta quedar vinculada por estos Términos de Servicio. Si no está de acuerdo, no utilice el Servicio. El uso continuado tras cualquier actualización implica la aceptación de los Términos revisados.',
    },
    {
      heading: '2. Descripción del Servicio',
      body: 'NatGlow es un servicio digital por suscripción que proporciona rutinas, recetas, planes y contenido educativo personalizado sobre el cuidado natural del cabello. El acceso se concede mediante una suscripción mensual facturada en dólares estadounidenses (USD) a través de Stripe.',
    },
    {
      heading: '3. Edad Mínima',
      body: 'El Servicio está destinado exclusivamente a personas mayores de 18 (dieciocho) años. Al usar NatGlow, confirma que cumple este requisito. Nos reservamos el derecho de cancelar cuentas que pertenezcan a menores.',
    },
    {
      heading: '4. Cuenta y Responsabilidades',
      body: [
        'Es responsable de mantener la confidencialidad de sus credenciales de acceso.',
        'Debe proporcionar información precisa y actualizada al registrarse.',
        'Es responsable de toda la actividad realizada bajo su cuenta.',
        'Debe notificarnos de inmediato en ' + CONTACT_EMAIL + ' si sospecha acceso no autorizado a su cuenta.',
        'Las cuentas son personales e intransferibles. Compartir su cuenta con terceros está prohibido.',
      ],
    },
    {
      heading: '5. Pago y Renovación Automática',
      body: [
        'Las suscripciones se facturan mensualmente por adelantado en dólares estadounidenses (USD) a través de Stripe.',
        'Al suscribirse, autoriza a NatGlow a cobrar su método de pago de forma mensual y recurrente.',
        'La suscripción se renueva automáticamente al final de cada período de facturación, a menos que la cancele antes de la fecha de renovación.',
        'Nos reservamos el derecho de modificar los precios con 30 (treinta) días de anticipación por correo electrónico. El uso continuado tras el período de notificación implica la aceptación del nuevo precio.',
        'Todos los pagos son procesados de forma segura por Stripe. NatGlow no almacena números de tarjeta completos.',
      ],
    },
    {
      heading: '6. Cancelación',
      body: 'Puede cancelar su suscripción en cualquier momento desde la configuración de la cuenta o contactando a ' + CONTACT_EMAIL + '. Tras la cancelación, conserva el acceso al Servicio hasta el final del período de facturación pagado. No se emiten reembolsos parciales por tiempo no utilizado dentro de un período, salvo lo indicado en nuestra Política de Reembolsos.',
    },
    {
      heading: '7. Propiedad Intelectual',
      body: 'Todo el contenido disponible a través del Servicio — incluyendo, sin limitación, rutinas, recetas, planes, textos, imágenes, el nombre NatGlow y su logotipo — es propiedad intelectual exclusiva de NatGlow y está protegido por las leyes de derechos de autor aplicables. Se le otorga una licencia limitada, no exclusiva e intransferible para acceder y usar el contenido únicamente para sus fines personales y no comerciales durante su suscripción activa.',
    },
    {
      heading: '8. Conductas Prohibidas',
      body: [
        'Realizar ingeniería inversa, descompilar o intentar extraer el código fuente del Servicio.',
        'Extraer datos mediante scraping, crawling u otros medios automatizados.',
        'Reproducir, distribuir, exhibir públicamente o crear obras derivadas del contenido de NatGlow sin autorización escrita previa.',
        'Usar el Servicio con fines ilegales o en violación de leyes aplicables.',
        'Intentar obtener acceso no autorizado a cualquier parte del Servicio o su infraestructura.',
        'Crear múltiples cuentas para eludir restricciones o abusar de períodos de garantía o prueba.',
      ],
    },
    {
      heading: '9. Aviso Médico y de Salud',
      body: 'EL CONTENIDO PROPORCIONADO A TRAVÉS DE NATGLOW ES ÚNICAMENTE CON FINES EDUCATIVOS E INFORMATIVOS Y NO CONSTITUYE CONSEJO MÉDICO, DERMATOLÓGICO NI DE SALUD PROFESIONAL. Las recetas, rutinas y recomendaciones de NatGlow no reemplazan la atención médica o dermatológica profesional. Consulte a un profesional de salud cualificado antes de aplicar cualquier receta o producto, especialmente si tiene condiciones cutáneas, alergias, trastornos del cuero cabelludo u otros problemas de salud. NatGlow no asume responsabilidad por reacciones adversas derivadas del uso de ingredientes o rutinas sugeridos.',
    },
    {
      heading: '10. Limitación de Responsabilidad',
      body: 'En la máxima medida permitida por la ley aplicable, NatGlow no será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pérdida de datos, pérdida de ingresos o daños personales derivados del uso del Servicio. La responsabilidad total de NatGlow por cualquier reclamación no superará el monto pagado por usted en los tres meses anteriores a dicha reclamación.',
    },
    {
      heading: '11. Ley Aplicable y Jurisdicción',
      body: 'Estos Términos se rigen por las leyes de la República Federativa del Brasil. Cualquier disputa se someterá a la jurisdicción exclusiva de los tribunales de la Comarca de São José dos Campos, Estado de São Paulo, Brasil, a la cual ambas partes se someten irrevocablemente.',
    },
    {
      heading: '12. Modificaciones de los Términos',
      body: 'Estos Términos pueden actualizarse en cualquier momento. La versión vigente es siempre la publicada en esta página. Los cambios materiales se comunicarán por correo electrónico con al menos 30 (treinta) días de antelación. El uso continuado del Servicio tras la fecha de vigencia implica la aceptación de los Términos actualizados. Nota: esta versión es operada por una persona física ("NatGlow") y será actualizada para reflejar cualquier estructura jurídica formalizada en el futuro.',
    },
    {
      heading: '13. Contacto',
      body: 'Si tiene preguntas sobre estos Términos o necesita ayuda, contáctenos en ' + CONTACT_EMAIL + '.',
    },
  ],
}

export default function Terms() {
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
