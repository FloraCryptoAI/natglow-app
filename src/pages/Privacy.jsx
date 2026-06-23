import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTACT_EMAIL = 'support@natglow.app'

// Project is 100% Spanish (LATAM). English block removed.
// Reflects actual stack: Supabase auth, Hotmart single payment, FB+TikTok
// pixels enabled by default (no consent banner active in production).
const ES = {
  disclaimer: 'Este documento fue redactado con asistencia de IA como versión inicial. Recomendamos consultar asesoría legal para verificar su adecuación a su jurisdicción específica.',
  title: 'Política de Privacidad',
  lastUpdated: 'Última actualización: 23 de junio de 2026',
  sections: [
    {
      heading: '1. Quiénes Somos',
      body: 'NatGlow ("nosotros" o "nuestro") opera la aplicación disponible en app.natglow.app. Nos comprometemos a proteger sus datos personales y respetar su privacidad. Esta política explica qué datos recolectamos, cómo los usamos y qué derechos tiene usted.',
    },
    {
      heading: '2. Datos que Recolectamos',
      body: [
        'Correo electrónico — proporcionado al momento de la compra y al iniciar sesión.',
        'Nombre — opcional, proporcionado durante el diagnóstico del quiz.',
        'Respuestas del quiz capilar — para generar tu rutina personalizada.',
        'Datos de la compra — gestionados por Hotmart (nuestro procesador de pagos). NatGlow recibe únicamente el correo de la compradora y la confirmación del pago; no almacenamos datos de tarjeta.',
        'Datos de uso — páginas visitadas, acciones realizadas y tiempo en la app, para mejorar el servicio.',
        'Datos técnicos — dirección IP, tipo de dispositivo, navegador y país aproximado (obtenido por geolocalización del IP).',
      ],
    },
    {
      heading: '3. Cómo Usamos sus Datos',
      body: [
        'Crear y mantener tu cuenta de acceso.',
        'Generar y entregar tu rutina capilar personalizada.',
        'Enviar comunicaciones operacionales (correo de bienvenida, recordatorios, soporte).',
        'Procesar tu compra y eventual reembolso a través de Hotmart.',
        'Medir el desempeño de nuestras campañas publicitarias y mejorar la experiencia.',
        'Cumplir con obligaciones legales y prevenir fraude.',
      ],
    },
    {
      heading: '4. Cookies y Tecnologías de Seguimiento',
      body: 'Utilizamos cookies y píxeles para gestión de sesión, analítica y publicidad. Específicamente cargamos el Facebook Pixel y el TikTok Pixel para medir conversiones de nuestras campañas y mejorar la relevancia de los anuncios que ves. Estas tecnologías se activan al ingresar a nuestras páginas. Si deseas desactivar el seguimiento publicitario, puedes hacerlo a través de la configuración de cookies y privacidad de tu navegador, o de las preferencias publicitarias de Facebook (facebook.com/adpreferences) y TikTok (tiktok.com/legal/page/global/cookie-policy/es).',
    },
    {
      heading: '5. Compartir Datos con Terceros',
      body: [
        'Hotmart — procesa tu pago y emite factura. Política propia en hotmart.com.',
        'Supabase — proveedor de base de datos y autenticación (donde se almacena tu cuenta).',
        'Meta / Facebook — recibe eventos de conversión (compras, quiz iniciado, etc.) vinculados al ID anónimo de tu navegador.',
        'TikTok — recibe los mismos tipos de eventos para optimización publicitaria.',
        'Servicio de correo transaccional — para enviar el correo de bienvenida y recuperación de acceso.',
        'No vendemos sus datos personales a terceros.',
      ],
    },
    {
      heading: '6. Tiempo de Retención',
      body: 'Conservamos sus datos personales mientras mantenga una cuenta activa con nosotros. Después de su solicitud de eliminación, eliminamos los datos personales identificables en un plazo de 30 días, excepto cuando la ley exija conservarlos por períodos específicos (registros fiscales, por ejemplo).',
    },
    {
      heading: '7. Sus Derechos',
      body: [
        'Acceder a los datos que tenemos sobre usted.',
        'Solicitar corrección de datos inexactos.',
        'Solicitar eliminación de su cuenta y datos asociados.',
        'Retirar el consentimiento al procesamiento de datos cuando aplique.',
        'Presentar queja ante la autoridad de protección de datos de su país.',
        'Para ejercer cualquier derecho, escríbanos a ' + CONTACT_EMAIL + '. Respondemos en un plazo máximo de 30 días.',
      ],
    },
    {
      heading: '8. Seguridad',
      body: 'Implementamos medidas técnicas y organizacionales para proteger sus datos: cifrado en tránsito (HTTPS), control de acceso por roles, auditorías periódicas y políticas de seguridad de bases de datos (Row Level Security). Sin embargo, ningún sistema es 100% inviolable; en caso de incidente de seguridad que afecte sus datos personales, le notificaremos según los plazos exigidos por la ley aplicable.',
    },
    {
      heading: '9. Edad Mínima',
      body: 'El Servicio está destinado exclusivamente a usuarias mayores de 18 años. No recolectamos conscientemente datos de menores. Si tomamos conocimiento de que un menor creó una cuenta, eliminaremos sus datos.',
    },
    {
      heading: '10. Cambios a Esta Política',
      body: 'Podemos actualizar esta política periódicamente. Cambios significativos serán notificados por correo electrónico o mediante un aviso en la aplicación. La fecha de "Última actualización" arriba indica la versión vigente.',
    },
    {
      heading: '11. Contacto',
      body: 'Para preguntas sobre esta política o sobre sus datos personales, escríbanos a ' + CONTACT_EMAIL + '.',
    },
  ],
}

export default function Privacy() {
  const content = ES
  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
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

        <p className="mt-12 text-xs text-stone-300 text-center">© {new Date().getFullYear()} NatGlow. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}
