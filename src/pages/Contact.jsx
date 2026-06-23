import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '@/api/supabaseClient'
import { CONTACT_EMAIL } from '@/config/contact'

// Project is 100% Spanish (LATAM). English block removed.
// Business model: single payment via Hotmart ($17), lifetime access — no
// monthly subscription. FAQs and form must reflect that.
const CONTENT = {
  title: 'Contacto y Soporte',
  subtitle: 'Respondemos en menos de 24 horas en días hábiles.',
  emailLabel: 'O escríbenos directamente:',
  form: {
    name: 'Tu nombre',
    email: 'Tu correo electrónico',
    category: 'Categoría',
    categories: [
      { value: '',          label: 'Selecciona una categoría...' },
      { value: 'payment',   label: 'Pago / Acceso' },
      { value: 'account',   label: 'Cuenta' },
      { value: 'refund',    label: 'Solicitud de reembolso' },
      { value: 'content',   label: 'Contenido' },
      { value: 'other',     label: 'Otro' },
    ],
    message: 'Mensaje',
    messagePlaceholder: 'Describe tu pregunta o problema con detalle...',
    submit: 'Enviar mensaje',
    submitting: 'Enviando...',
    success: '¡Mensaje enviado! Te responderemos en menos de 24 horas.',
    error: 'Algo salió mal. Inténtalo de nuevo o escríbenos directamente.',
  },
  faqTitle: 'Preguntas Frecuentes',
  faqs: [
    {
      q: 'Acabo de comprar — ¿cómo accedo a mi cuenta?',
      a: 'Después de tu pago, te enviamos un correo de bienvenida con un botón de acceso instantáneo. Si no lo ves en tu bandeja principal, revisa la carpeta de spam o promociones. Si aún no llega después de 10 minutos, escríbenos a ' + CONTACT_EMAIL + ' indicando el correo que usaste en la compra.',
    },
    {
      q: '¿Por cuánto tiempo tengo acceso?',
      a: 'Tu acceso es VITALICIO. Hiciste un pago único — no hay suscripción, no hay renovaciones mensuales, no se cobrará nada más. Puedes entrar a tu plan cuando quieras, las veces que quieras.',
    },
    {
      q: '¿Cómo funciona el plan?',
      a: 'Tu rutina personalizada de 21 días te da los primeros resultados visibles — menos frizz, más brillo, cabello más fuerte. Después de los primeros 21 días, accedes al plan progresivo completo de 4 fases (84 días totales) para mantener tu cabello sano a largo plazo. Cada fase se enfoca en una etapa diferente: limpieza, nutrición, fortalecimiento y mantenimiento.',
    },
    {
      q: '¿Puedo solicitar un reembolso?',
      a: 'Sí. Ofrecemos garantía de satisfacción de 7 días — si no quedas conforme dentro de los 7 días posteriores a tu compra, te devolvemos el 100% del valor. Para solicitar reembolso, escríbenos a ' + CONTACT_EMAIL + ' con el correo que usaste en la compra. El reembolso se procesa directamente por Hotmart en 5 a 10 días hábiles.',
    },
    {
      q: 'Olvidé el acceso / no encuentro el correo de bienvenida',
      a: 'NatGlow usa inicio de sesión sin contraseña — ingresa tu correo en la página de Iniciar Sesión y recibirás un código de 6 dígitos. Asegúrate de revisar también la carpeta de spam o promociones. Si aún tienes problemas, contáctanos y te ayudamos.',
    },
    {
      q: 'Compré con un correo y quiero usar otro — ¿se puede cambiar?',
      a: 'Sí. Escríbenos a ' + CONTACT_EMAIL + ' desde el correo registrado en la compra indicando el correo nuevo al que quieres migrar tu acceso. Hacemos el cambio manualmente y te confirmamos por correo cuando esté listo.',
    },
    {
      q: '¿El contenido es seguro para mi cabello?',
      a: 'Todo el contenido de NatGlow es de carácter educativo y se basa en principios de cuidado capilar natural. Los resultados individuales varían. Si tienes alergias conocidas o condiciones del cuero cabelludo, recomendamos consultar a un dermatólogo antes de aplicar cualquier ingrediente.',
    },
    {
      q: '¿Puedo compartir mi cuenta con otra persona?',
      a: 'Las cuentas son personales e intransferibles. Compartir tu cuenta no está permitido según nuestros Términos de Servicio. Cada persona debe tener su propia compra.',
    },
  ],
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-stone-50 transition-colors"
      >
        <span className="font-medium text-stone-800 text-sm pr-4">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed bg-white">{a}</p>}
    </div>
  )
}

export default function Contact() {
  const c = CONTENT

  const [form, setForm] = useState({ name: '', email: '', category: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.category || form.message.length < 10) return
    setStatus('loading')
    try {
      const { error } = await supabase.functions.invoke('send-contact-message', { body: form })
      if (error) throw error
      setStatus('success')
      setForm({ name: '', email: '', category: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const inputCls = 'w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 outline-none focus:border-pink-400 transition-colors bg-white'

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

        <h1 className="text-2xl font-bold text-stone-900 mb-1">{c.title}</h1>
        <p className="text-sm text-stone-500 mb-8">{c.subtitle}</p>

        {/* Direct email */}
        <div className="flex items-center gap-2 mb-8 text-sm text-stone-500">
          <Mail className="w-4 h-4 text-stone-400" />
          <span>{c.emailLabel}</span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-pink-500 hover:text-pink-600 transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        {/* Contact form */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-10">
          {status === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-stone-700 font-medium">{c.form.success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">{c.form.name}</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">{c.form.email}</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">{c.form.category}</label>
                <select
                  name="category"
                  required
                  value={form.category}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {c.form.categories.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  {c.form.message}
                </label>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  placeholder={c.form.messagePlaceholder}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-stone-400 mt-1 text-right">{form.message.length}/2000</p>
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-500">{c.form.error}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !form.name || !form.email || !form.category || form.message.length < 10}
                className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-bold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #FB45A9, #E03594)' }}
              >
                {status === 'loading'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {c.form.submitting}</>
                  : c.form.submit}
              </button>
            </form>
          )}
        </div>

        {/* FAQ */}
        <h2 className="text-lg font-bold text-stone-900 mb-4">{c.faqTitle}</h2>
        <div className="space-y-2">
          {c.faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>

        <p className="mt-12 text-xs text-stone-300 text-center">© {new Date().getFullYear()} NatGlow. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}
