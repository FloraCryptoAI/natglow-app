import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent } from '@/lib/trackFunnelEvent'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'
import LoadingTransition from '@/components/results/LoadingTransition'
import { getSafeDiagnosticFactors } from '@/lib/toxicityCalculator'

// Dedicated sessionStorage namespace shared across the /quiz-natglow funnel.
const STORE = 'natglow'

const PINK_DARK = '#E03594'
const PINK_BG = '#FFE4F2'
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'

const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

export default function ResultsNatglow({ pricingPlan = 'natglow' }) {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key, route_path } = planConfig

  const [showLoading, setShowLoading] = useState(false)

  // Fire the Meta Lead here (page: quiz_result) per the funnel spec — this is the
  // conversion signal for the natglow funnel, not the checkout. leadFiredRef
  // guards a re-render/StrictMode double fire.
  const leadFiredRef = useRef(false)
  useEffect(() => {
    trackFunnelEvent('results_natglow_viewed', null, plan_key)
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { funnel: 'quiz_natglow', page: 'quiz_result' })
      if (!leadFiredRef.current) {
        leadFiredRef.current = true
        trackFbEvent('Lead', { funnel: 'quiz_natglow', page: 'quiz_result' })
      }
      trackTtEvent('ViewContent', { content_name: 'results_natglow', content_id: plan_key, content_type: 'product' })
    })
  }, [plan_key])

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true })
  }, [user, isSubscribed, navigate])

  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${STORE}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers
  if (!answers) return <Navigate to={route_path} replace />

  const factors = getSafeDiagnosticFactors(answers)
  const name = answers.name?.trim()

  const handleProtocoloClick = () => {
    trackFunnelEvent('results_natglow_cta_clicked', null, plan_key)
    setShowLoading(true)
  }

  const onLoadingDone = () => {
    navigate('/offer-natglow', { state: { answers } })
  }

  if (showLoading) {
    return (
      <LoadingTransition
        onDone={onLoadingDone}
        title={t('natglowFlow.diagnosis.transitionTitle')}
        steps={t('natglowFlow.diagnosis.transitionSteps', { returnObjects: true })}
        accentColor="#FB45A9"
        barGradient="linear-gradient(90deg, #FB45A9, #E03594)"
      />
    )
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-md mx-auto px-5 pt-10 pb-10 flex flex-col gap-7">

        {/* ── HEADER ── */}
        <FadeIn>
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: PINK_BG }}
            >
              <Sparkles className="w-7 h-7" style={{ color: PINK_DARK }} />
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 leading-tight">
              {name
                ? t('natglowFlow.diagnosis.titleWithName', { name })
                : t('natglowFlow.diagnosis.titleNoName')}
              {' '}
              <span style={{ color: PINK_DARK, background: PINK_BG, padding: '0 6px' }}>
                {t('natglowFlow.diagnosis.titleHighlight')}
              </span>
              {' '}
              {t('natglowFlow.diagnosis.titleEnd')}
            </h1>
            <p className="text-sm text-stone-500 leading-snug">
              {t('natglowFlow.diagnosis.subtitle')}
            </p>
          </div>
        </FadeIn>

        {/* ── EVALUATION CARD ── */}
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex flex-col gap-4 px-5 py-5">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {t('natglowFlow.diagnosis.factorsHeading')}
              </p>
              {factors.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-xl flex-shrink-0 leading-none mt-0.5">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-sm leading-snug">{f.label}</p>
                    <p className="text-xs text-stone-500 leading-snug mt-0.5">{f.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ── CTA ── */}
        <FadeIn delay={0.3}>
          <motion.button
            onClick={handleProtocoloClick}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full py-5 font-extrabold text-white rounded-full flex items-center justify-center gap-2 text-base"
            style={{
              background: PINK_GRAD,
              boxShadow: '0 4px 24px rgba(251,69,169,0.4)',
            }}
          >
            {t('natglowFlow.diagnosis.cta')}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="text-xs text-stone-400 text-center">
            {t('natglowFlow.diagnosis.reassurance')}
          </p>
        </FadeIn>
      </div>

      <LegalLine />
    </div>
  )
}
