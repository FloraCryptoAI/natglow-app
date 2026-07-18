import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Lock, Clock } from 'lucide-react'

import { PRICING_PLANS } from '@/config/pricing'
import { getCountryOffer } from '@/config/countryOffers'
import { getFunnelSessionId } from '@/lib/trackFunnelEvent'
import { getAttribution } from '@/lib/tracking/attribution'
import LegalLine from '@/components/LegalLine'
import AnswerTable from '@/components/quiz-cabello/AnswerTable'
import { LockedRecipeCards, LockedHabitsCard } from '@/components/quiz-cabello/LockedCards'
import {
  getAnswerRows, getStartingPointText, displayName,
} from '@/lib/resultsCabello'

// ─────────────────────────────────────────────────────────────────────────────
// SANDBOX/DRAFT of the /quiz results page (route: /quiz-cabello/results-v2).
// A copy of ResultsCabello for iterating on the new design WITHOUT touching the
// live funnel. Differences from the real page:
//   • Renders with SAMPLE_ANSWERS when opened directly (no quiz needed, no redirect).
//   • Fires NO funnel/pixel events (so previews don't pollute the admin).
//   • The buy button still redirects to the real Hotmart checkout (visual test).
// When the design is approved, its changes get ported back into ResultsCabello.
// ─────────────────────────────────────────────────────────────────────────────

const STORE = 'cabello'
const IMG_NATGLOW = '/images/quiz-natglow'

const P         = '#FB45A9'
const P_DARK    = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const BG        = '#fafaf9'
const PINK_BG   = '#FFE4F2'

// Realistic answers so the recipe/habits/table sections render on direct access.
const SAMPLE_ANSWERS = {
  name: 'Ana',
  age: '30_39',
  hairType: 'ondulado',
  hairTone: 'castano',
  hairLength: 'medio',
  washFreq: '3_4',
  waterTemp: 'hot',
  heatTools: 'few',
  chemProducts: 'aveces',
  scalpSensitivity: 'no',
  concerns: ['frizz', 'seco', 'puntas'],
  goals: ['frizz', 'brillo'],
  hairGoal: 'frizz',
  recipeExperience: 'poca',
  investment: 'basico',
  recipePref: 'pocos',
  symptomsIntensity: '30days',
}

function PinkButton({ children, onClick, pulse = true }) {
  return (
    <motion.button
      onClick={onClick}
      animate={pulse ? { scale: [1, 1.03, 1] } : {}}
      transition={pulse ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="w-full py-4 font-extrabold text-white rounded-full text-[15px] flex items-center justify-center gap-2"
      style={{ background: PINK_GRAD, boxShadow: '0 4px 20px rgba(251,69,169,0.32)' }}
    >
      {children}
    </motion.button>
  )
}

const HL = ({ children }) => (
  <span
    style={{
      background: P,
      color: '#fff',
      padding: '1px 8px',
      borderRadius: '6px',
      WebkitBoxDecorationBreak: 'clone',
      boxDecorationBreak: 'clone',
    }}
  >
    {children}
  </span>
)

function BeforeAfterSlider({ beforeUrl, afterUrl }) {
  const [pos, setPos] = useState(50)
  const ref = useRef(null)
  const dragging = useRef(false)

  const setFromClientX = (clientX) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width) return
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  const onPointerDown = (e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e) => {
    if (!dragging.current) return
    setFromClientX(e.clientX)
  }
  const endDrag = (e) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setPos(p => Math.max(0, p - 5)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPos(p => Math.min(100, p + 5)) }
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      role="slider"
      aria-label="Comparar antes y después"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      className="relative w-full overflow-hidden rounded-2xl select-none cursor-ew-resize outline-none"
      style={{ aspectRatio: '3/4', background: '#f5f5f4', touchAction: 'none' }}
    >
      <img
        src={afterUrl}
        alt="Después"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <img
        src={beforeUrl}
        alt="Antes"
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2" style={{ background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.35)' }} />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center gap-0.5"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: P_DARK }} strokeWidth={3} />
          <ChevronRight className="w-4 h-4" style={{ color: P_DARK }} strokeWidth={3} />
        </div>
      </div>
    </div>
  )
}

function Card({ children, className = '', tinted = false }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={tinted
        ? { borderColor: '#FFB3DD', background: '#FFF5FA' }
        : { borderColor: '#f0eeec', background: '#fff', boxShadow: '0 1px 3px rgba(23,23,23,0.04)' }}
    >
      {children}
    </div>
  )
}

function splitPrice(display) {
  const m = String(display ?? '').match(/^([^\d]*)([\d.,]+)\s*(.*)$/)
  if (!m) return { prefix: '', value: display, suffix: '' }
  return { prefix: m[1], value: m[2], suffix: m[3] }
}

function Countdown({ seconds = 17 * 60 + 32 }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setLeft(l => (l <= 1 ? 0 : l - 1)), 1000)
    return () => clearInterval(id)
  }, [])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return <span>{mm}:{ss}</span>
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-100 bg-white">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="font-bold text-stone-800 text-sm pr-4 leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: P_DARK }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: P_DARK }} />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  )
}

const RESULTS_INCLUDES = [
  'Tus 3 recetas completas',
  'Plan semanal de 4 fases personalizado',
  'Biblioteca con 26 recetas',
  'Todo organizado en una aplicación',
  'Acceso permanente, sin mensualidades',
]

export default function ResultsCabelloV2({ pricingPlan = 'natglow' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig
  const { state } = useLocation()
  const [loading, setLoading] = useState(false)
  const countryOffer = getCountryOffer()
  const { prefix: pricePrefix, value: priceDigits, suffix: priceSuffix } = splitPrice(countryOffer.displayPrice)

  // Real answers if present; otherwise the sample so the sandbox renders directly.
  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${STORE}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers ?? SAMPLE_ANSWERS

  // Direct checkout (visual test). No funnel/pixel events fire from this sandbox.
  const handleBuy = () => {
    setLoading(true)
    const attribution = getAttribution()
    const attemptId = getFunnelSessionId()
    let checkoutUrl = countryOffer.checkoutUrl || '/'
    const params = new URLSearchParams()
    if (attemptId) params.set('src', attemptId)
    if (attribution?.utm_source) params.set('utm_source', attribution.utm_source)
    if (attribution?.utm_medium) params.set('utm_medium', attribution.utm_medium)
    if (attribution?.utm_campaign) params.set('utm_campaign', attribution.utm_campaign)
    const qs = params.toString()
    if (qs) checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + qs
    setTimeout(() => { window.location.href = checkoutUrl }, 600)
  }

  const name = displayName(answers)
  const rows = getAnswerRows(answers)

  const FAQ = [
    { q: '¿Qué recibiré al activar mi acceso?', a: 'Recibirás tus 3 recetas completas, tu plan de 4 fases (cada una con 3 semanas), la biblioteca con 26 recetas, la aplicación con seguimiento del progreso, la comunidad y la receta adicional de alineación casera.' },
    { q: '¿Las tres recetas aparecerán completas?', a: 'Sí. Después de activar tu acceso podrás consultar los ingredientes, cantidades, preparación e instrucciones de las tres recetas.' },
    { q: '¿Qué es el plan de 4 fases?', a: 'Es la forma en que NatGlow organiza tu rutina dentro de la aplicación: 4 fases, cada una con 3 semanas y recetas diferentes según cada objetivo, para que sepas qué cuidado realizar en cada momento sin hacer todo al mismo tiempo.' },
    { q: '¿Es un pago único?', a: `Sí. El acceso se activa con un solo pago de ${countryOffer.displayPrice}. No hay mensualidades.` },
    { q: '¿En qué moneda se cobra?', a: 'El precio se muestra en dólares y el checkout lo convierte automáticamente al valor equivalente en la moneda de tu país al momento de pagar.' },
    { q: '¿Cuándo recibiré el acceso?', a: 'El acceso se libera después de la confirmación del pago. Recibirás las instrucciones utilizando los datos informados en el checkout.' },
    { q: '¿Puedo usar NatGlow desde el celular?', a: 'Sí. NatGlow funciona directamente desde el navegador y también puede instalarse en la pantalla de inicio del celular.' },
    { q: '¿Necesito comprar productos caros?', a: 'No. Las recetas utilizan ingredientes simples y la aplicación también muestra opciones para diferentes tipos de rutina.' },
    { q: '¿Cómo funciona la garantía de 30 días?', a: 'Después de la compra tendrás 30 días para explorar NatGlow. Si decides que el acceso no es para ti, podrás solicitar el reembolso dentro del plazo de garantía, según las condiciones de compra.' },
    { q: '¿Las recetas garantizan un resultado específico?', a: 'No. Cada cabello responde de una manera diferente. NatGlow ofrece recetas, instrucciones y una forma organizada de acompañar los cuidados, pero los resultados pueden variar.' },
    { q: '¿Tendré acceso para siempre?', a: 'Sí. Tu acceso es permanente: no tendrás que pagar mensualidades para continuar consultando el contenido disponible en tu cuenta.' },
  ]

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto w-full px-4 pt-6 pb-12 flex flex-col gap-10" style={{ maxWidth: 560 }}>

        {/* ═══ 1 · HEADER ═══ */}
        <section className="flex flex-col gap-4">
          <span className="self-center inline-flex items-center px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
            ✅ EVALUACIÓN COMPLETADA
          </span>

          <h1 className="text-[26px] font-extrabold text-stone-900 leading-relaxed text-center">
            {name ? `${name}, encontramos ` : 'Encontramos '}
            <HL>3 recetas caseras</HL>
            {' que pueden encajar con tus principales objetivos 😲'}
          </h1>
          <p className="text-[15px] text-stone-500 leading-relaxed text-center">
            Tomamos en cuenta lo que nos contaste sobre tu tipo de cabello, tono, hábitos y objetivos para mostrarte un punto de partida sencillo.
          </p>

          <div className="mt-1">
            <AnswerTable rows={rows} />
          </div>

          <Card tinted className="p-5 flex flex-col gap-2 mt-1">
            <h2 className="text-base font-extrabold" style={{ color: P_DARK }}>🌿 Tu punto de partida</h2>
            <p className="text-sm text-stone-700 leading-relaxed">{getStartingPointText(answers)}</p>
          </Card>
        </section>

        {/* ═══ 2 · THE 3 LOCKED RECIPES ═══ */}
        <section className="flex flex-col gap-3">
            <div className="text-center flex flex-col gap-2">
              <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
                {name ? `${name}, estas 3 recetas caseras ` : 'Estas 3 recetas caseras '}
                las seleccionamos <HL>especialmente para ti</HL>
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Normalmente encontramos solo una receta compatible por persona. Según tus respuestas, en tu caso hay <span className="font-bold" style={{ color: P_DARK }}>3 recetas compatibles</span>. Puedes empezar por la que prefieras o probar cuál se adapta mejor a tu cabello.
              </p>
              <p className="text-xs text-stone-400 leading-relaxed">
                Los ingredientes, cantidades, preparación y frecuencia se desbloquean dentro de NatGlow.
              </p>
            </div>

            <LockedRecipeCards answers={answers} />
        </section>

        {/* ═══ 3 · HABITS FOUND IN THE ANSWERS ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
              Encontramos algunos <HL>hábitos</HL> en tus respuestas que pueden estar afectando tu cabello
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Son pequeños ajustes en tu rutina que, según tus respuestas, podrían ayudarte a acercarte a tus objetivos. Los verás detallados dentro de NatGlow.
            </p>
          </div>
          <LockedHabitsCard answers={answers} />
        </section>

        {/* ═══ 4 · BEFORE / AFTER COMPARISON ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
              Lo que una <HL>rutina constante</HL> puede cambiar
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Arrastra la barra para comparar. Experiencia individual: los resultados pueden variar.
            </p>
          </div>
          <BeforeAfterSlider
            beforeUrl={`${IMG_NATGLOW}/foto-a-1.webp`}
            afterUrl={`${IMG_NATGLOW}/foto-b-1.webp`}
          />
        </section>

        {/* ═══ 5 · OFFER PRICE CARD (direct Hotmart checkout) ═══ */}
        <section className="flex flex-col gap-3">
          <div className="rounded-3xl overflow-hidden bg-white border border-stone-100" style={{ boxShadow: '0 14px 44px rgba(0,0,0,0.07)' }}>
            <div className="py-2.5 px-6 text-center text-white text-sm font-bold flex items-center justify-center gap-2" style={{ background: '#C0392B' }}>
              <Clock className="w-4 h-4" />
              <span>Esta oferta termina en <Countdown /></span>
            </div>

            <div className="px-6 pt-6 pb-7">
              <h2 className="text-xl font-extrabold text-stone-900 text-center leading-tight">
                Desbloquea tus 3 recetas y todo lo que incluye tu acceso
              </h2>
              <p className="text-sm text-stone-500 text-center mt-2.5 leading-snug">
                Consulta las recetas completas y sigue los pasos desde tu celular, todo organizado dentro de nuestra aplicación.
              </p>

              <div className="rounded-2xl mt-5 px-5 py-8 text-center" style={{ background: '#FFF5FA', border: '1px solid #FFE4F2' }}>
                <div className="flex items-end justify-center gap-3">
                  <div className="flex items-end gap-1">
                    <span className="text-base font-bold text-stone-400 mb-2">{pricePrefix}</span>
                    <span className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: P_DARK }}>
                      {priceDigits}
                    </span>
                    {priceSuffix && <span className="text-base font-bold text-stone-400 mb-2">{priceSuffix}</span>}
                  </div>
                  <div className="flex flex-col items-start gap-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: P }}>
                      OFERTA
                    </span>
                    <span className="text-sm text-stone-400 line-through decoration-stone-300">
                      {countryOffer.oldPrice}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3.5">TU ACCESO INCLUYE</p>
                <ul className="flex flex-col gap-3">
                  {RESULTS_INCLUDES.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PINK_BG }}>
                        <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: P_DARK }} />
                      </span>
                      <span className="text-sm text-stone-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7">
                <PinkButton onClick={handleBuy}>
                  {loading ? 'Espera...' : <>DESBLOQUEAR MIS 3 RECETAS <ArrowRight className="w-4 h-4" /></>}
                </PinkButton>
                <div className="flex items-center justify-center gap-1.5 mt-3.5 text-xs text-stone-500">
                  <Lock className="w-3.5 h-3.5" /> Acceso inmediato después del pago.
                </div>
                <p className="text-[11px] text-stone-400 text-center leading-snug mt-1.5">
                  El precio se muestra en dólares y se convierte al valor equivalente en la moneda de tu país en el checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 6 · 30-DAY GUARANTEE ═══ */}
        <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-center gap-4">
          <span className="text-3xl flex-shrink-0 leading-none">🛡️</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 text-base leading-snug">Garantía de 30 días sin preguntas</p>
            <p className="text-sm text-stone-500 leading-snug mt-0.5">Riesgo cero, pruébalo y decide.</p>
          </div>
        </div>

        {/* ═══ 7 · FAQ ═══ */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold text-stone-900 text-center">Preguntas frecuentes</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
        </section>
      </div>

      <LegalLine />
    </div>
  )
}
