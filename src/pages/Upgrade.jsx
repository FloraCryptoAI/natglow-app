import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Shield, ArrowRight, Clock, Star, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import LegalLine from '@/components/LegalLine'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { PRICING_PLANS } from '@/config/pricing'

const P    = '#FB45A9'
const PD   = '#E03594'
const GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'

// Single plan now — both /quiz-bold and /quiz-detox share the same $17 product.
// Standard/Premium tiers were retired when the standard funnels were removed.
const PLANS = [
  {
    key: 'bold',
    name: 'NatGlow Protocolo',
    price: 17,
    highlight: true,
    badge: '🔥 Acceso completo',
    features: [
      'Protocolo de 21 días personalizado',
      '3 recetas naturales exclusivas',
      'Progresiva casera sin químicos',
      'Plan progresivo de 4 fases',
      'Biblioteca con 25 recetas',
      'App instalable en tu smartphone (PWA)',
      'Acceso VITALICIO sin suscripción',
    ],
  },
]

export default function Upgrade() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = sessionStorage.getItem('glow_upgrade_timer_end')
    if (stored) {
      const remaining = Math.floor((parseInt(stored) - Date.now()) / 1000)
      if (remaining > 0) return remaining
    }
    const end = Date.now() + 15 * 60 * 1000
    sessionStorage.setItem('glow_upgrade_timer_end', end.toString())
    return 15 * 60
  })

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const handleBuy = (planKey) => {
    const plan = PRICING_PLANS[planKey]
    if (!plan?.hotmart_checkout_url) return
    window.location.href = plan.hotmart_checkout_url
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </div>
          <Link to="/Landing" className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium">
            {t('upgrade.header.redo')}
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Urgency timer */}
        {timeLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
          >
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-semibold">
              {t('upgrade.timer')} <span className="font-extrabold text-amber-900">{formatTime(timeLeft)}</span>
            </p>
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-pink-200">
            <Sparkles className="w-3.5 h-3.5" /> {t('upgrade.badge')}
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 leading-tight mb-3">
            {firstName ? t('upgrade.titleWithName', { name: firstName }) : t('upgrade.titleNoName')}
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            {t('upgrade.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-1 mt-3">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            <span className="text-xs text-stone-500 ml-1">{t('upgrade.rating')}</span>
          </div>
        </motion.div>

        {/* Plan cards */}
        {PLANS.map((plan, idx) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.07 }}
            className={`bg-white rounded-2xl p-6 flex flex-col gap-4 ${plan.highlight ? 'shadow-lg' : 'border border-stone-100 shadow-sm'}`}
            style={plan.highlight ? { border: `2px solid ${P}`, boxShadow: `0 8px 32px rgba(251,69,169,.18)` } : {}}
          >
            {plan.badge && (
              <div
                className="self-start text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#FFF0F8', color: PD, border: `1px solid ${P}40` }}
              >
                {plan.badge}
              </div>
            )}

            <div className="flex items-end justify-between">
              <div>
                <p className="font-extrabold text-stone-900 text-lg">{plan.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">pago único · acceso de por vida</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold" style={{ color: P }}>${plan.price}</span>
                <span className="text-stone-400 text-sm ml-1">USD</span>
              </div>
            </div>

            <ul className="space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-stone-700">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: plan.highlight ? P : '#e7e5e4' }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleBuy(plan.key)}
              className="w-full py-4 text-sm font-extrabold text-white flex items-center justify-center gap-2 rounded-full"
              style={{ background: plan.highlight ? GRAD : '#374151', boxShadow: plan.highlight ? '0 4px 20px rgba(251,69,169,.35)' : 'none' }}
            >
              {t('upgrade.cta')} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}

        {/* Guarantee */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-3xl leading-none">🛡️</div>
          <div>
            <p className="font-bold text-stone-800 mb-1">{t('upgrade.cancelTitle')}</p>
            <p className="text-sm text-stone-500">{t('upgrade.cancelText')}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <Shield className="w-3.5 h-3.5" />
          {t('upgrade.secure')}
        </div>

        <p className="text-center text-xs text-stone-400 pb-4">
          {t('upgrade.finePrint')}
        </p>
      </div>
      <LegalLine />
    </div>
  )
}
