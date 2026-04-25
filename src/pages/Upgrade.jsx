import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Shield, ArrowRight, Loader2, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/api/supabaseClient'

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-stone-800 text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  )
}

export default function Upgrade() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
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

  const BENEFITS = t('upgrade.benefits', { returnObjects: true })
  const TESTIMONIALS = t('upgrade.testimonials', { returnObjects: true })
  const FAQ = t('upgrade.faq', { returnObjects: true })
  const BENEFIT_ICONS = ['📋', '📅', '🌿', '🔍', '📈', '📱']

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

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/Upgrade',
        },
      })
      if (fnError) throw fnError
      window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err)
      setError(`Error: ${err?.message ?? JSON.stringify(err)}`)
      setLoading(false)
    }
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: #FB45A9; color: #fff; border-radius: 9999px; font-weight: 700; transition: all .2s; }
        .btn-primary:hover:not(:disabled) { background: #E03594; box-shadow: 0 8px 24px rgba(251,69,169,.35); transform: scale(1.02); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

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

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6"
        >
          <p className="font-bold text-stone-800 mb-4">{t('upgrade.benefitsTitle')}</p>
          <ul className="space-y-3">
            {Array.isArray(BENEFITS) && BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-xl">{BENEFIT_ICONS[i] ?? '✓'}</span>
                <span className="text-stone-700 text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border-2 shadow-lg p-6 text-center"
          style={{ borderColor: '#FB45A9' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#E03594' }}>
            {t('upgrade.accessLabel')}
          </p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-extrabold text-stone-900">
              {import.meta.env.VITE_PLAN_PRICE ?? '$6.99'}
            </span>
            <span className="text-stone-400 text-sm">{t('upgrade.period')}</span>
          </div>
          <p className="text-xs text-stone-400 mb-6">{t('upgrade.cancelNote')}</p>

          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('upgrade.ctaLoading')}
              </>
            ) : (
              <>
                {t('upgrade.cta')}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-stone-400">
            <Shield className="w-3.5 h-3.5" />
            {t('upgrade.secure')}
          </div>
        </motion.div>

        {/* Guarantee */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-3xl leading-none">🛡️</div>
          <div>
            <p className="font-bold text-stone-800 mb-1">{t('upgrade.cancelTitle')}</p>
            <p className="text-sm text-stone-500">{t('upgrade.cancelText')}</p>
          </div>
        </div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          <p className="font-bold text-stone-800 text-center">{t('upgrade.testimonialsTitle')}</p>
          {Array.isArray(TESTIMONIALS) && TESTIMONIALS.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{item.result}</span>
              </div>
              <p className="text-stone-600 text-sm italic">"{item.text}"</p>
              <p className="text-stone-400 text-xs mt-1 font-medium">— {item.name}</p>
            </div>
          ))}
        </motion.div>

        {/* FAQ */}
        <div className="flex flex-col gap-3">
          <p className="font-bold text-stone-800 text-center">{t('upgrade.faqTitle')}</p>
          {Array.isArray(FAQ) && FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        {/* Bottom CTA repeat */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('upgrade.ctaLoading')}
            </>
          ) : (
            <>
              {t('upgrade.ctaBottom')}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-stone-400 pb-4">
          {t('upgrade.finePrint')}
        </p>
      </div>
    </div>
  )
}
