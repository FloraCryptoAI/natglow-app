import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, X, Leaf, Sparkles, Droplets } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent, startFunnelSession } from '@/lib/trackFunnelEvent'
import { captureAttribution } from '@/lib/tracking/attribution'
import { captureCountry, getCountryOffer } from '@/config/countryOffers'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'
import TestimonialCard from '@/components/quiz/TestimonialCard'
import { displayName } from '@/lib/resultsCabello'
// Aliased: this file already has a STEPS.SOCIAL_PROOF step key.
import { SOCIAL_PROOF as PROOF, getQuizTestimonial } from '@/lib/cabelloRecipes'

// Own sessionStorage namespace — this funnel never shares quiz state with
// /quiz (natglow), /quiz-meta or /quiz-detox.
const STORE = 'cabello'
// The three intro screens are kept byte-for-byte from /quiz, so they still read
// their images from the natglow folder (nothing there is modified).
const IMG_NATGLOW = '/images/quiz-natglow'
// Images that belong to THIS funnel only.
const IMG = '/images/quiz-cabello'

// 28 numbered steps. Every screen from SIGNS through FINAL counts as a step
// (including the informative and testimonial screens), matching /quiz's rule.
const STEPS = {
  WELCOME: 0,
  SIGNS: 1,             // kept from /quiz
  EDU_ROUTINE: 2,       // kept from /quiz, unchanged
  REFRAMING: 3,         // kept from /quiz
  AGE: 4,
  TONE: 5,
  EDU_TONE: 6,
  NAME: 7,
  PHOTOS: 8,
  MIRROR: 9,
  FEELING: 10,
  HESITATION: 11,
  EDU_PERSONAL: 12,
  HAIR_TYPE: 13,
  LENGTH: 14,
  SENSITIVITY: 15,
  CONCERNS: 16,         // multi
  GOALS: 17,            // multi, kept from /quiz
  WASH_FREQ: 18,
  WATER_TEMP: 19,
  HEAT_TOOLS: 20,
  SOCIAL_PROOF: 21,
  CHEM: 22,
  EXPERIENCE: 23,
  COMMITMENT: 24,
  FUTURE: 25,           // multi
  INVESTMENT: 26,
  RECIPE_PREF: 27,
  FINAL: 28,            // congratulations screen
  ANALYSIS: 29,         // not numbered
}
const TOTAL_QUIZ_STEPS = 28

const P = '#FB45A9'
const P_DARK = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const PL2 = '#FFE4F2'
// Only used by the kept "rutina equilibrada" vs "acumulación" comparison labels.
const GREEN = '#27AE60'

const slide = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.25 },
}

// The bar opens already half full and fills the remaining half across the quiz,
// so the first screen reads as "almost there" instead of "27 more to go". 100%
// is only reached on the last step, when the quiz really is complete.
const PROGRESS_FLOOR = 50

// Each quiz screen is a separate element under AnimatePresence, so the header's
// ProgressBar REMOUNTS on every step. With `initial={{ width: 0 }}` that made the
// bar visibly snap back to zero and re-fill each time. We instead remember the
// last width in a module variable and start the new bar from there, so it only
// ever grows forward. The variable is written in an effect (never during
// render) to stay correct under React StrictMode's double-render.
let lastProgressPct = PROGRESS_FLOOR

function ProgressBar({ current, total }) {
  const pct = Math.round(PROGRESS_FLOOR + (current / total) * (100 - PROGRESS_FLOOR))
  // Never animate backwards: on a restart (bar was at 100%) or a step back, start
  // from the new, lower value so the bar settles there instead of shrinking.
  const from = Math.min(lastProgressPct, pct)
  useEffect(() => { lastProgressPct = pct }, [pct])
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5">
      <motion.div
        className="h-1.5 rounded-full"
        style={{ background: P }}
        initial={{ width: `${from}%` }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  )
}

// Bar for non-question screens (educational/testimonial/name) that still count
// toward the step sequence.
//
// No "PASO X DE 28" badge anywhere in this funnel: a high step count shown up
// front is a reason to quit, so the bar carries the progress on its own.
function StepProgress({ current, total }) {
  return <ProgressBar current={current} total={total} />
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

function hlTitle(title, highlight) {
  if (!highlight) return title
  const idx = title.indexOf(highlight)
  if (idx === -1) return title
  return (
    <>
      {title.slice(0, idx)}
      <HL>{highlight}</HL>
      {title.slice(idx + highlight.length)}
    </>
  )
}

function StepHead({ current, total, title, highlight, subtitle }) {
  return (
    <div className="flex flex-col gap-4">
      <ProgressBar current={current} total={total} />
      <div className="text-center flex flex-col gap-3 pt-1.5">
        <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">{hlTitle(title, highlight)}</h2>
        {subtitle && <p className="text-sm text-stone-400 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  )
}

function QuizOption({ label, desc, emoji, selected, onClick }) {
  return (
    <div
      className={`card-option px-5 py-5 flex items-center gap-4 ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {emoji && <span className="text-3xl leading-none flex-shrink-0">{emoji}</span>}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-700 text-base leading-snug">{label}</p>
        {desc && <p className="text-sm text-stone-400 mt-0.5 leading-snug">{desc}</p>}
      </div>
      {selected && <Check className="w-5 h-5 flex-shrink-0" style={{ color: P }} />}
    </div>
  )
}

function PinkButton({ children, onClick, pulse = true, disabled = false }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      animate={pulse && !disabled ? { scale: [1, 1.03, 1] } : {}}
      transition={pulse && !disabled ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="w-full py-5 font-extrabold text-white rounded-full text-base flex items-center justify-center gap-2"
      style={{
        background: PINK_GRAD,
        boxShadow: '0 4px 24px rgba(251,69,169,0.35)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </motion.button>
  )
}

// White card with a soft border + tinted icon circle — same identity as the
// /quiz welcome screen.
function FeatureRow({ icon, iconColor, chip, text }) {
  const Icon = icon
  return (
    <div className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: chip }}>
        <Icon className="w-5 h-5" strokeWidth={2.2} style={{ color: iconColor }} />
      </div>
      <p className="text-sm text-stone-700 font-medium leading-snug">{text}</p>
    </div>
  )
}

// Soft pink info card — the identity used by the kept educational screens.
function TintedCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border ${className}`} style={{ borderColor: '#FFB3DD', background: '#FFF5FA' }}>
      {children}
    </div>
  )
}

// ── Static option sets ──────────────────────────────────────────────────────
const TONE_OPTIONS = [
  { value: 'oscuro',  emoji: '🖤', label: 'Oscuro',    desc: 'Negro o castaño oscuro' },
  { value: 'castano', emoji: '🤎', label: 'Castaño',   desc: 'Castaño medio' },
  { value: 'claro',   emoji: '💛', label: 'Claro',     desc: 'Rubio o cabello claro' },
  { value: 'rojizo',  emoji: '🔥', label: 'Rojizo',    desc: 'Tonos rojizos o cobrizos' },
  { value: 'canas',   emoji: '🤍', label: 'Con canas', desc: 'Canas visibles' },
]
const TONE_NAME = {
  oscuro: 'Oscuro', castano: 'Castaño', claro: 'Claro', rojizo: 'Rojizo', canas: 'Con canas',
}

const LENGTH_TILES = [
  { value: 'corto',   img: `${IMG}/green-length-corto.webp`,   label: 'Corto' },
  { value: 'hombros', img: `${IMG}/green-length-hombros.webp`, label: 'Por los hombros' },
  { value: 'medio',   img: `${IMG}/green-length-medio.webp`,   label: 'Medio' },
  { value: 'largo',   img: `${IMG}/green-length-largo.webp`,   label: 'Largo' },
]

const GOAL_TILES = [
  { value: 'frizz',       emoji: '💧', label: 'Menos frizz',           desc: 'Controlar el frizz y mantener el cabello más alineado.' },
  { value: 'brillo',      emoji: '✨', label: 'Más brillo',            desc: 'Recuperar una apariencia luminosa y saludable.' },
  { value: 'quiebre',     emoji: '🌿', label: 'Menos quiebre',         desc: 'Proteger el cabello y fortalecerlo con el tiempo.' },
  { value: 'crecimiento', emoji: '📏', label: 'Crecimiento saludable', desc: 'Crear hábitos que ayuden a mantener el largo.' },
  { value: 'suavidad',    emoji: '🌸', label: 'Más suavidad',          desc: 'Sentir el cabello más sedoso en el día a día.' },
  { value: 'ondas',       emoji: '🌀', label: 'Ondas definidas',       desc: 'Resaltar la forma natural del cabello.' },
  { value: 'puntas',      emoji: '✂️', label: 'Puntas cuidadas',       desc: 'Reducir la apariencia de resequedad.' },
]

// Step 16 — multi-select, at least one required.
const CONCERN_OPTIONS = [
  { value: 'frizz',      emoji: '💧', label: 'Frizz' },
  { value: 'brillo',     emoji: '✨', label: 'Poco brillo' },
  { value: 'seco',       emoji: '🏜️', label: 'Se siente seco' },
  { value: 'puntas',     emoji: '✂️', label: 'Puntas resecas' },
  { value: 'volumen',    emoji: '🎈', label: 'Poco volumen' },
  { value: 'quiebre',    emoji: '🌿', label: 'Se quiebra con facilidad' },
  { value: 'grasa',      emoji: '💦', label: 'Raíz con exceso de grasa' },
  { value: 'largo',      emoji: '📏', label: 'Te cuesta mantener el largo' },
  { value: 'peinar',     emoji: '🪮', label: 'Es difícil de peinar' },
  { value: 'definicion', emoji: '🌀', label: 'Ondas o rizos con poca definición' },
]

const FUTURE_OPTIONS = [
  { value: 'suelto',    emoji: '💇‍♀️', label: 'Llevarlo suelto con más confianza' },
  { value: 'fotos',     emoji: '📸', label: 'Sentirme más cómoda en las fotos' },
  { value: 'peinado',   emoji: '⏱️', label: 'Facilitar el peinado antes de salir' },
  { value: 'elogios',   emoji: '💬', label: 'Recibir comentarios positivos' },
  { value: 'azar',      emoji: '🎯', label: 'Dejar de probar cosas al azar' },
  { value: 'rutina',    emoji: '📅', label: 'Tener una rutina que consiga mantener' },
  { value: 'tranquila', emoji: '🌸', label: 'Sentirme más tranquila con la apariencia de mi cabello' },
]

const IDENTIFY_OPTIONS = [
  { value: 'si',     emoji: '✅', label: 'Sí' },
  { value: 'no',     emoji: '🚫', label: 'No' },
  { value: 'quizas', emoji: '🤔', label: 'No estoy segura' },
]

// Analysis screen bars. Percentages describe the progress of the on-screen
// analysis only — never a chance of improvement, satisfaction or compatibility.
// Progress advances 1% per tick, so 80ms ≈ 8s for the whole analysis (~1.6s per
// bar). Raise this to slow the screen down further.
const ANALYSIS_TICK_MS = 80

const ANALYSIS_BARS = [
  'Revisando tu tipo, tono y largo',
  'Analizando tus hábitos y procesos',
  'Relacionando tus objetivos con nuestra biblioteca de 26 recetas',
  // Must not announce a number here: at this point we are still checking for
  // compatible recipes. The "3 recetas" reveal only happens at the end.
  'Buscando recetas compatibles con tus respuestas',
  'Preparando tu resultado',
]

export default function QuizCabello({ pricingPlan = 'natglow' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig
  // _v2: steps reorganised (profile + confirm screens removed, congratulations
  // screen added), so an in-progress session under v1 must not restore to a
  // shifted step.
  const QUIZ_STATE_KEY = `glow_quiz_state_${STORE}_v2`
  const RESULTS_KEY = `glow_results_answers_${STORE}`

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const [step, setStep] = useState(STEPS.WELCOME)
  const [answers, setAnswers] = useState({
    symptomsIntensity: '',
    age: '', hairTone: '', name: '',
    photosIdentify: '', mirrorIdentify: '', feeling: '', hesitation: '',
    hairType: '', hairLength: '', scalpSensitivity: '',
    concerns: [], goals: [], hairGoal: '',
    washFreq: '', waterTemp: '', heatTools: '', chemProducts: '',
    recipeExperience: '', commitment: '', future: [], investment: '', recipePref: '',
  })
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisDone, setAnalysisDone] = useState(false)
  // "Ya hice la evaluación" only renders when a finished result of THIS funnel
  // is stored — otherwise /quiz-cabello/results would bounce straight back.
  const [hasSavedResult, setHasSavedResult] = useState(false)

  const HAIR_TYPES = [
    { value: 'liso',     label: t('quiz.hairTypes.liso'),     img: `${IMG_NATGLOW}/liso.webp` },
    { value: 'ondulado', label: t('quiz.hairTypes.ondulado'), img: `${IMG_NATGLOW}/ondulado.webp` },
    { value: 'cacheado', label: t('quiz.hairTypes.cacheado'), img: `${IMG_NATGLOW}/cacheado.webp` },
    { value: 'crespo',   label: t('quiz.hairTypes.crespo'),   img: `${IMG_NATGLOW}/crespo.webp` },
  ]

  useEffect(() => {
    captureAttribution()
    captureCountry()
    // Pixel policy for this funnel:
    //   ViewContent  → here (quiz view) and on the results page.
    //   Lead         → never. The name is collected at step 7/28, way too early
    //                  to be a real lead signal.
    //   InitiateCheckout / Purchase → never fired by us. Hotmart's own pixel
    //                  raises both on its checkout and thank-you pages; firing
    //                  them here too would double-count every conversion.
    // PageView is fired once, globally, by initFacebookPixel — not duplicated.
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'quiz_cabello', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'quiz_cabello', content_category: plan_key, content_id: plan_key, content_type: 'product' })
    })
    try {
      const saved = sessionStorage.getItem(QUIZ_STATE_KEY)
      if (saved) {
        const { step: s, answers: a } = JSON.parse(saved)
        if (s < STEPS.ANALYSIS) { setStep(s); setAnswers(a) }
      }
    } catch { /* storage blocked — start fresh */ }
    try { setHasSavedResult(!!sessionStorage.getItem(RESULTS_KEY)) } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step < STEPS.ANALYSIS) {
      sessionStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ step, answers }))
    }
  }, [step, answers, QUIZ_STATE_KEY])

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard')
  }, [user, isSubscribed, navigate])

  // Same iOS momentum-scroll fix as /quiz: pin the body, reset to top, release.
  useEffect(() => {
    const body = document.body
    body.style.position = 'fixed'
    body.style.top = '0'
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    window.scrollTo(0, 0)
    const release = () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(release))
    return () => { cancelAnimationFrame(raf); release() }
  }, [step])

  // Analysis screen: the five bars fill continuously (1% every ANALYSIS_TICK_MS)
  // instead of snapping in five jumps. ~8s total — roughly 1.6s per bar — so the
  // analysis reads as real work being done rather than a token spinner.
  useEffect(() => {
    if (step !== STEPS.ANALYSIS) return
    trackFunnelEvent('quiz_cabello_completed', { answers }, plan_key)
    setAnalysisProgress(0)
    setAnalysisDone(false)
    const id = setInterval(() => {
      setAnalysisProgress(p => {
        if (p >= 100) { clearInterval(id); return 100 }
        return p + 1
      })
    }, ANALYSIS_TICK_MS)
    return () => clearInterval(id)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once the bars are full, hold on the "¡Listo!" message briefly, then go.
  useEffect(() => {
    if (step !== STEPS.ANALYSIS || analysisProgress < 100) return
    setAnalysisDone(true)
    const done = setTimeout(() => {
      sessionStorage.removeItem(QUIZ_STATE_KEY)
      sessionStorage.setItem(RESULTS_KEY, JSON.stringify(answers))
      navigate(`/quiz-cabello/results${window.location.search}`, { state: { answers } })
    }, 1200)
    return () => clearTimeout(done)
  }, [step, analysisProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  const ans = (field, value) => setAnswers(a => ({ ...a, [field]: value }))
  const pick = (field, value, next) => { ans(field, value); setStep(next) }

  // Generic multi-select toggle with an optional exclusive value.
  const toggleMulti = (field, value, exclusive) => setAnswers(a => {
    const cur = Array.isArray(a[field]) ? a[field] : []
    if (exclusive && value === exclusive) {
      return { ...a, [field]: cur.includes(exclusive) ? [] : [exclusive] }
    }
    const base = exclusive ? cur.filter(v => v !== exclusive) : cur
    const next = base.includes(value) ? base.filter(v => v !== value) : [...base, value]
    return { ...a, [field]: next }
  })

  // Keep hairGoal = primary (first) goal for back-compat with the offer page.
  const submitGoals = () => {
    setAnswers(a => ({ ...a, hairGoal: a.goals?.[0] ?? '' }))
    setStep(STEPS.WASH_FREQ)
  }

  const handleStartWelcome = () => {
    // Fresh attempt id per real start (forwarded to Hotmart as `src` later).
    startFunnelSession()
    trackFunnelEvent('quiz_cabello_started', { country: getCountryOffer().code }, plan_key)
    setStep(STEPS.SIGNS)
  }

  const handleSymptoms = (intensity) => {
    ans('symptomsIntensity', intensity)
    setStep(STEPS.EDU_ROUTINE)
  }

  // No Lead / SubmitForm here on purpose: the name is asked at step 7 of 28, far
  // too early to count as a lead — it would flood Meta with weak signals and
  // teach the campaign to optimise for people who never reach the offer. This
  // funnel fires no lead-type event at all.
  const handleNameSubmit = () => {
    if (!answers.name.trim()) return
    setStep(STEPS.PHOTOS)
  }

  // Name is collected at step 7, so every screen after it can address the
  // person directly. Screens before it never call this.
  const name = displayName(answers)
  // Country-aware testimonial (step 21): local name/location per ?country=.
  const quizTestimonial = getQuizTestimonial(getCountryOffer().code)

  const qClass = 'max-w-lg mx-auto w-full px-3 pt-5 pb-6 flex flex-col gap-6'

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
        .card-option { border:1px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; }
        .card-option:active { border-color:#FB45A9; background:#FFF5FA; }
        .card-option.selected { border-color:#FB45A9; background:#FFF5FA; }
        .img-card { border:1px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; overflow:hidden; }
        .img-card:hover { border-color:#FB45A9; }
        .img-card.selected { border-color:#FB45A9; }
      `}</style>

      <AnimatePresence>

        {/* ═══ WELCOME ═══ */}
        {step === STEPS.WELCOME && (
          <motion.div key="welcome" {...slide} className="max-w-lg mx-auto w-full px-4 pt-6 pb-8 flex flex-col gap-5">
            <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
              ✨ EVALUACIÓN CAPILAR PERSONALIZADA
            </span>

            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '4/3' }}>
              <img
                src={`${IMG}/green-hero.webp`}
                alt=""
                loading="eager"
                decoding="async"
                // object-top: the hero is taller than the 4/3 box, so anchor the
                // crop to the top and let the bottom go — the face is up there.
                className="w-full h-full object-cover object-top"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>

            <div className="text-center flex flex-col gap-3">
              <h1 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle('Descubre las recetas caseras ideales para tu cabello y los hábitos que puedes ajustar', 'recetas caseras ideales')}
              </h1>
              <p className="text-sm text-stone-400 leading-relaxed">
                Responde algunas preguntas rápidas y recibe tu evaluación personalizada: qué puede estar frenando tu cabello y un punto de partida natural, según tus respuestas.
              </p>
            </div>

            {/* Same feature-row identity as the /quiz welcome screen. */}
            <div className="flex flex-col gap-3">
              <FeatureRow icon={Leaf}     iconColor="#1E8449" chip="#E8F8F0" text="Opciones según tu tipo de cabello" />
              <FeatureRow icon={Sparkles} iconColor={P}       chip="#FFF5FA" text="Ingredientes simples y fáciles de encontrar" />
              <FeatureRow icon={Droplets} iconColor="#2563EB" chip="#E8F2FF" text="Un plan de 21 días para seguir paso a paso" />
            </div>

            <div className="flex flex-col gap-3">
              <PinkButton onClick={handleStartWelcome}>
                INICIAR EVALUACIÓN <ArrowRight className="w-4 h-4" />
              </PinkButton>

              {hasSavedResult && (
                <button
                  onClick={() => navigate(`/quiz-cabello/results${window.location.search}`)}
                  className="w-full text-center text-sm font-semibold text-stone-400 underline underline-offset-4 py-2 hover:text-stone-600 transition-colors"
                >
                  Ya hice la evaluación
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ 1 · SIGNS — kept from /quiz, unchanged ═══ */}
        {step === STEPS.SIGNS && (
          <motion.div key="signs" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <StepProgress current={1} total={TOTAL_QUIZ_STEPS} />
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle('¿Reconoces algunas de estas señales en tu cabello?', 'estas señales')}
              </h2>
              <p className="text-sm text-stone-400 leading-snug">
                Son algunas de las más comunes. ¿Hace cuánto tiempo empezaste a notarlas? Esto nos ayudará a adaptar mejor tu rutina.
              </p>
            </div>

            <motion.img
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              src={`${IMG_NATGLOW}/symptoms.webp`}
              alt="Señales en el cabello"
              loading="lazy"
              decoding="async"
              className="w-full h-auto block rounded-2xl"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />

            {/* Option cards (not two identical buttons) so the two answers read
                as distinct choices about WHEN the person noticed it. */}
            <div className="flex flex-col gap-3">
              <QuizOption
                emoji="🗓️" label="Hace semanas o meses" desc="Lo empecé a notar hace poco tiempo"
                selected={answers.symptomsIntensity === '30days'}
                onClick={() => handleSymptoms('30days')}
              />
              <QuizOption
                emoji="⏳" label="Desde hace años" desc="Convivo con esto hace bastante tiempo"
                selected={answers.symptomsIntensity === '1year'}
                onClick={() => handleSymptoms('1year')}
              />
            </div>
          </motion.div>
        )}

        {/* ═══ 2 · EDU ROUTINE — kept from /quiz, unchanged ═══ */}
        {step === STEPS.EDU_ROUTINE && (
          <motion.div key="edu-routine" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={2} total={TOTAL_QUIZ_STEPS} />
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle(t('quizNatglow.eduScientific.title'), t('quizNatglow.eduScientific.highlight'))}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">{t('quizNatglow.eduScientific.body')}</p>
            </div>

            <TintedCard className="p-4 text-center text-sm text-stone-700 leading-relaxed">
              {t('quizNatglow.eduScientific.darkBox')}
            </TintedCard>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: GREEN }}>{t('quizNatglow.eduScientific.labelGood')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src={`${IMG_NATGLOW}/follicle-healthy.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: '#6b7280' }}>{t('quizNatglow.eduScientific.labelBad')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src={`${IMG_NATGLOW}/follicle-damaged.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 text-center italic">{t('quizNatglow.eduScientific.caption')}</p>

            <PinkButton onClick={() => setStep(STEPS.REFRAMING)}>
              {t('quizNatglow.eduScientific.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 3 · REFRAMING — kept from /quiz, unchanged ═══ */}
        {step === STEPS.REFRAMING && (
          <motion.div key="reframing" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <StepProgress current={3} total={TOTAL_QUIZ_STEPS} />
            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '4/3' }}>
              <img src={`${IMG}/green-illustration-2.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-stone-900 leading-tight text-center">
              {hlTitle('El detalle que muchas personas pasan por alto en su rutina capilar', 'pasan por alto')}
            </h2>

            <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ borderColor: '#FFB3DD', background: '#FFF5FA' }}>
              <p className="text-sm text-stone-700 leading-relaxed">
                Probar productos diferentes sin una frecuencia clara puede hacer que sea difícil entender qué cuidados realmente encajan con tu cabello. Por eso, organizar la rutina según tus hábitos puede resultar más útil que probar todo al mismo tiempo.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                {['Cambiar de producto constantemente', 'Seguir recomendaciones que no consideran tu tipo de cabello', 'Aplicar varios cuidados sin una frecuencia definida'].map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-stone-500">
                    <X className="w-4 h-4 flex-shrink-0 text-stone-400" /> {d}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm font-semibold pt-1" style={{ color: P_DARK }}>
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: P }} /> Organizar los pasos según tu cabello y tu día a día
                </div>
              </div>
            </div>

            <PinkButton onClick={() => setStep(STEPS.AGE)}>
              Continuar <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 4 · AGE ═══ */}
        {step === STEPS.AGE && (
          <motion.div key="age" {...slide} className={qClass}>
            <StepHead
              current={4} total={TOTAL_QUIZ_STEPS}
              title={t('quizNatglow.age.title')} highlight={t('quizNatglow.age.highlight')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: '18_29',   label: t('quiz.options.age18'), emoji: '🌸' },
                { value: '30_39',   label: t('quiz.options.age30'), emoji: '🌺' },
                { value: '40_49',   label: t('quiz.options.age40'), emoji: '🌼' },
                { value: '50_plus', label: t('quiz.options.age50'), emoji: '🌻' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.age === opt.value}
                  onClick={() => pick('age', opt.value, STEPS.TONE)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 5 · TONE ═══ */}
        {step === STEPS.TONE && (
          <motion.div key="tone" {...slide} className={qClass}>
            <StepHead
              current={5} total={TOTAL_QUIZ_STEPS}
              title="¿Cuál es el tono actual de tu cabello?" highlight="tono actual"
              subtitle="Algunos ingredientes naturales pueden influir en el tono. Con esta respuesta evitamos sugerirte recetas que no combinan con tu color."
            />
            <div className="flex flex-col gap-3">
              {TONE_OPTIONS.map(opt => (
                <QuizOption key={opt.value} emoji={opt.emoji} label={opt.label} desc={opt.desc}
                  selected={answers.hairTone === opt.value}
                  onClick={() => pick('hairTone', opt.value, STEPS.EDU_TONE)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 6 · EDU TONE ═══ */}
        {step === STEPS.EDU_TONE && (
          <motion.div key="edu-tone" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={6} total={TOTAL_QUIZ_STEPS} />
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle('¿Sabías que el tono también importa al elegir una receta casera?', 'el tono también importa')}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Algunos ingredientes pueden dejar reflejos o matices temporales, especialmente en cabellos claros, rojizos o con canas.
              </p>
            </div>

            <TintedCard className="p-5 text-center text-sm text-stone-700 leading-relaxed">
              Por eso utilizaremos tu tono junto con tu tipo de cabello y tus hábitos antes de mostrarte las recetas.
            </TintedCard>

            {TONE_NAME[answers.hairTone] && (
              <p className="text-center text-sm font-semibold" style={{ color: P_DARK }}>
                Tono informado: {TONE_NAME[answers.hairTone]}
              </p>
            )}

            <PinkButton onClick={() => setStep(STEPS.NAME)}>
              CONTINUAR <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 7 · NAME ═══ */}
        {step === STEPS.NAME && (
          <motion.div key="name" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <StepProgress current={7} total={TOTAL_QUIZ_STEPS} />
            <div className="text-center pt-6">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="text-2xl font-extrabold text-stone-900 mb-2">Antes de continuar, ¿cómo te llamas?</h2>
              <p className="text-base text-stone-500">Usaremos tu nombre para personalizar las próximas preguntas y tu resultado.</p>
            </div>
            <input
              type="text"
              placeholder="Tu primer nombre"
              value={answers.name}
              onChange={e => ans('name', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit() }}
              className="w-full border border-stone-200 rounded-2xl px-5 py-4 text-lg text-stone-800 outline-none transition-colors"
              onFocus={e => { e.target.style.borderColor = P }}
              onBlur={e => { if (!answers.name.trim()) e.target.style.borderColor = '#e7e5e4' }}
            />
            <button
              disabled={!answers.name.trim()}
              onClick={handleNameSubmit}
              className="btn-primary py-6 text-base flex items-center justify-center gap-2"
            >
              CONTINUAR
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* ═══ 8 · PHOTOS ═══ */}
        {step === STEPS.PHOTOS && (
          <motion.div key="photos" {...slide} className={qClass}>
            <StepHead
              current={8} total={TOTAL_QUIZ_STEPS}
              title="Normalmente siento que mi cabello no se ve en las fotos como me gustaría." highlight="no se ve en las fotos"
              subtitle="¿Te identificas con esta frase?"
            />
            <div className="flex flex-col gap-3">
              {IDENTIFY_OPTIONS.map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.photosIdentify === opt.value}
                  onClick={() => pick('photosIdentify', opt.value, STEPS.MIRROR)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 9 · MIRROR ═══ */}
        {step === STEPS.MIRROR && (
          <motion.div key="mirror" {...slide} className={qClass}>
            <StepHead
              current={9} total={TOTAL_QUIZ_STEPS}
              title="Hay días en los que me miro al espejo y siento que mi cabello podría verse más cuidado." highlight="podría verse más cuidado"
              subtitle="¿Te identificas con esta frase?"
            />
            <div className="flex flex-col gap-3">
              {IDENTIFY_OPTIONS.map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.mirrorIdentify === opt.value}
                  onClick={() => pick('mirrorIdentify', opt.value, STEPS.FEELING)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 10 · FEELING ═══ */}
        {step === STEPS.FEELING && (
          <motion.div key="feeling" {...slide} className={qClass}>
            <StepHead
              current={10} total={TOTAL_QUIZ_STEPS}
              title="¿Cómo te sientes con tu cabello hoy?" highlight="te sientes"
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'gusta',   emoji: '😊', label: 'Me gusta como está', desc: 'Solo quiero aprender a cuidarlo mejor' },
                { value: 'mejorar', emoji: '🤔', label: 'Quiero mejorarlo, pero no sé por dónde empezar', desc: 'He probado cosas diferentes sin tener una rutina clara' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.feeling === opt.value}
                  onClick={() => pick('feeling', opt.value, STEPS.HESITATION)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 11 · HESITATION ═══ */}
        {step === STEPS.HESITATION && (
          <motion.div key="hesitation" {...slide} className={qClass}>
            <StepHead
              current={11} total={TOTAL_QUIZ_STEPS}
              title="Cuando piensas en probar una nueva receta para el cabello, ¿qué suele pasar por tu cabeza?" highlight="pasar por tu cabeza"
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'preocupa', emoji: '😰', label: 'Me preocupa usar algo que no combine con mi cabello' },
                { value: 'cual',     emoji: '🤔', label: 'Quiero probar, pero no sé qué receta elegir' },
                { value: 'despues',  emoji: '⌛', label: 'Siempre lo dejo para después' },
                { value: 'gusta',    emoji: '😊', label: 'Me gusta probar nuevos cuidados' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.hesitation === opt.value}
                  onClick={() => pick('hesitation', opt.value, STEPS.EDU_PERSONAL)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 12 · EDU PERSONAL ═══ */}
        {step === STEPS.EDU_PERSONAL && (
          <motion.div key="edu-personal" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={12} total={TOTAL_QUIZ_STEPS} />
            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '4/3' }}>
              <img
                src={`${IMG}/green-illustration-3.webp`}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>

            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {name
                  ? <>{name}, cada cabello responde de una <HL>forma diferente</HL></>
                  : <>Cada cabello responde de una <HL>forma diferente</HL></>}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Dos personas pueden tener el mismo tipo de cabello y aun así preferir recetas diferentes por causa del tono, los procesos, los hábitos y los objetivos.
              </p>
            </div>

            <TintedCard className="p-5 text-center text-sm text-stone-700 leading-relaxed">
              Por eso continuaremos haciendo algunas preguntas antes de mostrarte las tres recetas.
            </TintedCard>

            <PinkButton onClick={() => setStep(STEPS.HAIR_TYPE)}>
              CONTINUAR <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 13 · HAIR TYPE — kept from /quiz ═══ */}
        {step === STEPS.HAIR_TYPE && (
          <motion.div key="hair-type" {...slide} className={qClass}>
            <StepHead
              current={13} total={TOTAL_QUIZ_STEPS}
              title={t('quizNatglow.hairType.title')} highlight={t('quizNatglow.hairType.highlight')}
              subtitle={t('quizNatglow.hairType.subtitle')}
            />
            <div className="grid grid-cols-2 gap-3 items-start">
              {HAIR_TYPES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card ${answers.hairType === opt.value ? 'selected' : ''}`}
                  onClick={() => pick('hairType', opt.value, STEPS.LENGTH)}
                >
                  <div className="w-full h-36 overflow-hidden" style={{ background: PL2 }}>
                    <img
                      src={opt.img}
                      alt={opt.label}
                      loading="lazy"
                      decoding="async"
                      className="block w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                  <div className="px-3 py-3.5 flex items-center justify-center gap-2">
                    <span className="text-sm font-semibold text-stone-700 text-center">{opt.label}</span>
                    {answers.hairType === opt.value && <Check className="w-4 h-4 flex-shrink-0" style={{ color: P }} />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 14 · LENGTH — kept from /quiz ═══ */}
        {step === STEPS.LENGTH && (
          <motion.div key="length" {...slide} className={qClass}>
            <StepHead
              current={14} total={TOTAL_QUIZ_STEPS}
              title="¿Cuál es el largo actual de tu cabello?" highlight="largo actual"
              subtitle="Esto puede cambiar cantidades y tiempo de aplicación."
            />
            <div className="grid grid-cols-2 gap-3">
              {LENGTH_TILES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card h-full flex flex-col ${answers.hairLength === opt.value ? 'selected' : ''}`}
                  onClick={() => pick('hairLength', opt.value, STEPS.SENSITIVITY)}
                >
                  <div className="w-full h-36 overflow-hidden" style={{ background: PL2 }}>
                    <img
                      src={opt.img}
                      alt={opt.label}
                      loading="lazy"
                      decoding="async"
                      className="block w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                  <div className="px-3 py-3.5 flex items-center justify-center gap-2">
                    <span className="text-sm font-semibold text-stone-700 text-center">{opt.label}</span>
                    {answers.hairLength === opt.value && <Check className="w-4 h-4 flex-shrink-0" style={{ color: P }} />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 15 · SENSITIVITY ═══ */}
        {step === STEPS.SENSITIVITY && (
          <motion.div key="sensitivity" {...slide} className={qClass}>
            <StepHead
              current={15} total={TOTAL_QUIZ_STEPS}
              title="¿Sientes que tu cuero cabelludo es sensible?" highlight="sensible"
              subtitle="Esto nos ayuda a entender mejor qué tipo de cuidado prefieres."
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'si',     emoji: '✅', label: 'Sí' },
                { value: 'no',     emoji: '🚫', label: 'No' },
                { value: 'quizas', emoji: '🤔', label: 'No estoy segura' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.scalpSensitivity === opt.value}
                  onClick={() => pick('scalpSensitivity', opt.value, STEPS.CONCERNS)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 16 · CONCERNS (multi) ═══ */}
        {step === STEPS.CONCERNS && (
          <motion.div key="concerns" {...slide} className={qClass}>
            <StepHead
              current={16} total={TOTAL_QUIZ_STEPS}
              title="¿Qué aspectos de tu cabello te preocupan más hoy?" highlight="te preocupan más"
              subtitle="Selecciona todas las opciones que se parezcan a tu situación."
            />
            <div className="flex flex-col gap-3">
              {CONCERN_OPTIONS.map(opt => (
                <QuizOption key={opt.value} emoji={opt.emoji} label={opt.label}
                  selected={answers.concerns?.includes(opt.value)}
                  onClick={() => toggleMulti('concerns', opt.value)} />
              ))}
            </div>
            <PinkButton onClick={() => setStep(STEPS.GOALS)} disabled={!answers.concerns?.length}>
              CONTINUAR <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 17 · GOALS — kept from /quiz, unchanged ═══ */}
        {step === STEPS.GOALS && (
          <motion.div key="goals" {...slide} className={qClass}>
            <StepHead
              current={17} total={TOTAL_QUIZ_STEPS}
              title="Vamos a organizar tu rutina según tus metas" highlight="según tus metas"
              subtitle="Elige todo lo que te gustaría priorizar."
            />
            <div className="flex flex-col gap-3">
              {GOAL_TILES.map(opt => (
                <QuizOption key={opt.value} emoji={opt.emoji} label={opt.label} desc={opt.desc}
                  selected={answers.goals?.includes(opt.value)}
                  onClick={() => toggleMulti('goals', opt.value)} />
              ))}
            </div>
            <PinkButton onClick={submitGoals} disabled={!answers.goals?.length}>
              Continuar <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 18 · WASH FREQ — kept from /quiz ═══ */}
        {step === STEPS.WASH_FREQ && (
          <motion.div key="wash-freq" {...slide} className={qClass}>
            <StepHead
              current={18} total={TOTAL_QUIZ_STEPS}
              title={t('quizNatglow.washFreq.title')} highlight={t('quizNatglow.washFreq.highlight')}
              subtitle={t('quizNatglow.washFreq.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'daily', emoji: '🚿', label: t('quiz.options.washDaily') },
                { value: '3_4',   emoji: '📅', label: t('quiz.options.wash3_4') },
                { value: '1_2',   emoji: '🌿', label: t('quiz.options.wash1_2') },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.washFreq === opt.value}
                  onClick={() => pick('washFreq', opt.value, STEPS.WATER_TEMP)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 19 · WATER TEMP — kept from /quiz ═══ */}
        {step === STEPS.WATER_TEMP && (
          <motion.div key="water-temp" {...slide} className={qClass}>
            <StepHead
              current={19} total={TOTAL_QUIZ_STEPS}
              title={t('quizNatglow.waterTemp.title')} highlight={t('quizNatglow.waterTemp.highlight')}
              subtitle={t('quizNatglow.waterTemp.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'hot',  emoji: '🔥', label: t('quiz.options.waterHot') },
                { value: 'warm', emoji: '💧', label: t('quiz.options.waterWarm') },
                { value: 'cold', emoji: '❄️', label: t('quiz.options.waterCold') },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.waterTemp === opt.value}
                  onClick={() => pick('waterTemp', opt.value, STEPS.HEAT_TOOLS)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 20 · HEAT TOOLS — kept from /quiz ═══ */}
        {step === STEPS.HEAT_TOOLS && (
          <motion.div key="heat-tools" {...slide} className={qClass}>
            <StepHead
              current={20} total={TOTAL_QUIZ_STEPS}
              title={t('quizNatglow.heatTools.title')} highlight={t('quizNatglow.heatTools.highlight')}
              subtitle={t('quizNatglow.heatTools.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'daily',  emoji: '🔌', label: t('quiz.options.heatDaily') },
                { value: 'few',    emoji: '📆', label: t('quiz.options.heatFew') },
                { value: 'rarely', emoji: '🌬️', label: t('quiz.options.heatRarely') },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.heatTools === opt.value}
                  onClick={() => pick('heatTools', opt.value, STEPS.SOCIAL_PROOF)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 21 · SOCIAL PROOF — real testimonial reused from /quiz ═══ */}
        {step === STEPS.SOCIAL_PROOF && (
          <motion.div key="social-proof" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={21} total={TOTAL_QUIZ_STEPS} />

            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {name
                  ? <>{name}, {hlTitle('no eres la única que busca una rutina casera personalizada para su cabello', 'no eres la única')}</>
                  : hlTitle('No eres la única que busca una rutina casera personalizada para su cabello', 'No eres la única')}
              </h2>
            </div>

            <TintedCard className="p-4 text-center">
              <p className="text-sm font-bold" style={{ color: P_DARK }}>
                Más de {PROOF.women} mujeres transformaron su cabello con recetas caseras a partir de nuestra evaluación.
              </p>
            </TintedCard>

            {/* Same person, photos AND text as the offer's first testimonial. */}
            <TestimonialCard
              avatarUrl={quizTestimonial.avatar}
              name={quizTestimonial.name}
              location={quizTestimonial.location}
              text={quizTestimonial.text}
              beforeUrl={quizTestimonial.antes}
              afterUrl={quizTestimonial.depois}
              showLabels={false}
              showStars={false}
              cardBorder="border-stone-100"
            />

            <p className="text-xs text-stone-500 text-center italic">{t('quizNatglow.socialProof.caption')}</p>

            <PinkButton onClick={() => setStep(STEPS.CHEM)}>
              CONTINUAR <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 22 · CHEM — kept from /quiz ═══ */}
        {step === STEPS.CHEM && (
          <motion.div key="chem" {...slide} className={qClass}>
            <StepHead
              current={22} total={TOTAL_QUIZ_STEPS}
              title={t('quizNatglow.chemProducts.title')} highlight={t('quizNatglow.chemProducts.highlight')}
              subtitle={t('quizNatglow.chemProducts.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'frecuente', emoji: '🎨', label: t('quizNatglow.chemProducts.opt1') },
                { value: 'aveces',    emoji: '🔁', label: t('quizNatglow.chemProducts.opt2') },
                { value: 'no',        emoji: '🌿', label: t('quizNatglow.chemProducts.opt3') },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.chemProducts === opt.value}
                  onClick={() => pick('chemProducts', opt.value, STEPS.EXPERIENCE)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 23 · EXPERIENCE ═══ */}
        {step === STEPS.EXPERIENCE && (
          <motion.div key="experience" {...slide} className={qClass}>
            <StepHead
              current={23} total={TOTAL_QUIZ_STEPS}
              title="¿Qué tanta experiencia tienes preparando recetas caseras para el cabello?" highlight="recetas caseras"
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'ninguna',  emoji: '🌱', label: 'Nunca preparé una',        desc: 'Necesito instrucciones simples desde el inicio' },
                { value: 'poca',     emoji: '🥣', label: 'Ya probé una o dos',       desc: 'Conozco lo básico' },
                { value: 'media',    emoji: '🧴', label: 'Las preparo algunas veces', desc: 'Me siento cómoda siguiendo una receta' },
                { value: 'bastante', emoji: '✨', label: 'Tengo bastante experiencia', desc: 'Busco nuevas opciones para probar' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.recipeExperience === opt.value}
                  onClick={() => pick('recipeExperience', opt.value, STEPS.COMMITMENT)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 24 · COMMITMENT ═══ */}
        {step === STEPS.COMMITMENT && (
          <motion.div key="commitment" {...slide} className={qClass}>
            <StepHead
              current={24} total={TOTAL_QUIZ_STEPS}
              title="Quiero sentirme más segura cuando llevo mi cabello suelto." highlight="más segura"
              subtitle="¿Te identificas con esta frase?"
            />
            <div className="flex flex-col gap-3">
              {IDENTIFY_OPTIONS.map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.commitment === opt.value}
                  onClick={() => pick('commitment', opt.value, STEPS.FUTURE)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 25 · FUTURE (multi) ═══ */}
        {step === STEPS.FUTURE && (
          <motion.div key="future" {...slide} className={qClass}>
            <StepHead
              current={25} total={TOTAL_QUIZ_STEPS}
              title="Cuando mi cabello se vea más cuidado, me gustaría…" highlight="más cuidado"
              subtitle="Selecciona todas las opciones que se apliquen."
            />
            <div className="flex flex-col gap-3">
              {FUTURE_OPTIONS.map(opt => (
                <QuizOption key={opt.value} emoji={opt.emoji} label={opt.label}
                  selected={answers.future?.includes(opt.value)}
                  onClick={() => toggleMulti('future', opt.value)} />
              ))}
            </div>
            <PinkButton onClick={() => setStep(STEPS.INVESTMENT)} disabled={!answers.future?.length}>
              CONTINUAR <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ 26 · INVESTMENT (profile only — never changes price or result) ═══ */}
        {step === STEPS.INVESTMENT && (
          <motion.div key="investment" {...slide} className={qClass}>
            <StepHead
              current={26} total={TOTAL_QUIZ_STEPS}
              title="¿Cuánto sueles invertir en el cuidado de tu cabello cada mes?" highlight="sueles invertir"
              subtitle="Incluyendo shampoo, cremas, mascarillas, aceites y otros cuidados."
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'casi_nada', emoji: '🏠', label: 'Casi nada',                        desc: 'Normalmente uso lo que ya tengo en casa' },
                { value: 'basico',    emoji: '🧴', label: 'Solo compro lo básico',            desc: 'Repongo los productos cuando se terminan' },
                { value: 'algunos',   emoji: '🛍️', label: 'Pruebo algunos productos y tratamientos', desc: 'Me gusta conocer opciones diferentes' },
                { value: 'bastante',  emoji: '💅', label: 'Suelo invertir bastante en mi cabello',   desc: 'Compro varios productos o realizo cuidados de salón' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.investment === opt.value}
                  onClick={() => pick('investment', opt.value, STEPS.RECIPE_PREF)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 27 · RECIPE PREF ═══ */}
        {step === STEPS.RECIPE_PREF && (
          <motion.div key="recipe-pref" {...slide} className={qClass}>
            <StepHead
              current={27} total={TOTAL_QUIZ_STEPS}
              // "casi terminamos" (not "ya casi…") so the highlight also matches
              // the capitalised no-name branch.
              title={name ? `${name}, ya casi terminamos` : 'Ya casi terminamos'} highlight="casi terminamos"
              subtitle="Solo necesitamos entender qué tipo de receta sería más fácil para ti seguir."
            />

            <div className="flex flex-col gap-3">
              {[
                { value: 'pocos',     emoji: '🥣', label: 'Una receta con pocos ingredientes' },
                { value: 'rapida',    emoji: '⚡', label: 'Una preparación rápida' },
                { value: 'en_casa',   emoji: '🏠', label: 'Una receta con ingredientes que ya tengo en casa' },
                { value: 'comprar',   emoji: '🛒', label: 'No me importa comprar uno o dos ingredientes' },
                { value: 'completa',  emoji: '✨', label: 'Puedo seguir una receta un poco más completa' },
              ].map(opt => (
                <QuizOption key={opt.value} emoji={opt.emoji} label={opt.label}
                  selected={answers.recipePref === opt.value}
                  onClick={() => pick('recipePref', opt.value, STEPS.FINAL)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ 28 · FINAL — congratulations before the analysis ═══ */}
        {step === STEPS.FINAL && (
          <motion.div key="final" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={28} total={TOTAL_QUIZ_STEPS} />

            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '4/3' }}>
              <img
                src={`${IMG}/green-final.webp`}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>

            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {name
                  ? <>{name}, {hlTitle('felicitaciones por llegar hasta aquí', 'felicitaciones')}</>
                  : hlTitle('Felicitaciones por llegar hasta aquí', 'Felicitaciones')}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                No todas las mujeres que empiezan esta evaluación llegan hasta el final. Responder cada pregunta con calma ya dice mucho sobre las ganas que tienes de cuidar tu cabello, y es justamente eso lo que hace que tu resultado tenga sentido.
              </p>
            </div>

            <PinkButton onClick={() => setStep(STEPS.ANALYSIS)}>
              VER EL RESULTADO DE MI EVALUACIÓN <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ ANALYSIS ═══ */}
        {step === STEPS.ANALYSIS && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-lg mx-auto w-full px-4 py-10 flex flex-col gap-7"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🌿</div>
              <h2 className="text-2xl font-extrabold text-stone-900">
                {analysisDone
                  ? (name
                      ? <>¡Listo, {name}! Ya tenemos tus <HL>3 recetas iniciales</HL></>
                      : <>¡Listo! Ya tenemos tus <HL>3 recetas iniciales</HL></>)
                  : hlTitle('Analizando tu perfil capilar…', 'tu perfil capilar')}
              </h2>
            </div>

            {/* One bar per analysis stage. The percentage tracks the on-screen
                analysis only — not a chance of improvement or compatibility. */}
            <div className="flex flex-col gap-4">
              {ANALYSIS_BARS.map((label, i) => {
                const start = i * 20
                const pct = Math.max(0, Math.min(100, (analysisProgress - start) * 5))
                const complete = pct >= 100
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                        style={{ background: complete ? P : '#e7e5e4' }}
                      >
                        {complete && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <p className={`text-sm transition-colors duration-500 ${complete ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                        {label}
                      </p>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 ml-6" style={{ width: 'calc(100% - 1.5rem)' }}>
                      {/* Linear + short: the value already moves 1% per tick,
                          so easing here would lag behind and stutter. */}
                      <motion.div
                        className="h-1.5 rounded-full"
                        style={{ background: PINK_GRAD }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: ANALYSIS_TICK_MS / 1000, ease: 'linear' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Same wording as the testimonial screen (step 21). */}
            <TintedCard className="p-4 text-center">
              <p className="text-sm font-bold" style={{ color: P_DARK }}>
                Más de {PROOF.women} mujeres transformaron su cabello con recetas caseras a partir de nuestra evaluación.
              </p>
            </TintedCard>
          </motion.div>
        )}

      </AnimatePresence>
      <LegalLine />
    </div>
  )
}
