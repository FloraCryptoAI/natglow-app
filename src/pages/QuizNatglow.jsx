import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Leaf, Sparkles, Droplets, AlertTriangle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent } from '@/lib/trackFunnelEvent'
import { captureAttribution } from '@/lib/tracking/attribution'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'

// Dedicated sessionStorage namespace so this funnel never shares quiz state
// with /quiz-meta or /quiz (they all resolve to plan_key 'one_time_basic').
const STORE = 'natglow'
// Dedicated image folder — a full copy of /images/quiz so the natglow assets can
// be customized independently without touching /quiz-meta.
const IMG = '/images/quiz-natglow'
const APP_MOCKUP = `${IMG}/app-mockup.webp`

const STEPS = {
  WELCOME: 0,
  HAIR_TYPE: 1,
  AGE: 2,
  GOAL: 3,
  WASH_FREQ: 4,
  WATER_TEMP: 5,
  HEAT_TOOLS: 6,
  EDU_ROUTINE: 7,
  CHEM: 8,
  TIME: 9,
  EDU_RECIPES: 10,
  NAME: 11,
  APP_PREVIEW: 12,
  LOADING: 13,
}
// Progress bar denominator: hairType, age, goal, washFreq, waterTemp,
// heatTools, chem, time, name = 9 real questions.
const TOTAL_QUIZ_STEPS = 9

const P = '#FB45A9'
const P_DARK = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
// Softer hero gradient — mirrors the app's "Mi Rutina" header + the offer hero.
const BRAND_GRAD = 'linear-gradient(135deg, #FB45A9, #FFB3DD)'
const PL2 = '#FFE4F2'

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
      className={`card-option px-4 py-4 flex items-center gap-4 ${selected ? 'selected' : ''}`}
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
  const { plan_key, results_path } = planConfig
  // _v4: quiz restructured again (reason/recipes questions removed, hairType
  // before age, name before app preview), so an in-progress session under an
  // old key must not restore to a shifted step.
  const QUIZ_STATE_KEY = `glow_quiz_state_${STORE}_v4`

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const [step, setStep] = useState(STEPS.WELCOME)
  const [answers, setAnswers] = useState({
    hairType: '', age: '', hairGoal: '', washFreq: '',
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

  // GOAL uses image tiles (like hair type). Placeholder images = the hair
  // images for now; swap the `img` paths once the real goal images are added.
  const GOAL_TILES = [
    { value: 'hidratacion', img: `${IMG}/liso.webp`,     label: t('quizNatglow.goal.opt1'), desc: t('quizNatglow.goal.opt1desc') },
    { value: 'brillo',      img: `${IMG}/ondulado.webp`, label: t('quizNatglow.goal.opt2'), desc: t('quizNatglow.goal.opt2desc') },
    { value: 'frizz',       img: `${IMG}/cacheado.webp`, label: t('quizNatglow.goal.opt3'), desc: t('quizNatglow.goal.opt3desc') },
    { value: 'varias',      img: `${IMG}/crespo.webp`,   label: t('quizNatglow.goal.opt4'), desc: t('quizNatglow.goal.opt4desc') },
  ]

  useEffect(() => {
    captureAttribution()
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      // ViewContent on the first screen. PageView is fired once, globally, by
      // initFacebookPixel — not duplicated here. Hotmart handles Checkout/Purchase.
      trackFbEvent('ViewContent', { funnel: 'quiz_natglow', page: 'quiz_start' })
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
      navigate(results_path, { state: { answers } })
    }, 2800)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const ans = (field, value) => setAnswers(a => ({ ...a, [field]: value }))
  // Set an answer and advance to the next step in one tap.
  const pick = (field, value, next) => { ans(field, value); setStep(next) }

  const handleStartWelcome = () => {
    trackFunnelEvent('quiz_natglow_started', null, plan_key)
    setStep(STEPS.HAIR_TYPE)
  }

  // TikTok SubmitForm on name submit (stable page). Facebook Lead is intentionally
  // NOT fired here — it fires on the results page (page: quiz_result) per the
  // Meta funnel spec. leadFiredRef guards double submits.
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
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-full" style={{ background: PL2, color: P_DARK }}>
                {t('quizNatglow.welcome.badge')}
              </span>
            </div>

            <div className="text-center flex flex-col gap-2.5">
              <h1 className="text-3xl font-extrabold text-stone-900 leading-tight">
                {hlTitle(t('quizNatglow.welcome.title'), t('quizNatglow.welcome.highlight'))}
              </h1>
              <p className="text-base text-stone-500 leading-snug">{t('quizNatglow.welcome.subtitle')}</p>
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

        {/* ═══ STEP 1 · HAIR TYPE ═══ */}
        {step === STEPS.HAIR_TYPE && (
          <motion.div key="hair-type" {...slide} className={qClass}>
            <StepHead
              current={1} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 1, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.hairType.title')} highlight={t('quizNatglow.hairType.highlight')}
              subtitle={t('quizNatglow.hairType.subtitle')}
            />
            <div className="grid grid-cols-2 gap-3 items-start">
              {HAIR_TYPES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card ${answers.hairType === opt.value ? 'selected' : ''}`}
                  onClick={() => pick('hairType', opt.value, STEPS.AGE)}
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

        {/* ═══ STEP 2 · AGE ═══ */}
        {step === STEPS.AGE && (
          <motion.div key="age" {...slide} className={qClass}>
            <StepHead
              current={2} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 2, total: TOTAL_QUIZ_STEPS })}
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
                  onClick={() => pick('age', opt.value, STEPS.GOAL)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 3 · GOAL (image tiles, same format as hair type) ═══ */}
        {step === STEPS.GOAL && (
          <motion.div key="goal" {...slide} className={qClass}>
            <StepHead
              current={3} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 3, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.goal.title')} highlight={t('quizNatglow.goal.highlight')}
              subtitle={t('quizNatglow.goal.subtitle')}
            />
            <div className="grid grid-cols-2 gap-3">
              {GOAL_TILES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card h-full flex flex-col ${answers.hairGoal === opt.value ? 'selected' : ''}`}
                  onClick={() => pick('hairGoal', opt.value, STEPS.WASH_FREQ)}
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
                  <div className="px-3 py-3.5 flex-1 flex flex-col items-center justify-center gap-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-semibold text-stone-700 text-center leading-snug">{opt.label}</span>
                      {answers.hairGoal === opt.value && <Check className="w-4 h-4 flex-shrink-0" style={{ color: P }} />}
                    </div>
                    <p className="text-xs text-stone-400 leading-snug text-center">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 4 · WASH FREQ (detox, title only) ═══ */}
        {step === STEPS.WASH_FREQ && (
          <motion.div key="wash-freq" {...slide} className={qClass}>
            <StepHead
              current={4} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 4, total: TOTAL_QUIZ_STEPS })}
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

        {/* ═══ STEP 5 · WATER TEMP (detox, title only) ═══ */}
        {step === STEPS.WATER_TEMP && (
          <motion.div key="water-temp" {...slide} className={qClass}>
            <StepHead
              current={5} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 5, total: TOTAL_QUIZ_STEPS })}
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

        {/* ═══ STEP 6 · HEAT TOOLS (detox, title only) ═══ */}
        {step === STEPS.HEAT_TOOLS && (
          <motion.div key="heat-tools" {...slide} className={qClass}>
            <StepHead
              current={6} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 6, total: TOTAL_QUIZ_STEPS })}
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
                  onClick={() => pick('heatTools', opt.value, STEPS.EDU_ROUTINE)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 7 · EDUCATIONAL: each hair needs a routine ═══ */}
        {step === STEPS.EDU_ROUTINE && (
          <motion.div key="edu-routine" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <ProgressBar current={6} total={TOTAL_QUIZ_STEPS} />
            <div className="text-center flex flex-col gap-3">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ background: PL2 }}>
                <Sparkles className="w-7 h-7" style={{ color: P_DARK }} />
              </div>
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle(t('quizNatglow.eduRoutine.title'), t('quizNatglow.eduRoutine.highlight'))}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">{t('quizNatglow.eduRoutine.body')}</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 p-4 flex flex-col gap-3">
              {[
                { emoji: '🌿', text: t('quizNatglow.eduRoutine.bullet1') },
                { emoji: '💧', text: t('quizNatglow.eduRoutine.bullet2') },
                { emoji: '✨', text: t('quizNatglow.eduRoutine.bullet3') },
                { emoji: '📅', text: t('quizNatglow.eduRoutine.bullet4') },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ background: '#FFF5FA' }}>
                    {b.emoji}
                  </div>
                  <p className="text-sm text-stone-700 font-medium">{b.text}</p>
                </div>
              ))}
            </div>

            <PinkButton onClick={() => setStep(STEPS.CHEM)}>
              {t('quizNatglow.eduRoutine.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 8 · CHEM PRODUCTS (detox, title only) ═══ */}
        {step === STEPS.CHEM && (
          <motion.div key="chem" {...slide} className={qClass}>
            <StepHead
              current={7} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 7, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.chemProducts.title')} highlight={t('quizNatglow.chemProducts.highlight')}
              subtitle={t('quizNatglow.chemProducts.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'yes_heavy', emoji: '⚗️', label: t('quiz.options.chemHeavy') },
                { value: 'yes_mild',  emoji: '🧴', label: t('quiz.options.chemMild') },
                { value: 'no',        emoji: '🌿', label: t('quiz.options.chemNo') },
              ].map(opt => (
                <QuizOption key={opt.value} {...opt} selected={answers.chemProducts === opt.value}
                  onClick={() => pick('chemProducts', opt.value, STEPS.TIME)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 9 · TIME AVAILABLE (title only) ═══ */}
        {step === STEPS.TIME && (
          <motion.div key="time" {...slide} className={qClass}>
            <StepHead
              current={8} total={TOTAL_QUIZ_STEPS}
              badge={t('quizNatglow.stepBadge', { current: 8, total: TOTAL_QUIZ_STEPS })}
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
                  onClick={() => pick('timeAvailable', opt.value, STEPS.EDU_RECIPES)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 10 · EDUCATIONAL: random recipes vs guided routine ═══ */}
        {step === STEPS.EDU_RECIPES && (
          <motion.div key="edu-recipes" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <ProgressBar current={8} total={TOTAL_QUIZ_STEPS} />
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {hlTitle(
                  `${t('quizNatglow.eduRecipes.titlePre')} ${t('quizNatglow.eduRecipes.titleVs')} ${t('quizNatglow.eduRecipes.titlePost')}`,
                  t('quizNatglow.eduRecipes.highlight'),
                )}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">{t('quizNatglow.eduRecipes.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <h3 className="font-bold text-stone-800">{t('quizNatglow.eduRecipes.sinTitle')}</h3>
                </div>
                <ul className="space-y-3">
                  {[t('quizNatglow.eduRecipes.sin1'), t('quizNatglow.eduRecipes.sin2'), t('quizNatglow.eduRecipes.sin3'), t('quizNatglow.eduRecipes.sin4')].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <h3 className="font-bold text-stone-800">{t('quizNatglow.eduRecipes.conTitle')}</h3>
                </div>
                <ul className="space-y-3">
                  {[t('quizNatglow.eduRecipes.con1'), t('quizNatglow.eduRecipes.con2'), t('quizNatglow.eduRecipes.con3'), t('quizNatglow.eduRecipes.con4')].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700 font-medium leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <PinkButton onClick={() => setStep(STEPS.NAME)}>
              {t('quizNatglow.eduRecipes.cta')} <ArrowRight className="w-4 h-4" />
            </PinkButton>
          </motion.div>
        )}

        {/* ═══ STEP 11 · NAME ═══ */}
        {step === STEPS.NAME && (
          <motion.div key="name" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <ProgressBar current={9} total={TOTAL_QUIZ_STEPS} />
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

        {/* ═══ STEP 12 · APP PREVIEW ═══ */}
        {step === STEPS.APP_PREVIEW && (
          <motion.div key="app-preview" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-6">
            <ProgressBar current={9} total={TOTAL_QUIZ_STEPS} />
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

        {/* ═══ STEP 13 · LOADING ═══ */}
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
