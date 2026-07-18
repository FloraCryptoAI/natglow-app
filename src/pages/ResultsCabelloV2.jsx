import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Lock, Clock, AlertTriangle, Leaf } from 'lucide-react'

import { PRICING_PLANS } from '@/config/pricing'
import { getCountryOffer } from '@/config/countryOffers'
import { getFunnelSessionId } from '@/lib/trackFunnelEvent'
import { getAttribution } from '@/lib/tracking/attribution'
import LegalLine from '@/components/LegalLine'
import AnswerTable from '@/components/quiz-cabello/AnswerTable'
import { LockedRecipeCards } from '@/components/quiz-cabello/LockedCards'
import {
  getAnswerRows, getStartingPointText, displayName, primaryGoal,
} from '@/lib/resultsCabello'

// ─────────────────────────────────────────────────────────────────────────────
// SANDBOX/DRAFT of the /quiz results page (route: /quiz-cabello/results-v2).
// A copy of ResultsCabello for iterating on the new PAIN → SOLUTION sales design
// WITHOUT touching the live funnel. Differences from the real page:
//   • Renders with SAMPLE_ANSWERS when opened directly (no quiz needed, no redirect).
//   • Fires NO funnel/pixel events (so previews don't pollute the admin).
//   • The buy button still redirects to the real Hotmart checkout (visual test).
//   • The person's risky habits are shown UNBLURRED (the pain reveal); only the
//     3 recipes stay locked/blurred (the paid solution).
// When the design is approved, its changes get ported back into ResultsCabello.
//
// Copy policy (same as the whole funnel): possibility-based, Meta-safe. No medical
// diagnosis, no "daño/dañado", no guarantees — "puede", "suele", "ayuda a".
// ─────────────────────────────────────────────────────────────────────────────

const STORE = 'cabello'
const IMG_NATGLOW = '/images/quiz-natglow'

const P         = '#FB45A9'
const P_DARK    = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const BG        = '#fafaf9'
const PINK_BG   = '#FFE4F2'

// Red palette — used ONLY on the "problem" section so the routine mistakes read
// as something to fix. The rest of the page stays in the brand pink.
const RED       = '#DC2626'
const RED_DARK  = '#B91C1C'
const RED_BG    = '#FEECEC'
const GREEN     = '#1E8449'

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
  symptomsIntensity: '1year',
}

// The person's main objective, in a phrase that fits "...alejándote de ___".
const GOAL_PHRASE = {
  frizz: 'controlar el frizz', brillo: 'recuperar el brillo',
  quiebre: 'reducir el quiebre', crecimiento: 'un crecimiento saludable',
  suavidad: 'sentir el cabello más suave', ondas: 'definir tus ondas',
  puntas: 'cuidar tus puntas',
}
const goalPhrase = (a) => GOAL_PHRASE[primaryGoal(a)] ?? 'tus objetivos'

// ── Risky habits, derived from the REAL answers ──────────────────────────────
// Shown free and in red (the pain reveal). Each rule carries a short, possibility
// -based consequence and an "impact" weight that drives the bar. Never a
// diagnosis — "puede", "suele", "ayuda a".
const HABIT_RULES = [
  { when: a => a?.chemProducts === 'frecuente', label: 'Procesos químicos frecuentes',        why: 'Tinturas, decoloraciones o alisados dejan residuos que se acumulan en la fibra.', impact: 95 },
  { when: a => a?.heatTools === 'daily',        label: 'Usas plancha o secador todos los días', why: 'El calor diario, sin protección, suele marcar las puntas con el tiempo.',        impact: 90 },
  { when: a => a?.waterTemp === 'hot',          label: 'Lavas con agua muy caliente',          why: 'El agua caliente abre las cutículas y suele resecar, dejando más frizz.',        impact: 82 },
  { when: a => a?.heatTools === 'few',          label: 'Usas herramientas de calor con frecuencia', why: 'El calor repetido va desgastando las hebras poco a poco.',                    impact: 70 },
  { when: a => a?.chemProducts === 'aveces',    label: 'Procesos químicos de vez en cuando',   why: 'Aunque ocasionales, dejan residuos que se acumulan sin cuidados de apoyo.',       impact: 64 },
  { when: a => a?.washFreq === 'daily',         label: 'Lavas el cabello todos los días',      why: 'El lavado diario suele retirar los aceites naturales que protegen el cabello.',   impact: 60 },
]
const HABIT_FALLBACK = [
  { label: 'Cuidados sin una frecuencia definida',      why: 'Sin constancia, el cabello no llega a responder a ningún cuidado.', impact: 55 },
  { label: 'Productos que no consideran tu tipo de cabello', why: 'Lo que le funciona a otro cabello puede no encajar con el tuyo.', impact: 50 },
  { label: 'Usar más producto del necesario',           why: 'El exceso se acumula y termina pesando sobre las hebras.',          impact: 45 },
]
function deriveHabits(a) {
  const found = HABIT_RULES.filter(h => h.when(a)).map(({ label, why, impact }) => ({ label, why, impact }))
  for (const f of HABIT_FALLBACK) {
    if (found.length >= 3) break
    if (!found.some(h => h.label === f.label)) found.push(f)
  }
  return found.slice(0, 5)
}
const impactLevel = (n) => (n >= 80 ? 'Alto' : n >= 62 ? 'Medio-alto' : 'Medio')

// ── 21-day routine preview, derived from the SAME answers ────────────────────
// Turns each risky habit found above into a concrete swap, so the plan reads as
// the direct fix for what juega en contra. The recipe step is always first.
const ROUTINE_SWAPS = [
  { when: a => a?.waterTemp === 'hot',          text: 'Cambia el agua muy caliente por agua tibia al enjuagar' },
  { when: a => a?.heatTools === 'daily',        text: 'Reduce la plancha o el secador y usa protección antes del calor' },
  { when: a => a?.heatTools === 'few',          text: 'Espacia el uso de calor y protege el cabello antes de aplicarlo' },
  { when: a => a?.chemProducts === 'frecuente', text: 'Espacia los procesos químicos y refuerza con hidratación de apoyo' },
  { when: a => a?.chemProducts === 'aveces',    text: 'Acompaña cada proceso químico con una receta de hidratación' },
  { when: a => a?.washFreq === 'daily',         text: 'Reduce la frecuencia de lavado para conservar los aceites naturales' },
]
const ROUTINE_FALLBACK = [
  'Mantén una frecuencia fija de cuidados, sin saltarte semanas',
  'Usa solo la cantidad de producto que tu cabello necesita',
]
function deriveRoutine(a) {
  const steps = ['Aplica 1 de tus 3 recetas caseras, 1 vez por semana']
  for (const s of ROUTINE_SWAPS) if (s.when(a)) steps.push(s.text)
  for (const f of ROUTINE_FALLBACK) {
    if (steps.length >= 4) break
    if (!steps.includes(f)) steps.push(f)
  }
  return steps.slice(0, 4)
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

// Red highlight — only for the problem section.
const HLRed = ({ children }) => (
  <span
    style={{
      background: RED,
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

function HabitBar({ label, why, impact }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(impact))
    return () => cancelAnimationFrame(id)
  }, [impact])
  return (
    <div className="p-4 rounded-2xl border" style={{ borderColor: '#F6D2D2', background: '#FFFAFA' }}>
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: RED_BG }}>
          <AlertTriangle className="w-4 h-4" strokeWidth={2.4} style={{ color: RED }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-stone-800 leading-snug">{label}</p>
          <p className="text-[13px] text-stone-500 leading-snug mt-0.5">{why}</p>

          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: RED_BG }}>
              <motion.div
                className="h-2 rounded-full"
                style={{ background: `linear-gradient(90deg, #F87171, ${RED_DARK})` }}
                initial={{ width: 0 }}
                animate={{ width: `${w}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wide flex-shrink-0" style={{ color: RED_DARK }}>
              {impactLevel(impact)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  'Tus 3 recetas completas (ingredientes, cantidades y preparación)',
  'Tu plan personalizado de 21 días, paso a paso',
  'Biblioteca con 26 recetas para cada objetivo',
  'Todo organizado en una aplicación, desde tu celular',
  'Acceso permanente, sin mensualidades',
]

const SOLUTION_POINTS = [
  { t: 'No se acumulan', d: 'Ingredientes naturales que trabajan con tu cabello, sin dejar capas encima.' },
  { t: 'Frecuencia clara', d: 'Sabes qué hacer cada semana, sin probar todo al mismo tiempo.' },
  { t: 'Simple y económico', d: 'Recetas con pocos ingredientes, fáciles de encontrar en casa.' },
]

export default function ResultsCabelloV2({ pricingPlan = 'natglow' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig // eslint-disable-line no-unused-vars
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
  const habits = deriveHabits(answers)
  const routine = deriveRoutine(answers)
  const objetivo = goalPhrase(answers)
  const longTime = answers?.symptomsIntensity === '1year'

  const FAQ = [
    { q: '¿Qué recibiré al activar mi acceso?', a: 'Recibirás tus 3 recetas completas, tu plan personalizado de 21 días, la biblioteca con 26 recetas, la aplicación con seguimiento del progreso y la comunidad.' },
    { q: '¿Las tres recetas aparecerán completas?', a: 'Sí. Después de activar tu acceso podrás consultar los ingredientes, cantidades, preparación e instrucciones de las tres recetas.' },
    { q: '¿Qué es el plan de 21 días?', a: 'Es la forma en que NatGlow organiza tu rutina dentro de la aplicación: día a día combina tus 3 recetas con pequeños cambios de hábitos, para que sepas exactamente qué cuidado realizar en cada momento sin hacer todo al mismo tiempo.' },
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

        {/* ═══ 1 · HEADER — the reveal ═══ */}
        <section className="flex flex-col gap-4">
          <span className="self-center inline-flex items-center px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
            ✅ EVALUACIÓN COMPLETADA
          </span>

          <h1 className="text-[26px] font-extrabold text-stone-900 leading-relaxed text-center">
            {name ? `${name}, tu evaluación reveló ` : 'Tu evaluación reveló '}
            <HLRed>algunos hábitos</HLRed>
            {' que pueden estar frenando tu cabello'}
          </h1>
          <p className="text-[15px] text-stone-500 leading-relaxed text-center">
            Analizamos tu tipo de cabello, tu tono, tus hábitos y tus objetivos. Esto es lo que encontramos — y cómo una rutina natural puede ayudarte a cambiarlo.
          </p>

          <div className="mt-1">
            <AnswerTable rows={rows} />
          </div>
        </section>

        {/* ═══ 2 · THE PROBLEM — risky habits shown FREE, in red, with bars ═══ */}
        <section className="flex flex-col gap-4">
          <div className="text-center flex flex-col gap-2">
            <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider" style={{ background: RED_BG, color: RED_DARK }}>
              <AlertTriangle className="w-3 h-3" /> LO QUE JUEGA EN CONTRA
            </span>
            <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
              Encontramos <HLRed>{habits.length} hábitos</HLRed> en tu rutina que pueden estar alejándote de {objetivo}
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              No es tu culpa: son cosas que casi todas hacemos sin saber. Míralas con calma — más abajo verás cómo empezar a corregirlas.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {habits.map((h, i) => <HabitBar key={i} {...h} />)}
          </div>
        </section>

        {/* ═══ 3 · THE ACCUMULATION — follicle image + years of buildup ═══ */}
        <section className="flex flex-col gap-3">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100">
                <img
                  src={`${IMG_NATGLOW}/follicle-damaged.webp`}
                  alt="Folículo con acumulación"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold leading-snug" style={{ color: RED_DARK }}>
                  {longTime ? 'Años acumulando residuos en tu cabello' : 'La acumulación empieza antes de lo que crees'}
                </h2>
                <p className="text-[13px] text-stone-500 leading-snug mt-1">
                  Cada lavado, cada plancha y cada producto deja una capa que se va sumando con el tiempo.
                </p>
              </div>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              Por eso muchas veces sientes que <span className="font-semibold text-stone-800">nada funciona como antes</span>: el cabello ya no absorbe el cuidado como debería, se ve apagado y cuesta más peinarlo. No es que hayas hecho algo mal — es que la rutina nunca fue pensada para <span className="font-semibold text-stone-800">tu</span> cabello.
            </p>
          </Card>
        </section>

        {/* ═══ 4 · THE TURNING POINT — natural routine as the solution ═══ */}
        <section className="flex flex-col gap-4">
          <div className="text-center flex flex-col gap-2">
            <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: GREEN }}>
              <Leaf className="w-3 h-3" /> LA BUENA NOTICIA
            </span>
            <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
              Esto se puede revertir con una <HL>rutina natural constante</HL>
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              A diferencia de los químicos, las recetas caseras no se acumulan: trabajan <span className="font-semibold text-stone-800">con</span> tu cabello, no contra él. Con ingredientes simples y una frecuencia clara, ayudas a tu cabello a recuperar equilibrio, brillo y movimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {SOLUTION_POINTS.map((p, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-3.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#E8F8F0' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: GREEN }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-stone-800 leading-snug">{p.t}</p>
                  <p className="text-[13px] text-stone-500 leading-snug mt-0.5">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 5 · THE 3 RECIPES (locked — the paid solution) ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
              {name ? `${name}, seleccionamos 3 recetas caseras ` : 'Seleccionamos 3 recetas caseras '}
              <HL>especialmente para tu cabello</HL>
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Las elegimos según tu tipo de cabello, tu tono y tus objetivos. Son tu punto de partida: puedes empezar por la que prefieras o probar cuál se adapta mejor.
            </p>
          </div>

          <Card tinted className="p-5 flex flex-col gap-2">
            <h3 className="text-base font-extrabold" style={{ color: P_DARK }}>🌿 Tu punto de partida</h3>
            <p className="text-sm text-stone-700 leading-relaxed">{getStartingPointText(answers)}</p>
          </Card>

          <LockedRecipeCards answers={answers} />

          <p className="text-xs text-stone-400 leading-relaxed text-center px-2">
            Los ingredientes, cantidades, preparación y frecuencia se desbloquean dentro de NatGlow.
          </p>
        </section>

        {/* ═══ 6 · THE PLAN — personalized 21-day routine ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-xl font-extrabold text-stone-900 leading-relaxed">
              Y un <HL>plan personalizado de 21 días</HL> para saber exactamente qué hacer
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Nada de probar todo al mismo tiempo. Tu plan combina tus 3 recetas con pequeños cambios en tu rutina, día a día, para corregir justo los hábitos que encontramos arriba.
            </p>
          </div>

          {/* Concrete routine preview, derived from her answers. */}
          <Card className="p-5 flex flex-col gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: P_DARK }}>
              Así se ve tu rutina
            </p>
            <div className="flex flex-col gap-3">
              {routine.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-extrabold text-white" style={{ background: PINK_GRAD }}>
                    {i + 1}
                  </span>
                  <p className="text-sm text-stone-700 leading-snug flex-1 min-w-0">{step}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 leading-relaxed pt-1">
              Este es solo un adelanto. Dentro de NatGlow encuentras el plan completo de 21 días, con las cantidades, la frecuencia y el orden de cada cuidado.
            </p>
          </Card>

          <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '4/3' }}>
            <img
              src={`${IMG_NATGLOW}/app-mockup.webp`}
              alt="Plan de rutina en la aplicación"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </section>

        {/* ═══ 7 · BEFORE / AFTER COMPARISON ═══ */}
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

        {/* ═══ 8 · OFFER PRICE CARD (direct Hotmart checkout) ═══ */}
        <section className="flex flex-col gap-3">
          <div className="rounded-3xl overflow-hidden bg-white border border-stone-100" style={{ boxShadow: '0 14px 44px rgba(0,0,0,0.07)' }}>
            <div className="py-2.5 px-6 text-center text-white text-sm font-bold flex items-center justify-center gap-2" style={{ background: '#C0392B' }}>
              <Clock className="w-4 h-4" />
              <span>Esta oferta termina en <Countdown /></span>
            </div>

            <div className="px-6 pt-6 pb-7">
              <h2 className="text-xl font-extrabold text-stone-900 text-center leading-tight">
                Desbloquea tus 3 recetas y tu plan personalizado
              </h2>
              <p className="text-sm text-stone-500 text-center mt-2.5 leading-snug">
                Consulta las recetas completas y sigue tu plan paso a paso desde tu celular, todo organizado dentro de nuestra aplicación.
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
                  {loading ? 'Espera...' : <>DESBLOQUEAR RECETAS Y PLAN <ArrowRight className="w-4 h-4" /></>}
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

        {/* ═══ 9 · 30-DAY GUARANTEE ═══ */}
        <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-center gap-4">
          <span className="text-3xl flex-shrink-0 leading-none">🛡️</span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 text-base leading-snug">Garantía de 30 días sin preguntas</p>
            <p className="text-sm text-stone-500 leading-snug mt-0.5">Riesgo cero, pruébalo y decide.</p>
          </div>
        </div>

        {/* ═══ 10 · FAQ ═══ */}
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
