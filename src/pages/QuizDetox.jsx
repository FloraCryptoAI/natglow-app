import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent } from '@/lib/trackFunnelEvent'
import { captureAttribution } from '@/lib/tracking/attribution'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'
import UrgencyBanner from '@/components/quiz/UrgencyBanner'
import ScientificCard from '@/components/quiz/ScientificCard'
import FakeNewsCard from '@/components/quiz/FakeNewsCard'
import ReframingCard from '@/components/quiz/ReframingCard'
import TestimonialCard from '@/components/quiz/TestimonialCard'
import PersuasiveStepHeader from '@/components/quiz/PersuasiveStepHeader'

const STEPS = {
  INTRO: 0,
  SYMPTOMS: 1,
  SCIENTIFIC: 2,
  NEWS: 3,
  REFRAMING: 4,
  AGE: 5,
  HAIR_TYPE: 6,
  Q1: 7,
  Q2: 8,
  Q3: 9,
  Q4: 10,
  Q5: 11,
  SOCIAL_PROOF: 12,
  NAME: 13,
  FINAL: 14,
  LOADING: 15,
}
const TOTAL_QUIZ_STEPS = 9

const P = '#FB45A9'
const PL2 = '#FFE4F2'
const GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const GREEN = '#27AE60'
const GREEN_DARK = '#1E8449'
const GREEN_GRAD = 'linear-gradient(135deg, #27AE60, #1E8449)'

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
  transition: { duration: 0.3 },
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
      style={{ background: GREEN_GRAD, boxShadow: '0 4px 24px rgba(39,174,96,0.35)' }}
    >
      {children}
    </motion.button>
  )
}

export default function QuizDetox({ pricingPlan = 'detox' }) {
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.detox
  const { plan_key, results_path } = planConfig
  const QUIZ_STATE_KEY = `glow_quiz_state_${plan_key}`

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
    { value: 'liso',     label: t('quiz.hairTypes.liso'),     img: '/images/quiz-v2/liso.jpg' },
    { value: 'ondulado', label: t('quiz.hairTypes.ondulado'), img: '/images/quiz-v2/ondulado.jpg' },
    { value: 'cacheado', label: t('quiz.hairTypes.cacheado'), img: '/images/quiz-v2/cacheado.jpg' },
    { value: 'crespo',   label: t('quiz.hairTypes.crespo'),   img: '/images/quiz-v2/crespo.jpg' },
  ]

  const SYMPTOM_PILLS = [
    t('quizDetox.symptoms.pills.dandruff'),
    t('quizDetox.symptoms.pills.itch'),
    t('quizDetox.symptoms.pills.grease'),
    t('quizDetox.symptoms.pills.hairLoss'),
    t('quizDetox.symptoms.pills.redness'),
    t('quizDetox.symptoms.pills.smell'),
    t('quizDetox.symptoms.pills.nightItch'),
    t('quizDetox.symptoms.pills.weakHair'),
    t('quizDetox.symptoms.pills.sensitive'),
  ]

  // Detox uses green accent for headers (lighter "wellness/cleansing" vibe vs bold's red)
  const stepBadge = (current) => t('quizDetox.stepBadge', { current, total: TOTAL_QUIZ_STEPS })

  useEffect(() => {
    captureAttribution()
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'quiz_detox', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'quiz_detox', content_category: plan_key, content_id: plan_key, content_type: 'product' })
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
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [step])

  useEffect(() => {
    if (step !== STEPS.LOADING) return
    trackFunnelEvent('quiz_detox_completed', { answers }, plan_key)
    trackFbEvent('Lead', { content_name: 'quiz_detox_completed', content_category: plan_key })
    trackTtEvent('SubmitForm', { content_name: 'quiz_detox_completed', content_category: plan_key, content_id: plan_key, content_type: 'product' })
    setLoadingProgress(0)
    const timers = [
      setTimeout(() => setLoadingProgress(30), 600),
      setTimeout(() => setLoadingProgress(65), 1300),
      setTimeout(() => setLoadingProgress(100), 2100),
    ]
    const done = setTimeout(() => {
      sessionStorage.removeItem(QUIZ_STATE_KEY)
      sessionStorage.removeItem(`glow_results_timer_end_${plan_key}`)
      sessionStorage.setItem(`glow_results_answers_${plan_key}`, JSON.stringify(answers))
      navigate(results_path, { state: { answers } })
    }, 2800)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const ans = (field, value) => setAnswers(a => ({ ...a, [field]: value }))

  const handleStartIntro = () => {
    trackFunnelEvent('quiz_detox_started', null, plan_key)
    setStep(STEPS.SYMPTOMS)
  }

  const handleSymptomsAnswer = (intensity) => {
    ans('symptomsIntensity', intensity)
    if (intensity === 'years') {
      trackFunnelEvent('quiz_detox_symptom_intense', { intensity }, plan_key)
    }
    setStep(STEPS.SCIENTIFIC)
  }

  const handleFinalAnswer = (choice) => {
    ans('finalChoice', choice)
    trackFunnelEvent(choice === 'yes' ? 'quiz_detox_final_yes' : 'quiz_detox_final_doubts', null, plan_key)
    setStep(STEPS.LOADING)
  }

  // Override progress bar color to green for detox vibe
  const stepHeader = (current, title, context, subtitle) => (
    <PersuasiveStepHeader
      current={current} total={TOTAL_QUIZ_STEPS} t={t}
      title={title}
      context={context}
      subtitle={subtitle}
      accentColor={GREEN_DARK}
      badgeText={stepBadge(current)}
    />
  )

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
        @keyframes pulse-scale { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
        .btn-pulse { animation: pulse-scale 1.8s ease-in-out infinite; }
        .card-option { border:2px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; }
        .card-option:active { border-color:#FB45A9; background:#FFF5FA; }
        .card-option.selected { border-color:#FB45A9; background:#FFF5FA; }
        .img-card { border:2px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; overflow:hidden; }
        .img-card:hover { border-color:#FB45A9; }
        .img-card.selected { border-color:#FB45A9; }
        .pill-green { background:#27AE60; color:#fff; border-radius:9999px; padding:6px 14px; font-size:0.75rem; font-weight:800; text-align:center; line-height:1.1; box-shadow:0 2px 8px rgba(39,174,96,0.2); }
      `}</style>

      <AnimatePresence mode="wait">

        {/* ═══ INTRO ═══ */}
        {step === STEPS.INTRO && (
          <motion.div key="intro" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <div className="w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-white font-extrabold text-sm tracking-wide" style={{ background: GREEN_DARK }}>
              {t('quizDetox.intro.urgencyBanner')}
            </div>

            <div className="text-center flex flex-col gap-2">
              <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">
                {t('quizDetox.intro.title')}
                <br />
                que está{' '}
                <span style={{ background: '#E8F8F0', padding: '0 6px', color: GREEN_DARK }}>{t('quizDetox.intro.titleHighlight1')}</span>{' '}
                {t('quizDetox.intro.titleMiddle')}{' '}
                <span style={{ background: '#FEF9C3', padding: '0 6px' }}>{t('quizDetox.intro.titleHighlight2')}</span>{' '}
                {t('quizDetox.intro.titleEnd')}
              </h1>
              <p className="text-sm text-stone-500 leading-snug">{t('quizDetox.intro.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: '#C0392B' }}>{t('quizDetox.intro.beforeLabel')}</span>
                <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', background: PL2 }}>
                  <img src="/images/quiz-v2/antes-1.jpg" alt="antes" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
                <p className="text-xs text-stone-500 text-center leading-tight">{t('quizDetox.intro.beforeCaption')}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: GREEN }}>{t('quizDetox.intro.afterLabel')}</span>
                <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', background: PL2 }}>
                  <img src="/images/quiz-v2/depois-1.jpg" alt="después" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
                <p className="text-xs text-stone-500 text-center leading-tight">{t('quizDetox.intro.afterCaption')}</p>
              </div>
            </div>

            <ScientificCard
              badge={t('quizDetox.intro.scientificBadge')}
              body={t('quizDetox.intro.scientificBody')}
            />

            <GreenButton onClick={handleStartIntro}>
              {t('quizDetox.intro.cta')}
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ SYMPTOMS ═══ */}
        {step === STEPS.SYMPTOMS && (
          <motion.div key="symptoms" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            {stepHeader(1, t('quizDetox.symptoms.title'))}

            <div className="relative w-full rounded-2xl overflow-hidden bg-stone-100" style={{ aspectRatio: '1/1' }}>
              <img
                src="/images/quiz-bold/woman-symptoms.jpg"
                alt=""
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              <div className="absolute inset-0 p-3 flex flex-wrap items-start gap-2 content-between">
                {SYMPTOM_PILLS.slice(0, 3).map((p, i) => (
                  <span key={i} className="pill-green">{p}</span>
                ))}
                <div className="w-full"></div>
                {SYMPTOM_PILLS.slice(3, 6).map((p, i) => (
                  <span key={i} className="pill-green">{p}</span>
                ))}
                <div className="w-full"></div>
                {SYMPTOM_PILLS.slice(6).map((p, i) => (
                  <span key={i} className="pill-green">{p}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <GreenButton pulse={false} onClick={() => handleSymptomsAnswer('months')}>
                {t('quizDetox.symptoms.ctaShort')} 😟
              </GreenButton>
              <GreenButton pulse={false} onClick={() => handleSymptomsAnswer('years')}>
                {t('quizDetox.symptoms.ctaLong')} 😱
              </GreenButton>
            </div>
          </motion.div>
        )}

        {/* ═══ SCIENTIFIC FEAR ═══ */}
        {step === STEPS.SCIENTIFIC && (
          <motion.div key="scientific" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <UrgencyBanner text={t('quizDetox.scientificFear.urgencyBanner')} />

            <h2 className="text-xl font-extrabold text-stone-900 leading-snug text-center">
              {t('quizDetox.scientificFear.headline')}{' '}
              <span style={{ background: '#FDEDEC', color: '#C0392B', padding: '0 6px' }}>{t('quizDetox.scientificFear.headlineHighlight')}</span>{' '}
              {t('quizDetox.scientificFear.headlineMiddle')}{' '}
              <span style={{ background: '#FDEDEC', color: '#C0392B', padding: '0 6px' }}>{t('quizDetox.scientificFear.headlineDanger')}</span>{' '}
              {t('quizDetox.scientificFear.headlineEnd')}
            </h2>

            <div className="rounded-2xl p-4 text-center text-white font-bold text-sm" style={{ background: '#1c1917' }}>
              {t('quizDetox.scientificFear.warningBox')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: GREEN }}>{t('quizDetox.scientificFear.healthyLabel')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src="/images/quiz-bold/follicle-healthy.jpg" alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="self-start px-2 py-0.5 rounded text-white text-xs font-extrabold" style={{ background: '#C0392B' }}>{t('quizDetox.scientificFear.damagedLabel')}</span>
                <div className="rounded-2xl overflow-hidden bg-stone-200" style={{ aspectRatio: '1/1' }}>
                  <img src="/images/quiz-bold/follicle-damaged.jpg" alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 text-center italic">{t('quizDetox.scientificFear.caption')}</p>

            <GreenButton onClick={() => setStep(STEPS.NEWS)}>
              {t('quizDetox.scientificFear.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ FAKE NEWS ═══ */}
        {step === STEPS.NEWS && (
          <motion.div key="news" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <FakeNewsCard
              logoLabel={t('quizDetox.news.logoLabel')}
              headline={t('quizDetox.news.headline')}
              subheadline={t('quizDetox.news.subheadline')}
              credit={t('quizDetox.news.credit')}
              imageUrl="/images/quiz-bold/news-screenshot.jpg"
            />

            <GreenButton onClick={() => setStep(STEPS.REFRAMING)}>
              {t('quizDetox.news.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ REFRAMING ═══ */}
        {step === STEPS.REFRAMING && (
          <motion.div key="reframing" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <div className="rounded-2xl overflow-hidden bg-stone-100 w-full" style={{ aspectRatio: '16/10' }}>
              <img src="/images/quiz-bold/woman-worried.jpg" alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>

            <h2 className="text-3xl font-extrabold text-stone-900 leading-tight text-center">
              {t('quizDetox.reframing.headline1')}
              <br />
              <span style={{ color: '#C0392B' }}>{t('quizDetox.reframing.headline2')}</span>
            </h2>

            <ReframingCard
              explanation={t('quizDetox.reframing.explanation')}
              denials={[
                t('quizDetox.reframing.denial1'),
                t('quizDetox.reframing.denial2'),
                t('quizDetox.reframing.denial3'),
              ]}
              affirmation={t('quizDetox.reframing.affirmation')}
            />

            <GreenButton onClick={() => setStep(STEPS.AGE)}>
              {t('quizDetox.reframing.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ AGE ═══ */}
        {step === STEPS.AGE && (
          <motion.div key="age" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(2, t('quizDetox.questions.age.title'), t('quizDetox.questions.age.context'))}
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
            {stepHeader(3, t('quizDetox.questions.hairType.title'), t('quizDetox.questions.hairType.context'))}
            <div className="grid grid-cols-2 gap-3">
              {HAIR_TYPES.map(opt => (
                <div
                  key={opt.value}
                  className={`img-card ${answers.hairType === opt.value ? 'selected' : ''}`}
                  onClick={() => { ans('hairType', opt.value); setStep(STEPS.Q1) }}
                >
                  <div className="w-full overflow-hidden" style={{ aspectRatio: '3/2', background: PL2 }}>
                    <img src={opt.img} alt={opt.label} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
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

        {/* ═══ Q1 — WASH FREQ ═══ */}
        {step === STEPS.Q1 && (
          <motion.div key="q1" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(4, t('quizDetox.questions.washFreq.title'), t('quizDetox.questions.washFreq.context'))}
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

        {/* ═══ Q2 — WATER TEMP ═══ */}
        {step === STEPS.Q2 && (
          <motion.div key="q2" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(5, t('quizDetox.questions.waterTemp.title'), t('quizDetox.questions.waterTemp.context'))}
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

        {/* ═══ Q3 — HEAT TOOLS ═══ */}
        {step === STEPS.Q3 && (
          <motion.div key="q3" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(6, t('quizDetox.questions.heatTools.title'), t('quizDetox.questions.heatTools.context'))}
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

        {/* ═══ Q4 — HYDRATION ═══ */}
        {step === STEPS.Q4 && (
          <motion.div key="q4" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(7, t('quizDetox.questions.hydration.title'), t('quizDetox.questions.hydration.context'))}
            <div className="flex flex-col gap-3">
              {[
                { value: 'regularly', label: t('quiz.options.hydroRegularly'), emoji: '✅', desc: t('quiz.options.hydroRegularlyDesc') },
                { value: 'sometimes', label: t('quiz.options.hydroSometimes'), emoji: '🔄', desc: t('quiz.options.hydroSometimesDesc') },
                { value: 'never',     label: t('quiz.options.hydroNever'),     emoji: '❌', desc: t('quiz.options.hydroNeverDesc') },
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

        {/* ═══ Q5 — CHEM PRODUCTS ═══ */}
        {step === STEPS.Q5 && (
          <motion.div key="q5" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(8, t('quizDetox.questions.chemProducts.title'), t('quizDetox.questions.chemProducts.context'), t('quizDetox.questions.chemProducts.subtitle'))}
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

        {/* ═══ SOCIAL PROOF ═══ */}
        {step === STEPS.SOCIAL_PROOF && (
          <motion.div key="social" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-5">
            <div className="rounded-2xl p-4 text-center" style={{ background: '#E8F8F0', borderLeft: `4px solid ${GREEN}` }}>
              <p className="font-extrabold text-stone-900 text-sm">{t('quizDetox.socialProof.banner')}</p>
              <p className="text-xs text-stone-600 mt-1">{t('quizDetox.socialProof.bannerSub')}</p>
            </div>

            <TestimonialCard
              avatarUrl="/images/quiz-bold/testimonial-maria.jpg"
              name={t('quizDetox.socialProof.testimonialName')}
              location={t('quizDetox.socialProof.testimonialLocation')}
              text={t('quizDetox.socialProof.testimonialText')}
              beforeUrl="/images/quiz-v2/antes-1.jpg"
              afterUrl="/images/quiz-v2/depois-1.jpg"
              beforeLabel={t('quizDetox.socialProof.beforeLabel')}
              afterLabel={t('quizDetox.socialProof.afterLabel')}
            />

            <p className="text-xs text-stone-500 text-center italic">{t('quizDetox.socialProof.caption')}</p>

            <GreenButton onClick={() => setStep(STEPS.NAME)}>
              {t('quizDetox.socialProof.cta')} <ArrowRight className="w-4 h-4" />
            </GreenButton>
          </motion.div>
        )}

        {/* ═══ NAME ═══ */}
        {step === STEPS.NAME && (
          <motion.div key="name" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
            {stepHeader(9, t('quiz.name.title'), null, t('quiz.name.subtitle'))}
            <input
              type="text"
              placeholder={t('quiz.name.placeholder')}
              value={answers.name}
              onChange={e => ans('name', e.target.value)}
              className="w-full border-2 border-stone-200 rounded-2xl px-5 py-4 text-lg text-stone-800 outline-none transition-colors"
              onFocus={e => { e.target.style.borderColor = P }}
              onBlur={e => { if (!answers.name.trim()) e.target.style.borderColor = '#e7e5e4' }}
            />
            <button
              disabled={!answers.name.trim()}
              onClick={() => setStep(STEPS.FINAL)}
              className="btn-primary py-6 text-base flex items-center justify-center gap-2"
            >
              {t('quiz.name.cta')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* ═══ FINAL EMOTIONAL QUESTION ═══ */}
        {step === STEPS.FINAL && (
          <motion.div key="final" {...slide} className="max-w-lg mx-auto w-full px-4 pt-20 pb-8 flex flex-col gap-8 min-h-screen">
            <h2 className="text-2xl font-extrabold text-stone-900 leading-snug text-center">
              {t('quizDetox.finalQuestion.headline1')}{' '}
              <span style={{ color: GREEN_DARK, background: '#E8F8F0', padding: '0 6px' }}>{t('quizDetox.finalQuestion.headlineHighlight1')}</span>{' '}
              {t('quizDetox.finalQuestion.headline2')}{' '}
              <span style={{ color: GREEN_DARK, background: '#E8F8F0', padding: '0 6px' }}>{t('quizDetox.finalQuestion.headlineHighlight2')}</span>{' '}
              {t('quizDetox.finalQuestion.headline3')}
            </h2>

            <div className="flex flex-col gap-3">
              <GreenButton pulse={true} onClick={() => handleFinalAnswer('yes')}>
                🌿 {t('quizDetox.finalQuestion.ctaYes')}
              </GreenButton>
              <button
                onClick={() => handleFinalAnswer('doubts')}
                className="w-full py-5 font-extrabold rounded-full text-base flex items-center justify-center gap-2 border-2 border-stone-300 bg-white text-stone-700"
              >
                🙂 {t('quizDetox.finalQuestion.ctaDoubts')}
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
              <h2 className="text-2xl font-extrabold text-stone-900">{t('quiz.loading.title')}</h2>
              <p className="text-sm text-stone-400 mt-2">{t('quiz.loading.subtitle')}</p>
            </div>
            <div className="w-full space-y-4">
              {[
                { label: t('quiz.loading.step1'), threshold: 30 },
                { label: t('quiz.loading.step2'), threshold: 65 },
                { label: t('quiz.loading.step3'), threshold: 100 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                    style={{ background: loadingProgress >= item.threshold ? GREEN : '#e7e5e4' }}
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
                style={{ background: GREEN_GRAD }}
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
