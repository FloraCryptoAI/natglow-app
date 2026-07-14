import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Leaf, Sparkles, Droplets, X } from 'lucide-react'
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

// Dedicated sessionStorage namespace so this funnel never shares quiz state
// with /quiz-meta or /quiz (they all resolve to plan_key 'one_time_basic').
const STORE = 'natglow'
// Dedicated image folder — a full copy of /images/quiz so the natglow assets can
// be customized independently without touching /quiz-meta.
const IMG = '/images/quiz-natglow'
const APP_MOCKUP = `${IMG}/app-mockup.webp`

const STEPS = {
  WELCOME: 0,
  // Informative intro screens come BEFORE the questions and are NOT numbered.
  SIGNS: 1,
  EDU_SCIENTIFIC: 2,
  REFRAMING: 3,
  // Numbered questions (PASO 1..11).
  HAIR_TYPE: 4,
  LENGTH: 5,
  AGE: 6,
  PROFILE: 7,
  GOAL: 8,
  WASH_FREQ: 9,
  WATER_TEMP: 10,
  HEAT_TOOLS: 11,
  SOCIAL_PROOF: 12,   // testimonial — informative, no number
  CHEM: 13,
  TIME: 14,
  NAME: 15,
  APP_PREVIEW: 16,
  LOADING: 17,
}
// Progress bar denominator: EVERY screen from SIGNS through NAME counts as a
// step, including the informative/testimonial screens — each shows "PASO X DE 15".
const TOTAL_QUIZ_STEPS = 15

const P = '#FB45A9'
const P_DARK = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
// Softer hero gradient — mirrors the app's "Mi Rutina" header + the offer hero.
const BRAND_GRAD = 'linear-gradient(135deg, #FB45A9, #FFB3DD)'
const PL2 = '#FFE4F2'
// Kept only for the "rutina equilibrada" vs "acumulación" comparison labels.
const GREEN = '#27AE60'

// Enter-only fade: no exit and no transform. The old step unmounts instantly
// (like the app's route swaps that DO scroll to top on iOS), and there is no
// transform animation to block the scroll reset on WebKit.
const slide = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.25 },
}

// Single brand pink — no gradient, matches the badge and the rest of the identity.
function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5">
      <motion.div
        className="h-1.5 rounded-full"
        style={{ background: P }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  )
}

// Badge + bar for non-question screens (educational/testimonial/name) that
// still count toward the step sequence — same visual as StepHead, no title.
function StepProgress({ current, total, t }) {
  return (
    <>
      <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
        {t('quizNatglow.stepBadge', { current, total })}
      </span>
      <ProgressBar current={current} total={total} />
    </>
  )
}

// Pink marker highlight for keywords in question titles (same pink as the CTA
// button, white text) — a light persuasion cue. boxDecorationBreak keeps the
// pink box intact if the highlight wraps to a second line.
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

// Local question header (brand-pink badge + progress bar + roomy title/subtitle
// spacing). Kept in-file so the natglow spacing/colors don't touch the shared
// PersuasiveStepHeader used by the other funnels.
function StepHead({ current, total, badge, title, highlight, subtitle }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
        {badge}
      </span>
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
      <span className="text-3xl leading-none flex-shrink-0">{emoji}</span>
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

// White card with a soft border + tinted icon circle — the "Mi Rutina" /
// "Ingredientes naturales" tile identity reused across the offer page.
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

// Pink gradient card holding the app mockup, flush at the bottom (mirrors the
// offer card header).
function MockupCard({ width = '118%' }) {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: BRAND_GRAD }}>
      <div className="flex justify-center pt-5">
        <img
          src={APP_MOCKUP}
          alt=""
          loading="eager"
          decoding="async"
          className="block max-w-none"
          style={{ width }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </div>
    </div>
  )
}

export default function QuizNatglow({ pricingPlan = 'natglow' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key } = planConfig
  // _v5: quiz restructured again (results page removed — loading now goes
  // straight to the offer; testimonial + follicle-comparison screens restored;
  // step badges added to previously badge-less screens), so an in-progress
  // session under an old key must not restore to a shifted step.
  const QUIZ_STATE_KEY = `glow_quiz_state_${STORE}_v7`

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const [step, setStep] = useState(STEPS.WELCOME)
  const [answers, setAnswers] = useState({
    symptomsIntensity: '',
    hairType: '', hairLength: '', age: '', profilePreference: '',
    goals: [], hairGoal: '', washFreq: '',
    waterTemp: '', heatTools: '', chemProducts: '',
    timeAvailable: '', name: '',
  })
  const [loadingProgress, setLoadingProgress] = useState(0)

  const HAIR_TYPES = [
    { value: 'liso',     label: t('quiz.hairTypes.liso'),     img: `${IMG}/liso.webp` },
    { value: 'ondulado', label: t('quiz.hairTypes.ondulado'), img: `${IMG}/ondulado.webp` },
    { value: 'cacheado', label: t('quiz.hairTypes.cacheado'), img: `${IMG}/cacheado.webp` },
    { value: 'crespo',   label: t('quiz.hairTypes.crespo'),   img: `${IMG}/crespo.webp` },
  ]

  // GOAL is a multi-select "metas" question (choose several priorities). Uses the
  // QuizOption row format (emoji + label + desc + check) with a Continuar button.
  const GOAL_TILES = [
    { value: 'frizz',       emoji: '💧', label: 'Menos frizz',           desc: 'Controlar el frizz y mantener el cabello más alineado.' },
    { value: 'brillo',      emoji: '✨', label: 'Más brillo',            desc: 'Recuperar una apariencia luminosa y saludable.' },
    { value: 'quiebre',     emoji: '🌿', label: 'Menos quiebre',         desc: 'Proteger el cabello y fortalecerlo con el tiempo.' },
    { value: 'crecimiento', emoji: '📏', label: 'Crecimiento saludable', desc: 'Crear hábitos que ayuden a mantener el largo.' },
    { value: 'suavidad',    emoji: '🌸', label: 'Más suavidad',          desc: 'Sentir el cabello más sedoso en el día a día.' },
    { value: 'ondas',       emoji: '🌀', label: 'Ondas definidas',       desc: 'Resaltar la forma natural del cabello.' },
    { value: 'puntas',      emoji: '✂️', label: 'Puntas cuidadas',       desc: 'Reducir la apariencia de resequedad.' },
  ]

  // Hair length tiles (emoji format, same as goal) — new question.
  const LENGTH_TILES = [
    { value: 'corto',   emoji: '💇‍♀️', label: 'Corto' },
    { value: 'hombros', emoji: '💁‍♀️', label: 'Por los hombros' },
    { value: 'medio',   emoji: '👩',   label: 'Medio' },
    { value: 'largo',   emoji: '👩‍🦰', label: 'Largo' },
  ]

  useEffect(() => {
    captureAttribution()
    // Persists ?country=mx|co|pe|cl (if present) so the offer page still
    // shows local pricing even if it's reached without the URL param.
    captureCountry()
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      // ViewContent on the first screen. PageView is fired once, globally, by
      // initFacebookPixel — not duplicated here. Hotmart handles Checkout/Purchase.
      trackFbEvent('ViewContent', { content_name: 'quiz_natglow', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'quiz_natglow', content_category: plan_key, content_id: plan_key, content_type: 'product' })
    })
    try {
      const saved = sessionStorage.getItem(QUIZ_STATE_KEY)
      if (saved) {
        const { step: s, answers: a } = JSON.parse(saved)
        if (s < STEPS.LOADING) { setStep(s); setAnswers(a) }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step < STEPS.LOADING) {
      sessionStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ step, answers }))
    }
  }, [step, answers, QUIZ_STATE_KEY])

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard')
  }, [user, isSubscribed, navigate])

  useEffect(() => {
    // Real cause on iPhone: iOS momentum scrolling. After you flick down and tap
    // an option, the momentum is still settling and iOS ignores programmatic
    // scroll (the app's tabs work because you tap a FIXED bottom-nav button — no
    // momentum). The reliable way to kill iOS momentum is to pin the body with
    // position:fixed (the trick modal scroll-locks use), then reset to the top
    // and release.
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

  useEffect(() => {
    if (step !== STEPS.LOADING) return
    trackFunnelEvent('quiz_natglow_completed', { answers }, plan_key)
    setLoadingProgress(0)
    const timers = [
      setTimeout(() => setLoadingProgress(30), 600),
      setTimeout(() => setLoadingProgress(65), 1300),
      setTimeout(() => setLoadingProgress(100), 2100),
    ]
    const done = setTimeout(() => {
      sessionStorage.removeItem(QUIZ_STATE_KEY)
      sessionStorage.setItem(`glow_results_answers_${STORE}`, JSON.stringify(answers))
      // No separate results page in this funnel — go straight to the offer.
      navigate('/offer-natglow', { state: { answers } })
    }, 2800)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const ans = (field, value) => setAnswers(a => ({ ...a, [field]: value }))
  // Set an answer and advance to the next step in one tap.
  const pick = (field, value, next) => { ans(field, value); setStep(next) }

  // Metas is multi-select: toggle a goal in/out of the goals array.
  const toggleGoal = (value) => setAnswers(a => {
    const cur = Array.isArray(a.goals) ? a.goals : []
    const goals = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
    return { ...a, goals }
  })
  // Continue from metas: keep hairGoal = primary (first) goal for back-compat
  // (admin quiz distribution / offer), then advance.
  const submitGoals = () => {
    setAnswers(a => ({ ...a, hairGoal: a.goals?.[0] ?? '' }))
    setStep(STEPS.WASH_FREQ)
  }

  const handleStartWelcome = () => {
    // Fresh attempt id on every real quiz start, so redoing the quiz counts as a
    // new attempt (and this id is forwarded to Hotmart as `src` for payment tie-back).
    startFunnelSession()
    // Include the offer country (?country= bucket) so the admin can group the
    // funnel/geography by offer country from the very top of the funnel.
    trackFunnelEvent('quiz_natglow_started', { country: getCountryOffer().code }, plan_key)
    setStep(STEPS.SIGNS)
  }

  // Signs intro screen: records how long the person has noticed signs and moves on.
  const handleSymptoms = (intensity) => {
    ans('symptomsIntensity', intensity)
    setStep(STEPS.EDU_SCIENTIFIC)
  }

  // TikTok SubmitForm on name submit (stable page). Facebook Lead is intentionally
  // NOT fired here — it fires on the offer page view (page: quiz_offer), since
  // this funnel has no separate results page. leadFiredRef guards double submits.
  const leadFiredRef = useRef(false)
  const handleNameSubmit = () => {
    if (!answers.name.trim()) return
    if (!leadFiredRef.current) {
      leadFiredRef.current = true
      trackTtEvent('SubmitForm', { content_name: 'quiz_natglow_name', content_category: plan_key, content_id: plan_key, content_type: 'product' })
    }
    setStep(STEPS.APP_PREVIEW)
  }

  // Shared container for the option questions — a touch wider (px-3) with roomy
  // vertical rhythm (gap-6) so the header/subtitle/options aren't cramped.
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

        {/* ═══ STEP 0 · WELCOME (no image) ═══ */}
        {step === STEPS.WELCOME && (
          <motion.div key="welcome" {...slide} className="max-w-lg mx-auto w-full px-4 pt-6 pb-8 flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: P }}>
                {t('quizNatglow.welcome.badge')}
              </span>

              <div className="text-center flex flex-col gap-3">
                <h1 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {hlTitle(t('quizNatglow.welcome.title'), t('quizNatglow.welcome.highlight'))}
                </h1>
                <p className="text-sm text-stone-400 leading-relaxed">{t('quizNatglow.welcome.subtitle')}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <FeatureRow icon={Leaf} iconColor="#1E8449" chip="#E8F8F0" text={t('quizNatglow.welcome.feature1')} />
              <FeatureRow icon={Sparkles} iconColor={P} chip="#FFF5FA" text={t('quizNatglow.welcome.feature2')} />
              <FeatureRow icon={Droplets} iconColor="#2563EB" chip="#E8F2FF" text={t('quizNatglow.welcome.feature3')} />
            </div>

            <PinkButton onClick={handleStartWelcome}>
              {t('quizNatglow.welcome.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 1 · SIGNS (from meta) ═══ */}
        {step === STEPS.SIGNS && (
          <motion.div key="signs" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <StepProgress current={1} total={TOTAL_QUIZ_STEPS} t={t} />
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                ¿Reconoces alguna de estas señales en tu cabello?
              </h2>
              <p className="text-sm text-stone-400 leading-snug">
                Identifica lo que sientes, esto nos ayuda a personalizar tu rutina.
              </p>
            </div>

            <motion.img
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              src={`${IMG}/symptoms.webp`}
              alt="Señales en el cabello"
              loading="lazy"
              decoding="async"
              className="w-full h-auto block rounded-2xl"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />

            <div className="flex flex-col gap-3">
              <PinkButton pulse={false} onClick={() => handleSymptoms('30days')}>
                Lo noto hace algunas semanas 😩
              </PinkButton>
              <PinkButton pulse={false} onClick={() => handleSymptoms('1year')}>
                Lo noto hace mucho tiempo 😨
              </PinkButton>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 1 · HAIR TYPE ═══ */}
        {step === STEPS.HAIR_TYPE && (
          <motion.div key="hair-type" {...slide} className={qClass}>
            <StepHead
              current={4} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 4, total: TOTAL_QUIZ_STEPS })}
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

        {/* ═══ STEP 2 · HAIR LENGTH (new — emoji tiles like GOAL) ═══ */}
        {step === STEPS.LENGTH && (
          <motion.div key="length" {...slide} className={qClass}>
            <StepHead
              current={5} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 5, total: TOTAL_QUIZ_STEPS })}
              title="¿Cuál es el largo actual de tu cabello?"
              subtitle="Esto puede cambiar cantidades y tiempo de aplicación."
            />
            <div className="grid grid-cols-2 gap-3">
              {LENGTH_TILES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card h-full flex flex-col ${answers.hairLength === opt.value ? 'selected' : ''}`}
                  onClick={() => pick('hairLength', opt.value, STEPS.AGE)}
                >
                  <div className="w-full h-36 flex items-center justify-center" style={{ background: PL2 }}>
                    <span className="text-5xl leading-none">{opt.emoji}</span>
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

        {/* ═══ STEP 3 · AGE ═══ */}
        {step === STEPS.AGE && (
          <motion.div key="age" {...slide} className={qClass}>
            <StepHead
              current={6} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 6, total: TOTAL_QUIZ_STEPS })}
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
                  onClick={() => pick('age', opt.value, STEPS.PROFILE)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 4 · PROFILE (new) ═══ */}
        {step === STEPS.PROFILE && (
          <motion.div key="profile" {...slide} className={qClass}>
            <StepHead
              current={7} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 7, total: TOTAL_QUIZ_STEPS })}
              title="¿Con cuál opción te identificas?"
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'mujer',  emoji: '👩', label: 'Mujer' },
                { value: 'hombre', emoji: '👨', label: 'Hombre' },
                { value: 'neutro', emoji: '🌿', label: 'Prefiero una guía neutra' },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.profilePreference === opt.value}
                  onClick={() => pick('profilePreference', opt.value, STEPS.GOAL)} />
              ))}
            </div>
            <p className="text-xs text-stone-400 leading-relaxed text-center px-2">
              Esta respuesta se usa para adaptar ejemplos y hábitos de cuidado. Las recomendaciones principales se basan en tu tipo de cabello y en tu rutina.
            </p>
          </motion.div>
        )}

        {/* ═══ STEP 3 · GOAL (image tiles, same format as hair type) ═══ */}
        {step === STEPS.GOAL && (
          <motion.div key="goal" {...slide} className={qClass}>
            <StepHead
              current={8} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 8, total: TOTAL_QUIZ_STEPS })}
              title="Vamos a organizar tu rutina según tus metas"
              subtitle="Elige todo lo que te gustaría priorizar."
            />
            <div className="flex flex-col gap-3">
              {GOAL_TILES.map(opt => (
                <QuizOption key={opt.value} emoji={opt.emoji} label={opt.label} desc={opt.desc}
                  selected={answers.goals?.includes(opt.value)}
                  onClick={() => toggleGoal(opt.value)} />
              ))}
            </div>
            <PinkButton onClick={submitGoals} disabled={!answers.goals?.length}>
              Continuar <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ EDUCATIONAL: routine vs residue buildup (follicle comparison) ═══ */}
        {step === STEPS.EDU_SCIENTIFIC && (
          <motion.div key="edu-scientific" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={2} total={TOTAL_QUIZ_STEPS} t={t} />
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle(t('quizNatglow.eduScientific.title'), t('quizNatglow.eduScientific.highlight'))}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">{t('quizNatglow.eduScientific.body')}</p>
            </div>

            <div className="rounded-2xl p-4 text-center text-sm text-stone-700 leading-relaxed border" style={{ borderColor: '#FFB3DD', background: '#FFF5FA' }}>
              {t('quizNatglow.eduScientific.darkBox')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: GREEN }}>{t('quizNatglow.eduScientific.labelGood')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src={`${IMG}/follicle-healthy.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: '#6b7280' }}>{t('quizNatglow.eduScientific.labelBad')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src={`${IMG}/follicle-damaged.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 text-center italic">{t('quizNatglow.eduScientific.caption')}</p>

            <PinkButton onClick={() => setStep(STEPS.REFRAMING)}>
              {t('quizNatglow.eduScientific.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 3 · REFRAMING (from meta) ═══ */}
        {step === STEPS.REFRAMING && (
          <motion.div key="reframing" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <StepProgress current={3} total={TOTAL_QUIZ_STEPS} t={t} />
            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '16/10' }}>
              <img src={`${IMG}/woman-worried.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-stone-900 leading-tight text-center">
              Lo que muchas personas<br />
              <span style={{ color: P_DARK }}>no saben sobre el cabello.</span>
            </h2>

            <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ borderColor: '#FFB3DD', background: '#FFF5FA' }}>
              <p className="text-sm text-stone-700 leading-relaxed">
                Muchas personas creen que solo la genética o la edad influyen en la apariencia del cabello. Pero los especialistas señalan que factores externos, como los residuos de productos y las agresiones diarias, también pueden afectar el ambiente del cuero cabelludo y la vitalidad del cabello.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                {['No es solo genética', 'No es solo estrés', 'No es solo el paso del tiempo'].map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-stone-500">
                    <X className="w-4 h-4 flex-shrink-0 text-stone-400" /> {d}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm font-semibold pt-1" style={{ color: P_DARK }}>
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: P }} /> Los cuidados diarios también tienen un papel importante
                </div>
              </div>
            </div>

            <PinkButton onClick={() => setStep(STEPS.HAIR_TYPE)}>
              Continuar <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 6 · WASH FREQ (detox, title only) ═══ */}
        {step === STEPS.WASH_FREQ && (
          <motion.div key="wash-freq" {...slide} className={qClass}>
            <StepHead
              current={9} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 9, total: TOTAL_QUIZ_STEPS })}
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

        {/* ═══ STEP 6 · WATER TEMP (detox, title only) ═══ */}
        {step === STEPS.WATER_TEMP && (
          <motion.div key="water-temp" {...slide} className={qClass}>
            <StepHead
              current={10} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 10, total: TOTAL_QUIZ_STEPS })}
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

        {/* ═══ STEP 7 · HEAT TOOLS (detox, title only) ═══ */}
        {step === STEPS.HEAT_TOOLS && (
          <motion.div key="heat-tools" {...slide} className={qClass}>
            <StepHead
              current={11} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 11, total: TOTAL_QUIZ_STEPS })}
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

        {/* ═══ SOCIAL PROOF (testimonial) ═══ */}
        {step === STEPS.SOCIAL_PROOF && (
          <motion.div key="social-proof" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <StepProgress current={12} total={TOTAL_QUIZ_STEPS} t={t} />
            <div className="rounded-2xl p-4 text-center border" style={{ borderColor: '#FFB3DD', background: '#FFF5FA' }}>
              <p className="font-extrabold text-sm mb-1" style={{ color: P_DARK }}>{t('quizNatglow.socialProof.title')}</p>
              <p className="text-sm text-stone-700 leading-relaxed">{t('quizNatglow.socialProof.subtitle')}</p>
            </div>

            <TestimonialCard
              avatarUrl={`${IMG}/testimonial-camila.webp`}
              name={t('quizNatglow.socialProof.testimonialName')}
              location={t('quizNatglow.socialProof.testimonialLocation')}
              text={t('quizNatglow.socialProof.testimonialText')}
              beforeUrl={`${IMG}/foto-a-1.webp`}
              afterUrl={`${IMG}/foto-b-1.webp`}
              showLabels={false}
              cardBorder="border-stone-100"
            />

            <p className="text-xs text-stone-500 text-center italic">{t('quizNatglow.socialProof.caption')}</p>

            <PinkButton onClick={() => setStep(STEPS.CHEM)}>
              {t('quizNatglow.socialProof.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 9 · CHEM PRODUCTS (detox, title only) ═══ */}
        {step === STEPS.CHEM && (
          <motion.div key="chem" {...slide} className={qClass}>
            <StepHead
              current={13} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 13, total: TOTAL_QUIZ_STEPS })}
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
                  onClick={() => pick('chemProducts', opt.value, STEPS.TIME)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 10 · TIME AVAILABLE (title only) ═══ */}
        {step === STEPS.TIME && (
          <motion.div key="time" {...slide} className={qClass}>
            <StepHead
              current={14} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 14, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.time.title')} highlight={t('quizNatglow.time.highlight')}
              subtitle={t('quizNatglow.time.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: '10', emoji: '⏱️', label: t('quizNatglow.time.opt1') },
                { value: '20', emoji: '⏰', label: t('quizNatglow.time.opt2') },
                { value: '30', emoji: '⏳', label: t('quizNatglow.time.opt3') },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.timeAvailable === opt.value}
                  onClick={() => pick('timeAvailable', opt.value, STEPS.NAME)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 11 · NAME ═══ */}
        {step === STEPS.NAME && (
          <motion.div key="name" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <StepProgress current={15} total={TOTAL_QUIZ_STEPS} t={t} />
            <div className="text-center pt-6">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="text-2xl font-extrabold text-stone-900 mb-2">{t('quizNatglow.name.title')}</h2>
              <p className="text-base text-stone-500">{t('quizNatglow.name.subtitle')}</p>
            </div>
            <input
              type="text"
              placeholder={t('quizNatglow.name.placeholder')}
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
              {t('quizNatglow.name.cta')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* ═══ STEP 13 · APP PREVIEW (no progress indicator — final reveal) ═══ */}
        {step === STEPS.APP_PREVIEW && (
          <motion.div key="app-preview" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle(
                  answers.name.trim()
                    ? t('quizNatglow.appPreview.titleWithName', { name: answers.name.trim() })
                    : t('quizNatglow.appPreview.titleNoName'),
                  t('quizNatglow.appPreview.highlight'),
                )}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">{t('quizNatglow.appPreview.subtitle')}</p>
            </div>

            <MockupCard />

            <PinkButton onClick={() => setStep(STEPS.LOADING)}>
              {t('quizNatglow.appPreview.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 14 · LOADING ═══ */}
        {step === STEPS.LOADING && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-lg mx-auto w-full px-4 py-16 flex flex-col items-center gap-8"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🌿</div>
              <h2 className="text-2xl font-extrabold text-stone-900">{t('quizNatglow.loading.title')}</h2>
              <p className="text-sm text-stone-400 mt-2">{t('quizNatglow.loading.subtitle')}</p>
            </div>
            <div className="w-full space-y-4">
              {[
                { label: t('quizNatglow.loading.step1'), threshold: 30 },
                { label: t('quizNatglow.loading.step2'), threshold: 65 },
                { label: t('quizNatglow.loading.step3'), threshold: 100 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                    style={{ background: loadingProgress >= item.threshold ? P : '#e7e5e4' }}
                  >
                    {loadingProgress >= item.threshold && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className={`text-sm transition-colors duration-500 ${loadingProgress >= item.threshold ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full"
                style={{ background: 'linear-gradient(90deg, #FB45A9, #E03594)' }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
      <LegalLine />
    </div>
  )
}
