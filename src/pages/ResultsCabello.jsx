import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Lock, Clock, Search, Leaf, Sparkles } from 'lucide-react'

import { PRICING_PLANS } from '@/config/pricing'
import { getCountryOffer } from '@/config/countryOffers'
import { trackFunnelEvent, getFunnelSessionId } from '@/lib/trackFunnelEvent'
import { getAttribution } from '@/lib/tracking/attribution'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import LegalLine from '@/components/LegalLine'
import BeforeAfterTestimonialCarousel from '@/components/BeforeAfterTestimonialCarousel'
import { ESSENTIAL_CARDS, maskText, getCabelloTestimonials } from '@/lib/cabelloRecipes'
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData'
import {
  displayName, primaryGoal,
} from '@/lib/resultsCabello'

// ─────────────────────────────────────────────────────────────────────────────
// /quiz-cabello results page — it IS the sales page (PAIN → SOLUTION flow):
//   1. The person's risky habits, shown UNBLURRED in amber ("para revisar").
//   2. The accumulation angle (follicle image + age-based framing) → hope card.
//   3. Before/after (illustrative) → 4. the 21-day plan in the app's PLAN-tab
//      style, with recipe names + ingredients BLURRED (the paid solution) →
//      5. offer card (direct Hotmart checkout) → guarantee → FAQ.
//
// Funnel events fired here (needed by the admin): quiz_cabello_results_viewed on
// mount, offer_cabello_viewed when the offer card scrolls into view, cta_clicked
// (source 'offer_cabello') on buy. No answers → back to the quiz.
//
// Copy policy: possibility-based, Meta-safe. No diagnosis, no "daño/dañado", no
// guarantees. Habits read as "something to review", never an alarm.
// ─────────────────────────────────────────────────────────────────────────────

const STORE = 'cabello'
const IMG_NATGLOW = '/images/quiz-natglow'

const P         = '#FB45A9'
const P_DARK    = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const BG        = '#fafaf9'
const PINK_BG   = '#FFE4F2'

// Amber/neutral palette — used ONLY on the "habits to review" section. Amber (not
// red) keeps it as "something to look at", not an alarm/diagnosis (Meta-safer).
const AMBER      = '#F59E0B'
const AMBER_DARK = '#F59E0B'
const AMBER_BG   = '#FEF3E2'
const GREEN      = '#1E8449'

// Sample answers for the ?preview route (direct access, no quiz, no tracking).
const SAMPLE_ANSWERS = {
  name: 'Ana', age: '30_39', hairType: 'ondulado', hairTone: 'castano',
  hairLength: 'medio', washFreq: '3_4', waterTemp: 'hot', heatTools: 'few',
  chemProducts: 'aveces', scalpSensitivity: 'no', concerns: ['frizz', 'seco', 'puntas'],
  goals: ['frizz', 'brillo'], hairGoal: 'frizz', recipeExperience: 'poca',
  investment: 'basico', recipePref: 'pocos', symptomsIntensity: '1year',
}

// The person's main objective, in a phrase that fits "...dificultarte ___".
const GOAL_PHRASE = {
  frizz: 'controlar el frizz', brillo: 'recuperar el brillo',
  quiebre: 'reducir el quiebre', crecimiento: 'un crecimiento saludable',
  suavidad: 'sentir el cabello más suave', ondas: 'definir tus ondas',
  puntas: 'cuidar tus puntas',
}
const goalPhrase = (a) => GOAL_PHRASE[primaryGoal(a)] ?? 'tus objetivos'

// Accumulation framing by the age range chosen in the quiz — the older the range,
// the more years of lavados, calor y productos on the hair. Possibility-based.
const AGE_ACCUM = {
  '18_29':   'A tu edad, el cabello ya ha pasado por muchos lavados, secados y productos.',
  '30_39':   'Entre los 30 y los 39, es natural que el cabello ya haya pasado por años de lavados, calor y productos.',
  '40_49':   'Entre los 40 y los 49, es natural que el cabello ya haya pasado por muchos años de lavados, calor y productos.',
  '50_plus': 'Después de los 50, el cabello ya ha pasado por muchos años de lavados, calor y productos.',
}
const ageAccum = (a) => AGE_ACCUM[a?.age] ?? 'Con el día a día, el cabello va pasando por muchos lavados, calor y productos.'

// ── Habits to review, derived from the REAL answers ──────────────────────────
// Shown free (the reveal). Each rule carries a short, possibility-based note and
// an "impact" weight that drives the amber bar. Never a diagnosis.
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

// ── 21-day plan, in the app's PLAN-tab style (week accordions) ───────────────
// Each week is an accordion, like the /HairPlan tab inside the app, but the
// recipe names + ingredients are blurred. Weeks reference the 3 ESSENTIAL_CARDS
// by id so the blur reads the real recipe.
const PLAN_WEEKS = [
  {
    week: 1,
    desc: 'El primer paso es eliminar los residuos acumulados y recuperar la hidratación perdida. Empiezas suave, con una sola receta.',
    recipes: [{ id: 'babosa-mel', freq: '2 veces por semana' }],
    bonus: null,
    habits: [
      'Evita productos comerciales con sulfatos y parabenos',
      'Usa agua tibia o fría para lavar el cabello',
      'Evita la plancha y el secador esta semana',
      'Mantente bien hidratada, el cabello refleja la salud interna',
    ],
  },
  {
    week: 2,
    desc: 'Sigues con la hidratación y empiezas a construir nuevos hábitos con constancia. Incluye la receta opcional de progresiva casera.',
    recipes: [{ id: 'tratamento-noturno-oleo', freq: '1 vez por semana' }],
    bonus: {
      emoji: '✨',
      title: 'Progresiva casera de alineación',
      note: '¿Sientes que necesitas una progresiva? Esta versión casera ayuda a alinear los hilos 1 vez por semana, sin los químicos que se acumulan en la fibra.',
    },
    habits: [
      'Evita alisados químicos y progresivas con formol',
      'Termina la ducha con 30 segundos de agua fría',
      'Evita el secador, deja secar naturalmente cuando sea posible',
      'Duerme con el cabello suelto',
    ],
  },
  {
    week: 3,
    desc: 'Sellas los resultados logrados y creas una rutina que puedes sostener en el día a día.',
    recipes: [{ id: 'mel-de-babosa', freq: '2 veces por semana' }],
    bonus: null,
    habits: [
      'Mantén los hábitos de las semanas anteriores',
      'Evita herramientas de calor y químicos comerciales',
      'Observa la diferencia en brillo y suavidad',
      'Tómate una foto para comparar con el inicio',
    ],
  },
]

// One locked recipe row inside a week — blurred name + blurred ingredients
// (the real words never reach the DOM).
function LockedRecipeRow({ card, recipe, freq }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: PINK_BG }} aria-hidden>{card.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-700 leading-snug" aria-label="Receta disponible en tu acceso">
            {card.nameParts.map((part, i) => (
              <span key={i}>
                {i > 0 && ' '}
                {part.b
                  ? <span className="select-none align-baseline" style={{ filter: 'blur(5px)' }} aria-hidden="true">{part.b}</span>
                  : part.t}
              </span>
            ))}
          </p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: P_DARK }}>
            📅 {freq}{recipe?.duration_minutes ? ` · ⏱️ ${recipe.duration_minutes} min` : ''}
          </p>
        </div>
        <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: P_DARK }} />
      </div>
      <div className="relative overflow-hidden rounded-lg" style={{ background: '#faf7f8' }}>
        <p className="text-sm text-stone-600 p-3 select-none" style={{ filter: 'blur(5px)' }} aria-hidden="true">
          {maskText((recipe?.ingredients ?? []).join(' · ')) || 'xxxxxxxxxxx xxxxxxxxx xxxxx'}
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white" style={{ color: P_DARK, border: '1px solid #FFB3DD' }}>
            <Lock className="w-3 h-3" /> Ingredientes en tu acceso
          </span>
        </div>
      </div>
    </div>
  )
}

// A single week accordion, styled like the app's PLAN tab (numbered circle,
// expand). Expands to the week's locked recipes + the habits to adjust.
function PlanWeek({ data, getRecipeById, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const cards = data.recipes
    .map(r => ({ card: ESSENTIAL_CARDS.find(c => c.id === r.id), recipe: getRecipeById?.(r.id), freq: r.freq }))
    .filter(x => x.card)

  return (
    <div className="rounded-2xl border-2 overflow-hidden bg-white" style={{ borderColor: '#F0E4EC' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0" style={{ background: PINK_GRAD }}>
          {data.week}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-stone-800 text-sm">Semana {data.week}</p>
        </div>
        {open
          ? <ChevronUp className="w-5 h-5 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-stone-400 flex-shrink-0" />}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-5 pb-5 border-t border-stone-100 flex flex-col gap-4 pt-4"
        >
          <p className="text-sm text-stone-500 leading-relaxed">{data.desc}</p>

          <div className="flex flex-col gap-2.5">
            <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">Recetas de esta semana</p>
            {cards.map(({ card, recipe, freq }) => <LockedRecipeRow key={card.id} card={card} recipe={recipe} freq={freq} />)}

            {data.bonus && (
              <div className="rounded-xl border p-3.5 flex items-start gap-3" style={{ borderColor: '#FFE0B2', background: '#FFFBF3' }}>
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: '#FEF3E2' }} aria-hidden>{data.bonus.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-stone-800 leading-snug">{data.bonus.title}</p>
                    <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: '#FDE3B8', color: '#9A6B12' }}>USO OPCIONAL</span>
                  </div>
                  <p className="text-[12px] text-stone-500 leading-snug">{data.bonus.note}</p>
                </div>
                <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#B7791F' }} />
              </div>
            )}
          </div>

          <div>
            <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider mb-2.5">Hábitos de esta semana</p>
            <ul className="flex flex-col gap-2.5">
              {data.habits.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#E8F8F0' }}>
                    <Leaf className="w-2.5 h-2.5" style={{ color: GREEN }} />
                  </span>
                  <p className="text-[13px] text-stone-600 leading-snug">{h}</p>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  )
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

// Amber highlight — only for the "habits to review" section.
const HLReview = ({ children }) => (
  <span
    style={{
      background: AMBER,
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
    <div className="p-4 rounded-2xl border" style={{ borderColor: '#F3E3C6', background: '#FFFDF8' }}>
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: AMBER_BG }}>
          <Search className="w-4 h-4" strokeWidth={2.4} style={{ color: AMBER_DARK }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-stone-800 leading-snug">{label}</p>
          <p className="text-[13px] text-stone-500 leading-snug mt-0.5">{why}</p>

          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: AMBER_BG }}>
              <motion.div
                className="h-2 rounded-full"
                style={{ background: 'linear-gradient(90deg, #FCD34D, #F59E0B)' }}
                initial={{ width: 0 }}
                animate={{ width: `${w}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wide flex-shrink-0" style={{ color: AMBER_DARK }}>
              Para revisar
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
      aria-label="Comparar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      className="relative w-full overflow-hidden rounded-2xl select-none cursor-ew-resize outline-none"
      style={{ aspectRatio: '3/4', background: '#f5f5f4', touchAction: 'none' }}
    >
      <img
        src={afterUrl}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <img
        src={beforeUrl}
        alt=""
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

// ── Social-proof toast (bottom-left) ─────────────────────────────────────────
// Fictitious "activó su plan de 21 días" activity, cycling common LatAm female
// names + Spanish-speaking cities. Illustrative FOMO cue, not real records.
const PROOF_NAMES = [
  'Valentina', 'Camila', 'Sofía', 'Isabella', 'Mariana', 'Daniela', 'Gabriela',
  'Luciana', 'Antonella', 'Renata', 'Fernanda', 'Carolina', 'Andrea', 'Ximena',
  'Catalina', 'Paula', 'Micaela', 'Julieta',
]
const PROOF_PLACES = [
  'Bogotá, Colombia', 'Medellín, Colombia', 'Cali, Colombia',
  'Ciudad de México, México', 'Guadalajara, México', 'Monterrey, México',
  'Santiago, Chile', 'Lima, Perú', 'Quito, Ecuador', 'Guayaquil, Ecuador',
  'Buenos Aires, Argentina', 'Córdoba, Argentina', 'Montevideo, Uruguay',
  'San José, Costa Rica', 'Ciudad de Panamá, Panamá',
]
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function SocialProofToast() {
  const [item, setItem] = useState(null)
  const [raised, setRaised] = useState(false)
  useEffect(() => {
    const onScroll = () => setRaised(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    let showT, hideT
    let cancelled = false
    const cycle = () => {
      if (cancelled) return
      setItem({ name: pick(PROOF_NAMES), place: pick(PROOF_PLACES), mins: 2 + Math.floor(Math.random() * 27) })
      hideT = setTimeout(() => {
        if (cancelled) return
        setItem(null)
        showT = setTimeout(cycle, 12000 + Math.random() * 8000)
      }, 5000)
    }
    showT = setTimeout(cycle, 4000)
    return () => { cancelled = true; clearTimeout(showT); clearTimeout(hideT) }
  }, [])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0, x: -24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed left-4 z-50 max-w-[80vw]"
          style={{ width: 288, bottom: raised ? 84 : 16 }}
        >
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-stone-100 pl-3 pr-4 py-2.5" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.14)' }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#DCF3E4' }}>
              <Check className="w-4 h-4" strokeWidth={3} style={{ color: GREEN }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-stone-700 leading-snug">
                <span className="font-bold text-stone-900">{item.name}</span> activó su <span className="font-semibold">plan de 21 días</span>
              </p>
              <p className="text-[11px] text-stone-400 leading-snug mt-0.5 truncate">{item.place} · hace {item.mins} min</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Sticky bottom CTA bar — appears after the visitor scrolls past the first
// screen, so the price + button stays reachable through the long sales page.
function StickyBar({ priceDisplay, oldPrice, onBuy }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-0 inset-x-0 z-40 border-t border-stone-200"
          style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)', boxShadow: '0 -6px 24px rgba(0,0,0,0.08)' }}
        >
          <div className="mx-auto px-4 py-3 flex items-center gap-3" style={{ maxWidth: 560 }}>
            <div className="flex-shrink-0 leading-none">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold" style={{ color: P_DARK }}>{priceDisplay}</span>
                <span className="text-[11px] text-stone-400 line-through">{oldPrice}</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">Pago único</p>
            </div>
            <button
              onClick={onBuy}
              className="flex-1 py-3 rounded-full font-extrabold text-white text-sm flex items-center justify-center gap-2"
              style={{ background: PINK_GRAD, boxShadow: '0 4px 16px rgba(251,69,169,0.3)' }}
            >
              DESBLOQUEAR <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const RESULTS_INCLUDES = [
  'Tus 3 recetas ideales',
  'Tu plan personalizado de 21 días',
  '1 Receta de progresiva casera (bono)',
  '+ 26 recetas con objetivos diferentes',
  'Acceso a una app personalizada',
  'Acceso permanente, sin mensualidades',
]

export default function ResultsCabello({ pricingPlan = 'natglow', preview = false }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig
  const { state } = useLocation()
  const [loading, setLoading] = useState(false)
  // Country only applies when ?country= is in the URL (no auto/persisted). The
  // plain /quiz link resolves to the USD default ($3,90, plain Hotmart checkout).
  const countryOffer = getCountryOffer()
  const { prefix: pricePrefix, value: priceDigits, suffix: priceSuffix } = splitPrice(countryOffer.displayPrice)

  // Answers: navigation state first, then the key the quiz writes on completion
  // (so a refresh keeps the result).
  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${STORE}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers ?? (preview ? SAMPLE_ANSWERS : null)

  // Hooks must run before the no-answers early return, so declare them here.
  const { getRecipeById } = useTranslatedHairData()
  const offerCardRef = useRef(null)

  // quiz_cabello_results_viewed — on mount, once per attempt (survives a refresh).
  useEffect(() => {
    if (preview || !answers) return
    const attemptId = getFunnelSessionId()
    const key = `cabello_results_viewed_${attemptId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* storage blocked — fall through and fire once per mount */ }
    trackFunnelEvent('quiz_cabello_results_viewed', null, plan_key)
  }, [answers, plan_key, preview])

  // offer_cabello_viewed — fire only when the offer/price card scrolls into view
  // (not on mount), once per attempt, so the admin's "Viram a oferta" reflects who
  // really reached the offer. cta_clicked always fires from inside this card, so
  // offer_viewed always precedes it (keeps the sequential funnel correct).
  useEffect(() => {
    if (preview || !answers) return
    const el = offerCardRef.current
    if (!el) return
    const attemptId = getFunnelSessionId()
    const key = `cabello_offer_viewed_${attemptId}`
    try { if (sessionStorage.getItem(key)) return } catch { /* ignore */ }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
      trackFunnelEvent('offer_cabello_viewed', null, plan_key)
      io.disconnect()
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [answers, plan_key, preview])

  // ViewContent only. No Lead here (this funnel fires none) and no
  // InitiateCheckout on the CTA — Hotmart's pixel raises that on its own checkout.
  useEffect(() => {
    if (preview || !answers) return
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'results_cabello', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'results_cabello', content_category: plan_key, content_id: plan_key, content_type: 'product' })
    })
  }, [answers, plan_key, preview])

  // No answers (direct access) → back to the quiz.
  if (!answers) return <Navigate to="/quiz-cabello" replace />

  // Direct checkout. Fires cta_clicked with source 'offer_cabello' (once per
  // attempt) so the Hotmart webhook attributes the purchase to this funnel, then
  // redirects to the country's Hotmart checkout with the attempt id (src) + UTMs.
  // Hotmart owns InitiateCheckout/Purchase; only TikTok InitiateCheckout fires here.
  const ctaFiredRef = { current: false }
  const handleBuy = (placement = 'results_card') => {
    setLoading(true)
    const attribution = getAttribution()
    const attemptId = getFunnelSessionId()
    const key = `cabello_results_cta_${attemptId}`
    let alreadySent = false
    try { alreadySent = !!sessionStorage.getItem(key) } catch { /* ignore */ }
    if (!preview && !alreadySent && !ctaFiredRef.current) {
      ctaFiredRef.current = true
      try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
      const fbEventId = crypto.randomUUID()
      trackFunnelEvent('cta_clicked', {
        fb_event_id: fbEventId,
        source: 'offer_cabello',
        country: countryOffer.code,
        funnel: 'quiz_cabello',
        placement,
      }, plan_key)
      trackTtEvent('InitiateCheckout', { value: countryOffer.priceValue, currency: countryOffer.currency, content_name: plan_key, content_id: plan_key, content_type: 'product' }, fbEventId)
    }

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

  const scrollToOffer = () => offerCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const name = displayName(answers)
  const habits = deriveHabits(answers)
  const objetivo = goalPhrase(answers)
  const accumAge = ageAccum(answers)

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

        {/* ═══ 1 · HABITS TO REVIEW (shown free, amber) ═══ */}
        <section className="flex flex-col gap-4">
          <div className="text-center flex flex-col gap-2">
            <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider" style={{ background: PINK_BG, color: P_DARK }}>
              <Check className="w-3 h-3" /> EVALUACIÓN COMPLETADA
            </span>
            <h2 className="text-[26px] font-extrabold text-stone-900 leading-relaxed">
              {name ? `${name}, notamos ` : 'Notamos '}<HLReview>{habits.length} hábitos</HLReview> en tu rutina que podrían dificultarte {objetivo}
            </h2>
            <p className="text-[15px] text-stone-500 leading-relaxed">
              Son cosas que casi todas hacemos sin saber. Míralas con calma y más abajo verás cómo empezar a ajustarlas.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {habits.map((h, i) => <HabitBar key={i} {...h} />)}
          </div>
        </section>

        {/* ═══ 2 · THE ACCUMULATION + hope card ═══ */}
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
                <h2 className="text-lg font-extrabold text-stone-900 leading-snug">
                  Con el tiempo, el cabello acumula residuos
                </h2>
                <p className="text-[13px] text-stone-500 leading-snug mt-1">
                  Con la rutina del día a día (lavados, calor y productos), poco a poco pueden sumarse pequeños residuos.
                </p>
              </div>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              <span className="font-semibold text-stone-800">{accumAge}</span> Con el tiempo, esos residuos pueden hacer que los cuidados rindan un poco menos y que el brillo no dure tanto. La buena noticia es que, casi siempre, es cuestión de ajustar la rutina y no de hacer más.
            </p>
          </Card>

          {/* Pain → hope bridge: the 3 recipes reveal, in green tones. */}
          <div className="rounded-2xl border p-5 flex items-start gap-4" style={{ borderColor: '#BFE6CC', background: '#F1FAF4' }}>
            <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#DCF3E4' }}>
              <Sparkles className="w-5 h-5" style={{ color: GREEN }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: GREEN }}>¡Excelente noticia!</p>
              <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                {name ? `${name}, encontramos ` : 'Encontramos '}3 recetas caseras ideales para tu cabello
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed mt-1.5">
                Las seleccionamos según tu tipo de cabello, tu tono y tus objetivos. Son tu punto de partida para revertir la acumulación de forma natural, y las verás organizadas dentro de tu plan de 21 días.
              </p>
              <p className="text-sm font-bold mt-2.5 flex items-center gap-1.5" style={{ color: GREEN }}>
                👇 Sigue leyendo para entender cómo usarlas paso a paso
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 3 · SOLUTION + BEFORE / AFTER ═══ */}
        <section className="flex flex-col gap-3">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-[26px] font-extrabold text-stone-900 leading-relaxed">
              Puedes recuperar la <HL>belleza natural de tu cabello</HL>
              {'. Mira lo que una rutina constante puede cambiar'}
            </h2>
            <p className="text-[15px] text-stone-500 leading-relaxed">
              Arrastra la barra para comparar. Experiencia individual: los resultados pueden variar.
            </p>
          </div>
          <BeforeAfterSlider
            beforeUrl={`${IMG_NATGLOW}/foto-a-1.webp`}
            afterUrl={`${IMG_NATGLOW}/foto-b-1.webp`}
          />

          {/* Mid-page CTA — for visitors who already decided; scrolls to the offer. */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <PinkButton onClick={scrollToOffer}>
              QUIERO MI PLAN DE 21 DÍAS <ArrowRight className="w-4 h-4" />
            </PinkButton>
            <p className="text-xs text-stone-400">Pago único · Garantía de 30 días</p>
          </div>
        </section>

        {/* ═══ 4 · THE 21-DAY PLAN (app PLAN-tab style, recipes locked) ═══ */}
        <section className="flex flex-col gap-4">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-[26px] font-extrabold text-stone-900 leading-relaxed">
              {name ? `${name}, creamos un ` : 'Creamos un '}
              <HL>plan personalizado de 21 días</HL>
              {' para ti'}
            </h2>
            <p className="text-[15px] text-stone-500 leading-relaxed">
              Reúne tus 3 recetas ideales, elegidas según tu tipo de cabello, tu tono y los hábitos por ajustar, y las organiza semana a semana para que cada cuidado tenga su momento.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {PLAN_WEEKS.map((wk, i) => (
              <PlanWeek key={wk.week} data={wk} getRecipeById={getRecipeById} defaultOpen={i === 0} />
            ))}
          </div>
        </section>

        {/* ═══ 5 · OFFER PRICE CARD (direct Hotmart checkout) ═══ */}
        <section ref={offerCardRef} className="flex flex-col gap-3">
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
                Consulta las recetas completas y sigue tu plan de 21 días, todo organizado y listo para empezar.
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
                <PinkButton onClick={() => handleBuy('results_card')}>
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

        {/* ═══ 5b · TESTIMONIALS (same as the offer page) ═══ */}
        <section className="flex flex-col gap-4">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-[26px] font-extrabold text-stone-900 leading-relaxed">
              Experiencias compartidas por mujeres de la comunidad
            </h2>
            <p className="text-[15px] text-stone-500 leading-relaxed">
              Cada cabello responde de una forma diferente, pero tener las recetas y los pasos organizados puede hacer que la rutina sea mucho más fácil de acompañar.
            </p>
          </div>
          <BeforeAfterTestimonialCarousel
            testimonials={getCabelloTestimonials(countryOffer.code)}
            verifiedBadgeTemplate="🌿 Experiencia compartida en nuestra app · Comunidad"
            showBeforeAfterLabels={false}
            showStars={false}
            intervalMs={9000}
            cardBorder="border-stone-100"
            accentColor={P}
            accentDark={P_DARK}
          />
          <p className="text-[11px] text-stone-400 text-center italic">
            Experiencia individual. Los resultados pueden variar.
          </p>
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

      <SocialProofToast />
      <StickyBar
        priceDisplay={countryOffer.displayPrice}
        oldPrice={countryOffer.oldPrice}
        onBuy={() => handleBuy('sticky_bar')}
      />
      <LegalLine />
      <div aria-hidden style={{ height: 72 }} />
    </div>
  )
}
