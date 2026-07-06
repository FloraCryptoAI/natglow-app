import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent } from '@/lib/trackFunnelEvent'
import { captureAttribution } from '@/lib/tracking/attribution'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'
import ReframingCard from '@/components/quiz/ReframingCard'
import TestimonialCard from '@/components/quiz/TestimonialCard'
import PersuasiveStepHeader from '@/components/quiz/PersuasiveStepHeader'

// Dedicated sessionStorage namespace so this funnel never shares quiz state
// with /quiz-meta or /quiz (they all resolve to plan_key 'one_time_basic').
const STORE = 'natglow'
// Dedicated image folder — a full copy of /images/quiz so the natglow assets can
// be customized independently without touching /quiz-meta.
const IMG = '/images/quiz-natglow'

const STEPS = {
  INTRO: 0,
  SYMPTOMS: 1,
  EDUCATIONAL: 2,
  NOTKNOWN: 3,
  AGE: 4,
  HAIR_TYPE: 5,
  Q1: 6,
  Q2: 7,
  Q3: 8,
  Q4: 9,
  Q5: 10,
  SOCIAL_PROOF: 11,
  NAME: 12,
  FINAL: 13,
  LOADING: 14,
}
const TOTAL_QUIZ_STEPS = 9

const P = '#FB45A9'
const P_DARK = '#E03594'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const PINK_BAR = 'linear-gradient(90deg, #FB45A9, #E03594)'
const GREEN = '#27AE60' // kept only for the educational "rutina equilibrada" label
const PL2 = '#FFE4F2'

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
  transition: { duration: 0.3 },
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5">
      <motion.div
        className="h-1.5 rounded-full"
        style={{ background: PINK_BAR }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
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
        <p className="font-semibold text-stone-700 text-base">{label}</p>
        {desc && <p className="text-sm text-stone-400 mt-0.5">{desc}</p>}
      </div>
      {selected && <Check className="w-5 h-5 flex-shrink-0" style={{ color: P }} />}
    </div>
  )
}

function GreenButton({ children, onClick, pulse = true }) {
  return (
    <motion.button
      onClick={onClick}
      animate={pulse ? { scale: [1, 1.03, 1] } : {}}
      transition={pulse ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="w-full py-5 font-extrabold text-white rounded-full text-base flex items-center justify-center gap-2"
      style={{ background: PINK_GRAD, boxShadow: '0 4px 24px rgba(251,69,169,0.35)' }}
    >
      {children}
    </motion.button>
  )
}

export default function QuizNatglow({ pricingPlan = 'natglow' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key, results_path } = planConfig
  const QUIZ_STATE_KEY = `glow_quiz_state_${STORE}`

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const [step, setStep] = useState(STEPS.INTRO)
  const [answers, setAnswers] = useState({
    age: '', hairType: '',
    washFreq: '', waterTemp: '', heatTools: '', hydration: '', chemProducts: '',
    name: '',
    symptomsIntensity: '',
    finalChoice: '',
  })
  const [loadingProgress, setLoadingProgress] = useState(0)

  const HAIR_TYPES = [
    { value: 'liso',     label: t('quiz.hairTypes.liso'),     img: `${IMG}/liso.webp` },
    { value: 'ondulado', label: t('quiz.hairTypes.ondulado'), img: `${IMG}/ondulado.webp` },
    { value: 'cacheado', label: t('quiz.hairTypes.cacheado'), img: `${IMG}/cacheado.webp` },
    { value: 'crespo',   label: t('quiz.hairTypes.crespo'),   img: `${IMG}/crespo.webp` },
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
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
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

  const handleStartIntro = () => {
    trackFunnelEvent('quiz_natglow_started', null, plan_key)
    setStep(STEPS.SYMPTOMS)
  }

  const handleSymptomsAnswer = (intensity) => {
    ans('symptomsIntensity', intensity)
    setStep(STEPS.EDUCATIONAL)
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
    setStep(STEPS.FINAL)
  }

  const handleFinalAnswer = (choice) => {
    ans('finalChoice', choice)
    trackFunnelEvent(choice === 'yes' ? 'quiz_natglow_final_yes' : 'quiz_natglow_final_doubts', null, plan_key)
    setStep(STEPS.LOADING)
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
        .card-option { border:2px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; }
        .card-option:active { border-color:#FB45A9; background:#FFF5FA; }
        .card-option.selected { border-color:#FB45A9; background:#FFF5FA; }
        .img-card { border:2px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; overflow:hidden; }
        .img-card:hover { border-color:#FB45A9; }
        .img-card.selected { border-color:#FB45A9; }
      `}</style>

      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>

        {/* ═══ INTRO (safe) ═══ */}
        {step === STEPS.INTRO && (
          <motion.div key="intro" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <div className="w-full rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 font-extrabold text-xs tracking-wide" style={{ background: '#FFE4F2', color: P_DARK }}>
              <Info className="w-4 h-4 flex-shrink-0" />
              {t('quizNatglow.intro.infoBanner')}
            </div>

            <div className="text-center flex flex-col gap-2">
              <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">
                {t('quizNatglow.intro.title')}
              </h1>
              <p className="text-sm text-stone-500 leading-snug">{t('quizNatglow.intro.subtitle')}</p>
            </div>

            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '16/10' }}>
              <img
                src={`${IMG}/natglow-hero.webp`}
                alt=""
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
              />
            </div>

            <p className="text-sm text-stone-500 text-center leading-snug">{t('quizNatglow.intro.support')}</p>

            <div className="rounded-2xl p-4 border-2" style={{ borderColor: P, background: '#FFE4F2' }}>
              <p className="font-extrabold text-sm mb-1" style={{ color: P_DARK }}>{t('quizNatglow.intro.didYouKnowBadge')}</p>
              <p className="text-sm text-stone-700 leading-snug">{t('quizNatglow.intro.didYouKnowBody')}</p>
            </div>

            <GreenButton onClick={handleStartIntro}>
              {t('quizNatglow.intro.cta')}
            </GreenButton>

            <div className="text-center flex flex-col gap-1">
              <p className="text-xs text-stone-400">{t('quizNatglow.intro.footer')}</p>
              <p className="text-xs text-stone-400 italic">{t('quizNatglow.intro.disclaimer')}</p>
            </div>
          </motion.div>
        )}

        {/* ═══ SYMPTOMS (kept from quiz-meta, softened copy) ═══ */}
        {step === STEPS.SYMPTOMS && (
          <motion.div key="symptoms" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <ProgressBar current={1} total={TOTAL_QUIZ_STEPS} />

            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                {t('quizNatglow.symptoms.title')}
              </h2>
              <p className="text-sm text-stone-500 leading-snug">
                {t('quizNatglow.symptoms.subtitle')}
              </p>
            </div>

            <motion.img
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              src={`${IMG}/senales.webp`}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-auto block"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />

            <div className="flex flex-col gap-3">
              <GreenButton pulse={false} onClick={() => handleSymptomsAnswer('recent')}>
                {t('quizNatglow.symptoms.ctaShort')} 😕
              </GreenButton>
              <GreenButton pulse={false} onClick={() => handleSymptomsAnswer('longtime')}>
                {t('quizNatglow.symptoms.ctaLong')} 😟
              </GreenButton>
            </div>
          </motion.div>
        )}

        {/* ═══ EDUCATIONAL (safe) ═══ */}
        {step === STEPS.EDUCATIONAL && (
          <motion.div key="educational" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <h2 className="text-xl font-extrabold text-stone-900 leading-snug text-center">
              {t('quizNatglow.educational.title')}
            </h2>

            <p className="text-sm text-stone-600 leading-snug text-center">
              {t('quizNatglow.educational.body')}
            </p>

            <div className="rounded-2xl p-4 text-center font-bold text-sm text-stone-700" style={{ background: '#FFE4F2' }}>
              {t('quizNatglow.educational.darkBox')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: GREEN }}>{t('quizNatglow.educational.labelGood')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src={`${IMG}/follicle-healthy.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: '#6b7280' }}>{t('quizNatglow.educational.labelBad')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src={`${IMG}/follicle-damaged.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 text-center italic">{t('quizNatglow.educational.caption')}</p>

            <GreenButton onClick={() => setStep(STEPS.NOTKNOWN)}>
              {t('quizNatglow.educational.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ WHAT PEOPLE DON'T KNOW (safe reframing) ═══ */}
        {step === STEPS.NOTKNOWN && (
          <motion.div key="notknown" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '16/10' }}>
              <img src={`${IMG}/woman-worried.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.currentTarget.parentElement.style.display = 'none' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-stone-900 leading-tight text-center">
              {t('quizNatglow.notKnown.title')}
            </h2>

            <ReframingCard
              borderColor={P}
              bgColor="#FFE4F2"
              explanation={t('quizNatglow.notKnown.explanation')}
              denials={[
                t('quizNatglow.notKnown.denial1'),
                t('quizNatglow.notKnown.denial2'),
                t('quizNatglow.notKnown.denial3'),
              ]}
              affirmation={t('quizNatglow.notKnown.affirmation')}
            />

            <GreenButton onClick={() => setStep(STEPS.AGE)}>
              {t('quizNatglow.notKnown.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ AGE ═══ */}
        {step === STEPS.AGE && (
          <motion.div key="age" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={2} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 2, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.age.title')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: '18_29',   label: t('quiz.options.age18'), emoji: '🌸' },
                { value: '30_39',   label: t('quiz.options.age30'), emoji: '🌺' },
                { value: '40_49',   label: t('quiz.options.age40'), emoji: '🌼' },
                { value: '50_plus', label: t('quiz.options.age50'), emoji: '🌻' },
              ].map(opt => (
                <QuizOption
                  key={opt.value}
                  {...opt}
                  selected={answers.age === opt.value}
                  onClick={() => { ans('age', opt.value); setStep(STEPS.HAIR_TYPE) }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ HAIR TYPE ═══ */}
        {step === STEPS.HAIR_TYPE && (
          <motion.div key="hair-type" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={3} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 3, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.hairType.title')}
            />
            <div className="grid grid-cols-2 gap-3 items-start">
              {HAIR_TYPES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card ${answers.hairType === opt.value ? 'selected' : ''}`}
                  onClick={() => { ans('hairType', opt.value); setStep(STEPS.Q1) }}
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

        {/* ═══ Q1 WASH FREQ ═══ */}
        {step === STEPS.Q1 && (
          <motion.div key="q1" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={4} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 4, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.washFreq.title')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'daily', label: t('quiz.options.washDaily'), emoji: '🚿', desc: t('quiz.options.washDailyDesc') },
                { value: '3_4',   label: t('quiz.options.wash3_4'),   emoji: '📅', desc: t('quiz.options.wash3_4Desc') },
                { value: '1_2',   label: t('quiz.options.wash1_2'),   emoji: '🌿', desc: t('quiz.options.wash1_2Desc') },
              ].map(opt => (
                <QuizOption
                  key={opt.value}
                  {...opt}
                  selected={answers.washFreq === opt.value}
                  onClick={() => { ans('washFreq', opt.value); setStep(STEPS.Q2) }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ Q2 WATER TEMP ═══ */}
        {step === STEPS.Q2 && (
          <motion.div key="q2" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={5} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 5, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.waterTemp.title')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'hot',  label: t('quiz.options.waterHot'),  emoji: '🔥', desc: t('quiz.options.waterHotDesc') },
                { value: 'warm', label: t('quiz.options.waterWarm'), emoji: '💧', desc: t('quiz.options.waterWarmDesc') },
                { value: 'cold', label: t('quiz.options.waterCold'), emoji: '❄️', desc: t('quiz.options.waterColdDesc') },
              ].map(opt => (
                <QuizOption
                  key={opt.value}
                  {...opt}
                  selected={answers.waterTemp === opt.value}
                  onClick={() => { ans('waterTemp', opt.value); setStep(STEPS.Q3) }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ Q3 HEAT TOOLS ═══ */}
        {step === STEPS.Q3 && (
          <motion.div key="q3" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={6} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 6, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.heatTools.title')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'daily',  label: t('quiz.options.heatDaily'),  emoji: '🔌', desc: t('quiz.options.heatDailyDesc') },
                { value: 'few',    label: t('quiz.options.heatFew'),    emoji: '📆', desc: t('quiz.options.heatFewDesc') },
                { value: 'rarely', label: t('quiz.options.heatRarely'), emoji: '🌬️', desc: t('quiz.options.heatRarelyDesc') },
              ].map(opt => (
                <QuizOption
                  key={opt.value}
                  {...opt}
                  selected={answers.heatTools === opt.value}
                  onClick={() => { ans('heatTools', opt.value); setStep(STEPS.Q4) }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ Q4 HYDRATION ═══ */}
        {step === STEPS.Q4 && (
          <motion.div key="q4" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={7} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 7, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.hydration.title')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'regularly', label: t('quiz.options.hydroRegularly'), emoji: '✅', desc: t('quiz.options.hydroRegularlyDesc') },
                { value: 'sometimes', label: t('quiz.options.hydroSometimes'), emoji: '🔄', desc: t('quiz.options.hydroSometimesDesc') },
                { value: 'never',     label: t('quiz.options.hydroNever'),     emoji: '🌱', desc: t('quiz.options.hydroNeverDesc') },
              ].map(opt => (
                <QuizOption
                  key={opt.value}
                  {...opt}
                  selected={answers.hydration === opt.value}
                  onClick={() => { ans('hydration', opt.value); setStep(STEPS.Q5) }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ Q5 CHEM PRODUCTS ═══ */}
        {step === STEPS.Q5 && (
          <motion.div key="q5" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            <PersuasiveStepHeader
              current={8} total={TOTAL_QUIZ_STEPS} t={t} accentColor={P_DARK} progressGradient={PINK_BAR}
              badgeText={t('quizNatglow.stepBadge', { current: 8, total: TOTAL_QUIZ_STEPS })}
              title={t('quizNatglow.questions.chemProducts.title')}
              subtitle={t('quizNatglow.questions.chemProducts.subtitle')}
            />
            <div className="flex flex-col gap-3">
              {[
                { value: 'yes_heavy', label: t('quiz.options.chemHeavy'), emoji: '⚗️', desc: t('quiz.options.chemHeavyDesc') },
                { value: 'yes_mild',  label: t('quiz.options.chemMild'),  emoji: '🧴', desc: t('quiz.options.chemMildDesc') },
                { value: 'no',        label: t('quiz.options.chemNo'),    emoji: '🌿', desc: t('quiz.options.chemNoDesc') },
              ].map(opt => (
                <QuizOption
                  key={opt.value}
                  {...opt}
                  selected={answers.chemProducts === opt.value}
                  onClick={() => { ans('chemProducts', opt.value); setStep(STEPS.SOCIAL_PROOF) }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ SOCIAL PROOF (safe) ═══ */}
        {step === STEPS.SOCIAL_PROOF && (
          <motion.div key="social" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <div className="rounded-2xl p-4 text-center" style={{ background: '#FFE4F2', borderLeft: `4px solid ${P}` }}>
              <p className="font-extrabold text-stone-900 text-sm">{t('quizNatglow.socialProof.title')}</p>
              <p className="text-xs text-stone-600 mt-1">{t('quizNatglow.socialProof.subtitle')}</p>
            </div>

            <TestimonialCard
              avatarUrl={`${IMG}/testimonial-camila.webp`}
              name={t('quizNatglow.socialProof.testimonialName')}
              location={t('quizNatglow.socialProof.testimonialLocation')}
              text={t('quizNatglow.socialProof.testimonialText')}
              beforeUrl={`${IMG}/antes-1.webp`}
              afterUrl={`${IMG}/depois-1.webp`}
              beforeLabel={t('quizNatglow.socialProof.beforeLabel')}
              afterLabel={t('quizNatglow.socialProof.afterLabel')}
            />

            <p className="text-xs text-stone-500 text-center italic">{t('quizNatglow.socialProof.caption')}</p>

            <GreenButton onClick={() => setStep(STEPS.NAME)}>
              {t('quizNatglow.socialProof.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ NAME ═══ */}
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
              className="w-full border-2 border-stone-200 rounded-2xl px-5 py-4 text-lg text-stone-800 outline-none transition-colors"
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

        {/* ═══ FINAL (light) ═══ */}
        {step === STEPS.FINAL && (
          <motion.div key="final" {...slide} className="max-w-lg mx-auto w-full px-4 pt-20 pb-8 flex flex-col gap-8 min-h-screen">
            <h2 className="text-2xl font-extrabold text-stone-900 leading-snug text-center">
              {t('quizNatglow.final.headline1')}{' '}
              <span style={{ color: P_DARK, background: '#FFE4F2', padding: '0 6px' }}>{t('quizNatglow.final.headlineHighlight1')}</span>{' '}
              {t('quizNatglow.final.headline2')}{' '}
              <span style={{ color: P_DARK, background: '#FFE4F2', padding: '0 6px' }}>{t('quizNatglow.final.headlineHighlight2')}</span>
              {t('quizNatglow.final.headline3')}
            </h2>

            <div className="flex flex-col gap-3">
              <GreenButton pulse={true} onClick={() => handleFinalAnswer('yes')}>
                🤩 {t('quizNatglow.final.ctaYes')}
              </GreenButton>
              <button
                onClick={() => handleFinalAnswer('doubts')}
                className="w-full py-5 font-extrabold rounded-full text-base flex items-center justify-center gap-2 border-2 border-stone-300 bg-white text-stone-700"
              >
                🙂 {t('quizNatglow.final.ctaDoubts')}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ LOADING ═══ */}
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
