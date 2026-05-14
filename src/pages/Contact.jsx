import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '@/api/supabaseClient'

const CONTACT_EMAIL = 'support@natglow.app'

const CONTENT = {
  en: {
    title: 'Contact & Support',
    subtitle: 'We respond within 24 hours on business days.',
    emailLabel: 'Or email us directly:',
    form: {
      name: 'Your name',
      email: 'Your email',
      category: 'Category',
      categories: [
        { value: '', label: 'Select a category...' },
        { value: 'payment', label: 'Payment' },
        { value: 'account', label: 'Account / Access' },
        { value: 'refund', label: 'Refund Request' },
        { value: 'content', label: 'Content' },
        { value: 'other', label: 'Other' },
      ],
      message: 'Message',
      messagePlaceholder: 'Describe your question or issue in detail...',
      submit: 'Send message',
      submitting: 'Sending...',
      success: 'Message sent! We\'ll get back to you within 24 hours.',
      error: 'Something went wrong. Please try again or email us directly.',
    },
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel at any time by going to Settings → Manage Subscription, or by emailing support@natglow.app. After cancellation, you keep access until the end of your current billing period.',
      },
      {
        q: 'When will I be charged again?',
        a: 'Your subscription renews automatically each month on the same date as your first payment. You can see the next renewal date in Settings → Manage Subscription.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Yes! We offer a full refund within the first 7 days of your initial subscription. After that period, renewals are non-refundable, but you can cancel anytime. See our Refund Policy for details.',
      },
      {
        q: 'I forgot my password / can\'t log in',
        a: 'NatGlow uses passwordless login — just enter your email and you\'ll receive a magic link. Make sure to check your spam folder. If you still can\'t access your account, contact us and we\'ll help.',
      },
      {
        q: 'How does the 84-day plan work?',
        a: 'Your personalised 84-day plan is a structured hair care programme divided into 3 phases of 28 days each. Each phase progressively builds on the previous one, focusing on cleansing, nourishment, and sealing. You can track your progress in the Progress section.',
      },
      {
        q: 'Is the content safe for my hair?',
        a: 'All NatGlow content is created for educational purposes based on natural hair care principles. However, individual results vary and we always recommend consulting a dermatologist before using any ingredient if you have known allergies or scalp conditions.',
      },
      {
        q: 'Can I share my account with someone else?',
        a: 'Accounts are personal and non-transferable. Sharing your account is not permitted per our Terms of Service. Each user must have their own subscription.',
      },
    ],
  },
  es: {
    title: 'Contacto y Soporte',
    subtitle: 'Respondemos en menos de 24 horas en días hábiles.',
    emailLabel: 'O escríbenos directamente:',
    form: {
      name: 'Tu nombre',
      email: 'Tu correo electrónico',
      category: 'Categoría',
      categories: [
        { value: '', label: 'Selecciona una categoría...' },
        { value: 'payment', label: 'Pago' },
        { value: 'account', label: 'Cuenta / Acceso' },
        { value: 'refund', label: 'Solicitud de reembolso' },
        { value: 'content', label: 'Contenido' },
        { value: 'other', label: 'Otro' },
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
        q: '¿Cómo cancelo mi suscripción?',
        a: 'Puedes cancelar en cualquier momento desde Configuración → Gestionar Suscripción, o enviando un correo a support@natglow.app. Después de cancelar, conservas el acceso hasta el final de tu período de facturación actual.',
      },
      {
        q: '¿Cuándo se realizará mi próximo cobro?',
        a: 'Tu suscripción se renueva automáticamente cada mes en la misma fecha de tu primer pago. Puedes ver la próxima fecha de renovación en Configuración → Gestionar Suscripción.',
      },
      {
        q: '¿Puedo solicitar un reembolso?',
        a: '¡Sí! Ofrecemos un reembolso completo dentro de los primeros 7 días de tu suscripción inicial. Después de ese período, las renovaciones no son reembolsables, pero puedes cancelar en cualquier momento. Consulta nuestra Política de Reembolsos para más detalles.',
      },
      {
        q: 'Olvidé mi contraseña / no puedo iniciar sesión',
        a: 'NatGlow utiliza inicio de sesión sin contraseña — simplemente ingresa tu correo y recibirás un enlace mágico. Asegúrate de revisar tu carpeta de spam. Si aún no puedes acceder a tu cuenta, contáctanos y te ayudaremos.',
      },
      {
        q: '¿Cómo funciona el plan de 84 días?',
        a: 'Tu plan personalizado de 84 días es un programa estructurado de cuidado capilar dividido en 3 fases de 28 días. Cada fase se construye progresivamente sobre la anterior, enfocándose en limpieza, nutrición y sellado. Puedes seguir tu progreso en la sección Progreso.',
      },
      {
        q: '¿El contenido es seguro para mi cabello?',
        a: 'Todo el contenido de NatGlow se crea con fines educativos basados en principios de cuidado capilar natural. Sin embargo, los resultados individuales varían y siempre recomendamos consultar a un dermatólogo antes de usar cualquier ingrediente si tienes alergias conocidas o condiciones del cuero cabelludo.',
      },
      {
        q: '¿Puedo compartir mi cuenta con otra persona?',
        a: 'Las cuentas son personales e intransferibles. Compartir tu cuenta no está permitido según nuestros Términos de Servicio. Cada usuaria debe tener su propia suscripción.',
      },
    ],
  },
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
  const { i18n } = useTranslation()
  const c = i18n.language?.startsWith('es') ? CONTENT.es : CONTENT.en

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

        <p className="mt-12 text-xs text-stone-300 text-center">© {new Date().getFullYear()} NatGlow. All rights reserved.</p>
      </div>
    </div>
  )
}
