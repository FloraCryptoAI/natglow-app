import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Loader2, Check, ChevronDown, ChevronUp, Lock, AlertTriangle, CheckCircle, Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent, getFunnelSessionId } from '@/lib/trackFunnelEvent'
import { getAttribution } from '@/lib/tracking/attribution'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData'
import { PRICING_PLANS } from '@/config/pricing'
import { getCountryOffer } from '@/config/countryOffers'
import LegalLine from '@/components/LegalLine'
import BeforeAfterTestimonialCarousel from '@/components/BeforeAfterTestimonialCarousel'
import StickyMobileCTA from '@/components/results/StickyMobileCTA'
import { displayName } from '@/lib/resultsCabello'
import { getCabelloTestimonials, maskText } from '@/lib/cabelloRecipes'
import { LockedRecipeCards, LockedHabitsCard } from '@/components/quiz-cabello/LockedCards'

// Own sessionStorage namespace — this funnel never reads /quiz's answers.
const STORE = 'cabello'
const QUIZ_ROUTE = '/quiz-cabello'
// The only real app capture in the project. See the note on SECTION 4.
const APP_MOCKUP = '/images/quiz-natglow/app-mockup.webp'

const PINK = '#FB45A9'
const PINK_DARK = '#E03594'
const PINK_BG = '#FFE4F2'
const BRAND_GRAD = 'linear-gradient(135deg, #FB45A9, #FFB3DD)'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const PINK_SHADOW = 'rgba(251,69,169,0.4)'

// Reference values for the bonus stack, in USD. Only the three real extras
// carry a value: the plan, the app, the progress area and permanent access are
// part of the product, not bonuses, so they have no struck-through price.
const BONUS_USD = { biblioteca: 27, alineacion: 17, comunidad: 19 }

// Reference prices are quoted in USD, but the price shown is the country's local
// one. Printing "US$140,90" above "$149 MXN" reads as the price going UP, so
// every reference is scaled into the local currency using the same ratio the
// country's own struck-through price already uses (e.g. $599 MXN ≈ US$29,90).
// That keeps the discount identical in every country instead of mixing currencies.
const USD_BASE = 29.9
const LOCAL_BASE = { mx: 599, co: 119900, pe: 109, cl: 29900, default: USD_BASE }
// Round to a believable step per currency (no "$2.822,60 MXN").
const ROUND_STEP = { mx: 10, co: 1000, pe: 10, cl: 100 }

function formatReference(usd, code) {
  if (code === 'default' || !LOCAL_BASE[code]) {
    // Whole values print clean ("US$27"); only the total carries cents.
    return `US$${Number.isInteger(usd) ? usd : usd.toFixed(2).replace('.', ',')}`
  }
  const ratio = LOCAL_BASE[code] / USD_BASE
  const step = ROUND_STEP[code] ?? 1
  const value = Math.round((usd * ratio) / step) * step
  const n = value.toLocaleString('de-DE') // dot thousand separator, as in "$29.900 COP"
  if (code === 'pe') return `S/${n}`
  const suffix = { mx: 'MXN', co: 'COP', cl: 'CLP' }[code]
  return `$${n} ${suffix}`
}

function splitPrice(display) {
  const match = display.match(/^([^\d]+)([\d.,]+)\s*(.*)$/)
  if (!match) return { prefix: '', value: display, suffix: '' }
  return { prefix: match[1], value: match[2], suffix: match[3] }
}

const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

// Pink marker highlight — same cue as the quiz and results titles.
const HL = ({ children }) => (
  <span style={{
    background: PINK, color: '#fff', padding: '1px 8px', borderRadius: '6px',
    WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone',
  }}>{children}</span>
)

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-100 bg-white">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="font-bold text-stone-800 text-sm pr-4 leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: PINK_DARK }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: PINK_DARK }} />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  )
}

function PrimaryCTA({ label, loading, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      animate={loading ? {} : { scale: [1, 1.03, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className="w-full text-sm font-extrabold text-white flex items-center justify-center gap-2 rounded-full"
      style={{
        background: PINK_GRAD,
        boxShadow: `0 6px 24px ${PINK_SHADOW}`,
        opacity: loading ? 0.75 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        paddingTop: '1.05rem',
        paddingBottom: '1.05rem',
      }}
    >
      {loading
        ? <><Loader2 className="w-5 h-5 animate-spin" /> Espera...</>
        : <span className="uppercase tracking-wide">{label}</span>}
    </motion.button>
  )
}

// Price-card list: product first, bonuses after, mirroring how the page below
// splits them.
const INCLUDES = [
  'Tus 3 recetas completas',
  'Ingredientes, cantidades y preparación',
  'Plan semanal de 4 fases personalizado',
  'Biblioteca con 26 recetas',
  'Todo organizado en una aplicación',
  'Acceso permanente, sin mensualidades',
  'Garantía de 30 días',
]

// Shown next to the price and the CTAs — commercial conditions, not bonuses.
const COMMERCIAL_TERMS = 'Pago único · Acceso permanente · Sin mensualidades'

// Only genuine extras on top of the product. The weekly plan, the app, the
// progress area and permanent access were dropped from this list: presenting
// the product itself as a "free bonus" is what was weakening the offer.
const buildBonuses = (code) => [
  {
    tag: 'BONO 1',
    title: 'Biblioteca completa con 26 recetas',
    text: 'Además de tus 3 recetas iniciales, podrás consultar una biblioteca completa con opciones de hidratación, nutrición y diferentes ingredientes.',
    value: formatReference(BONUS_USD.biblioteca, code),
  },
  {
    tag: 'BONO 2',
    title: 'Comunidad exclusiva NatGlow',
    text: 'Accede a un espacio dentro de la aplicación para compartir experiencias, publicaciones y comentarios con otras mujeres de la comunidad.',
    value: formatReference(BONUS_USD.comunidad, code),
  },
  {
    // Premium, shown last: rendered like the app's "tónico" special-recipe card.
    tag: 'BONO PREMIUM',
    premium: true,
    title: 'Receta adicional de alineación casera',
    text: 'Una preparación adicional pensada para aportar suavidad y dejar el cabello con una apariencia más alineada y fácil de manejar.',
    note: 'También conocida dentro de NatGlow como nuestra opción de progresiva casera.',
    value: formatReference(BONUS_USD.alineacion, code),
  },
]

const COMPARE_SIN = [
  'Recetas diferentes cada semana',
  'No saber cuál elegir primero',
  'Mezclar varios cuidados al mismo tiempo',
  'Perder las instrucciones que encontraste',
  'Comprar ingredientes sin una lista clara',
]
const COMPARE_CON = [
  'Recetas elegidas especialmente para ti',
  'Hábitos simples para ajustar en tu rutina',
  'Preparación paso a paso',
  'Biblioteca completa con 26 recetas',
  'Plan semanal hecho para ti',
  'Todo organizado en una aplicación',
]

export default function OfferCabello({ pricingPlan = 'natglow' }) {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const { phases } = useTranslatedHairData()
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig

  // Phase-1 teaser for the "plan progresivo" section. Real strings come from the
  // app's own data (never hardcoded here); everything locked is rendered through
  // maskText so no real word reaches the DOM. The description is shown only up to
  // the word "acumulación" and masked after it.
  const phase1 = phases?.[0]
  const phaseDescCut = (() => {
    const d = phase1?.description ?? ''
    const anchor = 'acumulación de'
    const i = d.toLowerCase().indexOf(anchor)
    if (i === -1) return { head: d, tail: '' }
    const end = i + anchor.length
    return { head: d.slice(0, end), tail: d.slice(end) }
  })()
  const phaseWeeks = [1, 2, 3].map(n => ({
    n,
    focus: t(`hairPlan.phases.1.weeks.${n}.focus`, ''),
  }))
  // Same country resolution as the current offer: ?country=mx|co|pe|cl (or the
  // value persisted by the quiz) → local price + checkout; anything else → USD.
  const countryOffer = getCountryOffer()
  const { prefix: pricePrefix, value: priceDigits, suffix: priceSuffix } = splitPrice(countryOffer.displayPrice)

  const [loading, setLoading] = useState(false)
  const [passedFirstCard, setPassedFirstCard] = useState(false)
  const [priceCardVisible, setPriceCardVisible] = useState(false)
  const firstCardRef = useRef(null)

  // Offer step of the quiz_cabello funnel. Deliberately NOT
  // 'offer_natglow_viewed' — that event belongs to /quiz's funnel and reusing
  // it here would mix the two funnels in the admin.
  useEffect(() => {
    trackFunnelEvent('offer_cabello_viewed', null, plan_key)
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'offer_cabello', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'offer_cabello', content_id: plan_key, content_type: 'product' })
    })
  }, [plan_key])

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true })
  }, [user, isSubscribed, navigate])

  // Sticky CTA: appears only once the price card has scrolled past, and hides
  // whenever it is back on screen (no point shouting the price at someone
  // already looking at it).
  useEffect(() => {
    const first = firstCardRef.current
    if (!first) return

    const obs = new IntersectionObserver(([e]) => {
      setPriceCardVisible(e.isIntersecting)
      // Scrolled past the card = it left the viewport upwards.
      if (!e.isIntersecting && e.boundingClientRect.top < 0) setPassedFirstCard(true)
    }, { threshold: 0.01 })

    obs.observe(first)
    return () => obs.disconnect()
  }, [])

  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${STORE}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers
  // Direct access without finishing the quiz → back to this funnel's quiz
  // (not /quiz — that's a different funnel).
  if (!answers) return <Navigate to={QUIZ_ROUTE} replace />

  const name = displayName(answers)
  // Bonus reference values are scaled into the resolved country's currency.
  const bonuses = buildBonuses(countryOffer.code)
  // Sum of the bonus reference values, in the resolved country's currency.
  const bonusTotal = formatReference(
    BONUS_USD.biblioteca + BONUS_USD.comunidad + BONUS_USD.alineacion,
    countryOffer.code,
  )

  // All CTAs route here. `cta_clicked` is what hotmart-webhook reads to attribute
  // the purchase (it looks up the most recent one for the user and stores its
  // `source` + `country`), so it must fire here — with source 'offer_cabello' so
  // sales from this funnel are distinguishable from /quiz's.
  // Hotmart's own pixel owns InitiateCheckout + Purchase; only TikTok fires here.
  const ctaFiredRef = useRef(false)
  const handleCheckout = (source = 'offer_cabello') => {
    setLoading(true)
    const attribution = getAttribution()

    if (!ctaFiredRef.current) {
      ctaFiredRef.current = true
      const fbEventId = crypto.randomUUID()
      const ttCompleteId = crypto.randomUUID()
      sessionStorage.setItem('tt_complete_payment_id', ttCompleteId)
      sessionStorage.setItem('tt_complete_plan_key', plan_key)
      sessionStorage.setItem('tt_complete_value', String(countryOffer.priceValue))
      trackFunnelEvent('cta_clicked', {
        fb_event_id: fbEventId,
        source: 'offer_cabello',
        country: countryOffer.code,
        funnel: 'quiz_cabello',
        placement: source,
      }, plan_key)
      trackTtEvent('InitiateCheckout', { value: countryOffer.priceValue, currency: countryOffer.currency, content_name: plan_key, content_id: plan_key, content_type: 'product' }, fbEventId)
    }

    let checkoutUrl = countryOffer.checkoutUrl || '/'
    const params = new URLSearchParams()
    const funnelSessionId = getFunnelSessionId()
    // src = the quiz attempt id; Hotmart echoes it back as purchase.tracking.source
    // so the webhook can tie the payment to this attempt.
    if (funnelSessionId) params.set('src', funnelSessionId)
    if (attribution?.utm_source) params.set('utm_source', attribution.utm_source)
    if (attribution?.utm_medium) params.set('utm_medium', attribution.utm_medium)
    if (attribution?.utm_campaign) params.set('utm_campaign', attribution.utm_campaign)
    const qs = params.toString()
    if (qs) checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + qs

    setTimeout(() => { window.location.href = checkoutUrl }, 600)
  }

  const FAQ = [
    { q: '¿Qué recibiré al activar mi acceso?', a: 'Recibirás tus 3 recetas completas, tu plan de 4 fases (cada una con 3 semanas), la biblioteca con 26 recetas, la aplicación con seguimiento del progreso, la comunidad, la receta adicional de alineación casera y todos los bonos indicados en esta página.' },
    { q: '¿Las tres recetas aparecerán completas?', a: 'Sí. Después de activar tu acceso podrás consultar los ingredientes, cantidades, preparación e instrucciones de las tres recetas.' },
    { q: '¿Qué es el plan de 4 fases?', a: 'Es la forma en que NatGlow organiza tu rutina dentro de la aplicación: 4 fases, cada una con 3 semanas y recetas diferentes según cada objetivo, para que sepas qué cuidado realizar en cada momento sin hacer todo al mismo tiempo.' },
    { q: '¿También tendré acceso a las 26 recetas?', a: 'Sí. La biblioteca completa con 26 recetas está incluida como uno de los bonos de tu acceso.' },
    { q: '¿Es un pago único?', a: `Sí. El acceso se activa con un solo pago de ${countryOffer.displayPrice}. No hay mensualidades.` },
    {
      q: '¿El precio está en la moneda de mi país?',
      a: countryOffer.code === 'default'
        ? 'El precio se muestra y se cobra en dólares (USD). Para México, Colombia, Perú y Chile mostramos el valor en la moneda local, cada uno con su propio checkout.'
        : `Sí. Mostramos y cobramos el valor en la moneda de ${countryOffer.country} (${countryOffer.currency}), con un checkout específico para tu país.`,
    },
    { q: '¿Cuándo recibiré el acceso?', a: 'El acceso se libera después de la confirmación del pago. Recibirás las instrucciones utilizando los datos informados en el checkout.' },
    { q: '¿Puedo usar NatGlow desde el celular?', a: 'Sí. NatGlow funciona directamente desde el navegador y también puede instalarse en la pantalla de inicio del celular.' },
    { q: '¿Necesito comprar productos caros?', a: 'No. Las recetas utilizan ingredientes simples y la aplicación también muestra opciones para diferentes tipos de rutina.' },
    { q: '¿Las recetas sirven para cualquier tipo de cabello?', a: 'NatGlow posee opciones para diferentes tipos de cabello. Cada persona puede adaptar la frecuencia y observar cómo su cabello responde.' },
    { q: '¿Cómo funciona la garantía de 30 días?', a: 'Después de la compra tendrás 30 días para explorar NatGlow. Si decides que el acceso no es para ti, podrás solicitar el reembolso dentro del plazo de garantía, según las condiciones de compra.' },
    { q: '¿Las recetas garantizan un resultado específico?', a: 'No. Cada cabello responde de una manera diferente. NatGlow ofrece recetas, instrucciones y una forma organizada de acompañar los cuidados, pero los resultados pueden variar.' },
    { q: '¿Tendré acceso para siempre?', a: 'Sí. Tu acceso es permanente: no tendrás que pagar mensualidades para continuar consultando el contenido disponible en tu cuenta.' },
  ]

  // The price card is rendered twice (sections 2 and 12) with different copy.
  const PriceCard = ({ innerRef, title, text, cta, subLines }) => (
    <div ref={innerRef}>
      <div className="rounded-3xl overflow-hidden bg-white border border-stone-100" style={{ boxShadow: '0 14px 44px rgba(0,0,0,0.07)' }}>
        <div className="pt-6 text-center" style={{ background: BRAND_GRAD }}>
          <div className="flex justify-center">
            <img
              src={APP_MOCKUP}
              alt=""
              loading="lazy"
              decoding="async"
              className="block max-w-none"
              style={{ width: '120%' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </div>

        <div className="px-6 pt-6 pb-7">
          <h2 className="text-xl font-extrabold text-stone-900 text-center leading-tight">{title}</h2>
          <p className="text-sm text-stone-500 text-center mt-2 leading-snug">{text}</p>

          <div className="rounded-2xl mt-5 px-5 py-9 text-center" style={{ background: '#FFF5FA', border: '1px solid #FFE4F2' }}>
            <div className="flex items-end justify-center gap-3">
              <div className="flex items-end gap-1">
                <span className="text-base font-bold text-stone-400 mb-2">{pricePrefix}</span>
                <span className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: PINK_DARK }}>
                  {priceDigits}
                </span>
                {priceSuffix && <span className="text-base font-bold text-stone-400 mb-2">{priceSuffix}</span>}
              </div>
              <div className="flex flex-col items-start gap-1 mb-1">
                {/* Same short pill as /quiz's offer — a two-line label here
                    breaks the price row's alignment. */}
                <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: PINK }}>
                  OFERTA
                </span>
                <span className="text-sm text-stone-400 line-through decoration-stone-300">
                  {countryOffer.oldPrice}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3.5">TU ACCESO INCLUYE</p>
            <ul className="flex flex-col gap-3">
              {INCLUDES.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PINK_BG }}>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: PINK_DARK }} />
                  </span>
                  <span className="text-sm text-stone-700 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7">
            <PrimaryCTA label={cta} loading={loading} onClick={() => handleCheckout('offer_card')} />
            <div className="flex items-center justify-center gap-1.5 mt-3.5 text-xs text-stone-500">
              <Lock className="w-3.5 h-3.5" /> {subLines[0]}
            </div>
            <p className="text-[11px] text-stone-400 text-center leading-snug mt-1.5">{subLines[1]}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══ 1 · CONTINUIDAD DEL RESULTADO ═══ */}
      <section className="bg-stone-50 pt-7 pb-8">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-4">
              {/* Solid pink pill, same as the results page tag. */}
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider px-3 py-1.5 rounded-full text-white" style={{ background: PINK }}>
                ✨ TUS 3 RECETAS ESTÁN LISTAS
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1 className="text-[26px] font-extrabold text-stone-900 text-center leading-snug">
              {name ? `${name}, tu ` : 'Tu '}
              <HL>plan completo</HL>
              {' está listo'}
            </h1>
            <p className="text-sm text-stone-500 text-center mt-3 leading-relaxed">
              Organizamos tu rutina en 4 fases, cada una con 3 semanas y recetas diferentes según cada objetivo.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ 2 · PROGRESSIVE PLAN TEASER (replica of the app's Plan screen) ═══
          Locked content (phase name, part of the description, week focus) is
          rendered through maskText — the real words live only in the app's i18n
          data, never in this page's DOM, so a CSS blur can't be inspected away. */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          {/* Phase card — mirrors the app's gradient phase header. */}
          <FadeIn delay={0.05}>
            <div className="rounded-3xl p-6 text-white" style={{ background: BRAND_GRAD }}>
              {/* Type sizes/weights/opacities copied 1:1 from the app's phase
                  header (HairPlan.jsx) so the card reads identically. */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl" aria-hidden>🌿</span>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Fase 1 de 4</p>
              </div>
              {/* Phase name — locked */}
              <h3 className="text-xl font-bold select-none" style={{ filter: 'blur(5px)' }} aria-hidden="true">
                {maskText(phase1?.name) || 'Xxxxxxxxxxxxxx + Xxxxxxxxxx'}
              </h3>
              <span className="sr-only">Nombre de la fase disponible en tu acceso</span>
              {/* Description — visible up to "acumulación", masked after */}
              <p className="text-white/70 text-sm mt-1 leading-relaxed">
                {phaseDescCut.head}
                {phaseDescCut.tail && (
                  <span className="select-none" style={{ filter: 'blur(5px)' }} aria-hidden="true">{maskText(phaseDescCut.tail)}</span>
                )}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Semanas completadas</span>
                  <span className="text-white/60">0/3</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Week toggles — title visible, focus locked, lock instead of expand. */}
          <div className="flex flex-col gap-3 mt-3">
            {phaseWeeks.map((w, i) => (
              <FadeIn key={w.n} delay={0.1 + i * 0.05}>
                <div className="rounded-2xl border border-stone-100 bg-white flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: PINK_GRAD }}>
                    {w.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800">Semana {w.n}</p>
                    <p className="text-xs text-stone-400 select-none" style={{ filter: 'blur(4px)' }} aria-hidden="true">
                      {maskText(w.focus) || 'xxxxx xx xx xxxxxxxxxx'}
                    </p>
                  </div>
                  <Lock className="w-4 h-4 text-stone-300 flex-shrink-0" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3 · EL COMIENZO IDEAL (locked recipes + habits, same as results) ═══ */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-5">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                El <HL>comienzo ideal</HL>
              </h2>
              <p className="text-sm text-stone-500 mt-2.5 leading-snug">
                En tu primera fase empiezas por las recetas que elegimos para tu plan y ajustando algunos hábitos de tu rutina.
              </p>
            </div>
          </FadeIn>
          <LockedRecipeCards answers={answers} />
          <div className="mt-3">
            <LockedHabitsCard answers={answers} />
          </div>
        </div>
      </section>

      {/* ═══ 4 · BONUSES (all styled like the app's premium card, in pink) ═══ */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                Además, hoy recibes estos <HL>3 bonos</HL>
              </h2>
              <p className="text-sm text-stone-500 mt-2 leading-snug">
                Se suman a tu acceso sin ningún costo adicional.
              </p>
            </div>
          </FadeIn>

          <div className="flex flex-col gap-4">
            {bonuses.map((b, i) => {
              // Same "premium" card layout for all; the last (alineación) keeps
              // the app's gold header, the others use pink.
              const gold = b.premium
              const headerBg = gold ? 'linear-gradient(to right, #FBBF24, #F59E0B)' : PINK_GRAD
              // Pink cards use the same faint border as the guarantee card
              // (border-stone-100 = #f5f5f4); the gold one keeps its amber edge.
              const cardBorder = gold ? '#FDE68A' : '#f5f5f4'
              const cardShadow = 'none'
              const accent = gold ? '#B45309' : PINK_DARK
              return (
                <FadeIn key={i} delay={i * 0.05}>
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                    <div className="p-5" style={{ background: headerBg }}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-white" />
                          <span className="text-white text-[10px] font-extrabold uppercase tracking-wider">{b.tag}</span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white flex-shrink-0" style={{ color: accent }}>
                          HOY GRATIS
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-lg leading-tight">{b.title}</h3>
                    </div>
                    <div className="bg-white p-5">
                      <p className="text-sm text-stone-600 leading-relaxed">{b.text}</p>
                      {b.note && (
                        <p className="text-xs text-stone-400 italic leading-snug mt-2">{b.note}</p>
                      )}
                      <p className="text-sm line-through decoration-stone-300 mt-4" style={{ color: accent }}>Valor: {b.value}</p>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>

          {/* Total of the bonus reference values — one-row, 3-column table. */}
          <FadeIn>
            <div className="grid grid-cols-3 rounded-2xl border border-stone-100 bg-white overflow-hidden mt-5 text-center">
              <div className="px-2 py-3 flex items-center justify-center">
                <span className="text-sm font-semibold text-stone-600">Total en bonos</span>
              </div>
              <div className="px-2 py-3 flex items-center justify-center" style={{ borderLeft: '1px solid #f5f5f4', borderRight: '1px solid #f5f5f4' }}>
                <span className="text-sm font-bold text-stone-400 line-through decoration-stone-300">{bonusTotal}</span>
              </div>
              <div className="px-2 py-3 flex items-center justify-center">
                <span className="text-sm font-extrabold uppercase tracking-wider" style={{ color: '#1E8449' }}>Hoy gratis</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ 5 · PRICE CARD ═══ */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <PriceCard
              innerRef={firstCardRef}
              title="Desbloquea tus 3 recetas y todo lo que incluye tu acceso"
              text="Consulta las recetas completas y sigue los pasos desde tu celular, todo organizado dentro de nuestra aplicación como viste arriba."
              cta="DESBLOQUEAR MIS 3 RECETAS"
              subLines={['🔒 Acceso inmediato después del pago.', COMMERCIAL_TERMS]}
            />
          </FadeIn>

          {/* Compact guarantee, right below the price card (same as /offer-natglow). */}
          <FadeIn delay={0.05}>
            <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-center gap-4 mt-4">
              <span className="text-3xl flex-shrink-0 leading-none">🛡️</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-stone-900 text-base leading-snug">Garantía de 30 días sin preguntas</p>
                <p className="text-sm text-stone-500 leading-snug mt-0.5">Riesgo cero, pruébalo y decide.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ 6 · TESTIMONIALS ═══ */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-5">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                Experiencias compartidas por mujeres de la comunidad
              </h2>
              <p className="text-xs text-stone-500 mt-2 leading-snug">
                Cada cabello responde de una forma diferente, pero tener las recetas y los pasos organizados puede hacer que la rutina sea mucho más fácil de acompañar.
              </p>
            </div>
            {/* Country-aware names/locations; each text describes its own
                before/after pair. */}
            <BeforeAfterTestimonialCarousel
              testimonials={getCabelloTestimonials(countryOffer.code)}
              verifiedBadgeTemplate="🌿 Experiencia compartida en nuestra app · Comunidad"
              showBeforeAfterLabels={false}
              showStars={false}
              intervalMs={9000}
              cardBorder="border-stone-100"
              accentColor={PINK}
              accentDark={PINK_DARK}
            />
            <p className="text-[11px] text-stone-400 text-center italic mt-4">
              {t('natglowFlow.offer.testimonials.disclaimer')}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ 7 · COMPARISON ═══ */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-stone-900 text-center leading-tight">
              Buscar recetas al azar <span style={{ color: PINK_DARK }}>vs</span> tener todo organizado
            </h2>
            <p className="text-sm text-stone-500 text-center mt-2 mb-6 leading-snug">
              Cuando tienes una selección clara, es más fácil saber qué usar, cómo preparar y por dónde comenzar.
            </p>
          </FadeIn>

          <div className="flex flex-col gap-4">
            <FadeIn>
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <h3 className="font-bold text-stone-800">Probando por cuenta propia</h3>
                </div>
                <ul className="space-y-3">
                  {COMPARE_SIN.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <h3 className="font-bold text-stone-800">Con NatGlow</h3>
                </div>
                <ul className="space-y-3">
                  {COMPARE_CON.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700 font-medium leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ 8 · FAQ ═══ */}
      <section className="bg-stone-50 pb-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">Preguntas frecuentes</h2>
            </div>
          </FadeIn>
          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <FadeIn key={i} delay={i * 0.03}>
                <FaqItem q={item.q} a={item.a} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 9 · LEGAL ═══ */}
      <LegalLine />

      {/* Sticky CTA: after the first price card, hidden while a price card shows. */}
      {passedFirstCard && !priceCardVisible && (
        <StickyMobileCTA
          label={`Acceso completo por ${countryOffer.displayPrice}`}
          onClick={() => handleCheckout('offer_sticky')}
          loading={loading}
          gradient={PINK_GRAD}
          shadow={PINK_SHADOW}
          pulse
        />
      )}
    </div>
  )
}
