import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent } from '@/lib/trackFunnelEvent'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'
import ToxicityGauge from '@/components/results/ToxicityGauge'
import ComparativeBar from '@/components/results/ComparativeBar'
import LoadingTransition from '@/components/results/LoadingTransition'
import {
  calculateToxicityScore,
  getDiagnosticFactors,
  getToxicityLevel,
  AVERAGE_TOXICITY,
} from '@/lib/toxicityCalculator'

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

export default function ResultsDetox({ pricingPlan = 'detox' }) {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.detox
  const { plan_key, route_path } = planConfig

  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    trackFunnelEvent('results_detox_viewed', null, plan_key)
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'results_detox', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'results_detox', content_id: plan_key, content_type: 'product' })
    })
  }, [plan_key])

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true })
  }, [user, isSubscribed, navigate])

  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${plan_key}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers
  if (!answers) return <Navigate to={route_path} replace />

  const score = calculateToxicityScore(answers)
  const level = getToxicityLevel(score)
  const factors = getDiagnosticFactors(answers)
  const name = answers.name?.trim()

  const handleProtocoloClick = () => {
    trackFunnelEvent('results_detox_protocolo_clicked', null, plan_key)
    setShowLoading(true)
  }

  const onLoadingDone = () => {
    navigate('/offer-detox', { state: { answers, score } })
  }

  if (showLoading) {
    return <LoadingTransition onDone={onLoadingDone} />
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NatGlow" className="w-11 h-11 rounded-2xl object-cover" />
            <span style={{ fontWeight: 400, color: '#535353', fontSize: '16px', letterSpacing: '-0.01em' }}>NatGlow</span>
          </div>
          <Link to="/Login" className="text-xs font-semibold text-stone-400 hover:text-stone-600">
            Ya tengo cuenta →
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 pt-5 pb-10 flex flex-col gap-6">

        <FadeIn>
          <div
            className="w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-white font-extrabold text-sm tracking-wide"
            style={{ background: level.color }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t('detoxFlow.diagnosis.urgencyBanner')}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-3xl font-extrabold text-stone-900 leading-tight text-center">
            {name
              ? t('detoxFlow.diagnosis.titleWithName', { name })
              : t('detoxFlow.diagnosis.titleNoName')}
            {' '}
            <span style={{ color: level.color }}>{score}%</span>
            {' '}
            {t('detoxFlow.diagnosis.titleScoreSuffix')}{' '}
            <span style={{ color: level.color, background: level.bg, padding: '0 6px' }}>
              {t('detoxFlow.diagnosis.titleHighlight')}
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <ToxicityGauge score={score} levelLabel={level.label} levelColor={level.color} />
        </FadeIn>

        <FadeIn delay={0.3}>
          <ComparativeBar userScore={score} averageScore={AVERAGE_TOXICITY} userColor={level.color} />
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 text-center">
              {t('detoxFlow.diagnosis.factorsHeading')}
            </p>
            <div className="flex flex-col gap-2">
              {factors.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
                  className="bg-white rounded-2xl p-4 border border-stone-200 flex items-start gap-3"
                >
                  <span className="text-2xl flex-shrink-0 leading-none">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-sm leading-snug">{f.label}</p>
                    <p className="text-xs text-stone-500 leading-snug mt-0.5">{f.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div
            className="rounded-2xl p-5 text-center border-2"
            style={{ background: level.bg, borderColor: level.color }}
          >
            <p className="font-extrabold text-base leading-snug" style={{ color: level.color }}>
              ⚠ {t('detoxFlow.diagnosis.urgentBanner')}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.7}>
          <div className="bg-white rounded-2xl p-5 border border-stone-200 flex flex-col gap-3">
            <p className="text-base font-extrabold text-stone-900 text-center">
              {t('detoxFlow.diagnosis.previewHeading')}
            </p>
            <ul className="flex flex-col gap-2.5">
              {t('detoxFlow.diagnosis.previewItems', { returnObjects: true }).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-stone-700">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        <FadeIn delay={0.8}>
          <motion.button
            onClick={handleProtocoloClick}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full py-5 font-extrabold text-white rounded-full flex items-center justify-center gap-2 text-base"
            style={{
              background: 'linear-gradient(135deg, #27AE60, #1E8449)',
              boxShadow: '0 4px 24px rgba(39,174,96,0.4)',
            }}
          >
            {t('detoxFlow.diagnosis.cta')}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </FadeIn>

        <FadeIn delay={0.9}>
          <p className="text-xs text-stone-400 text-center">
            {t('detoxFlow.diagnosis.reassurance')}
          </p>
        </FadeIn>
      </div>

      <LegalLine />
    </div>
  )
}
