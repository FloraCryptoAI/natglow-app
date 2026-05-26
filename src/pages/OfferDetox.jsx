import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Clock, Loader2, Check, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/AuthContext'
import { trackFunnelEvent, getFunnelSessionId } from '@/lib/trackFunnelEvent'
import { getAttribution } from '@/lib/tracking/attribution'
import { initFacebookPixel, trackFbEvent } from '@/lib/tracking/facebook-pixel'
import { initTikTokPixel, trackTtEvent } from '@/lib/tracking/tiktok-pixel'
import { PRICING_PLANS } from '@/config/pricing'
import LegalLine from '@/components/LegalLine'
import BeforeAfterTestimonialCarousel from '@/components/BeforeAfterTestimonialCarousel'
import StickyMobileCTA from '@/components/results/StickyMobileCTA'
import { calculateToxicityScore, getToxicityLevel } from '@/lib/toxicityCalculator'

const GREEN = '#27AE60'
const GREEN_DARK = '#1E8449'

const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-bold text-stone-800 text-sm pr-4 leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: GREEN_DARK }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: GREEN_DARK }} />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  )
}

export default function OfferDetox({ pricingPlan = 'detox' }) {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.detox
  const { plan_key, route_path, display_price, hotmart_checkout_url } = planConfig

  const TIMER_KEY = `glow_offer_timer_end_${plan_key}`
  if (!sessionStorage.getItem(TIMER_KEY)) {
    sessionStorage.setItem(TIMER_KEY, (Date.now() + 15 * 60 * 1000).toString())
  }

  const [loading, setLoading] = useState(false)
  const [error] = useState(null)
  const pricingRef = useRef(null)
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = sessionStorage.getItem(TIMER_KEY)
    if (stored) {
      const remaining = Math.floor((parseInt(stored) - Date.now()) / 1000)
      if (remaining > 0) return remaining
    }
    return 0
  })

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  useEffect(() => {
    trackFunnelEvent('offer_detox_viewed', null, plan_key)
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { content_name: 'offer_detox', content_category: plan_key })
      trackTtEvent('ViewContent', { content_name: 'offer_detox', content_id: plan_key, content_type: 'product' })
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

  const score = state?.score ?? calculateToxicityScore(answers)
  const level = getToxicityLevel(score)
  const name = answers.name?.trim()

  const handleCheckout = () => {
    setLoading(true)

    const fbEventId = crypto.randomUUID()
    const ttCompleteId = crypto.randomUUID()
    const attribution = getAttribution()

    sessionStorage.setItem('tt_complete_payment_id', ttCompleteId)
    sessionStorage.setItem('tt_complete_plan_key', plan_key)
    sessionStorage.setItem('tt_complete_value', String(display_price))

    trackFunnelEvent('cta_clicked', { fb_event_id: fbEventId, source: 'offer_detox' }, plan_key)
    trackFbEvent('InitiateCheckout', { value: display_price, currency: 'USD', content_name: plan_key }, fbEventId)
    trackTtEvent('InitiateCheckout', { value: display_price, currency: 'USD', content_name: plan_key, content_id: plan_key, content_type: 'product' }, fbEventId)

    let checkoutUrl = hotmart_checkout_url || '/'
    const params = new URLSearchParams()
    const funnelSessionId = getFunnelSessionId()
    if (funnelSessionId) params.set('src', funnelSessionId)
    if (attribution?.utm_source) params.set('utm_source', attribution.utm_source)
    if (attribution?.utm_medium) params.set('utm_medium', attribution.utm_medium)
    if (attribution?.utm_campaign) params.set('utm_campaign', attribution.utm_campaign)
    const qs = params.toString()
    if (qs) checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + qs

    window.location.href = checkoutUrl
  }

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const includesItems = t('detoxFlow.offer.includesItems', { returnObjects: true })
  const valueRows = t('detoxFlow.offer.valueComparison.rows', { returnObjects: true })
  const faqItems = t('detoxFlow.offer.faq.items', { returnObjects: true })
  const testimonials = t('resultsDetox.testimonials', { returnObjects: true })
  const verifiedBadge = t('resultsDetox.verifiedBadge')

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="bg-white sticky top-0 z-30" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
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

      {/* ── RECAP ── */}
      <section className="bg-white">
        <div className="max-w-xl mx-auto px-5 pt-8 pb-6 text-center">
          <FadeIn>
            <div
              className="inline-flex items-center gap-2 text-xs font-extrabold px-3 py-1.5 rounded-full mb-4"
              style={{ background: level.bg, color: level.color }}
            >
              ✓ Diagnóstico: {score}% toxicidad — Nivel {level.label}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight">
              {name ? `${name}, tu protocolo personalizado` : 'Tu protocolo personalizado'}
              {' '}
              <span style={{ color: GREEN_DARK, background: '#E8F8F0', padding: '0 6px' }}>está listo.</span>
            </h1>
            <p className="text-sm text-stone-500 mt-3">{t('detoxFlow.offer.recap')}</p>
          </FadeIn>
        </div>
      </section>

      {/* ── GUARANTEE BANNER ── */}
      <section className="bg-white pb-6">
        <div className="max-w-xl mx-auto px-5">
          <FadeIn>
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: '#E8F8F0', border: `2px solid ${GREEN}` }}
            >
              <Shield className="w-8 h-8 flex-shrink-0 mt-0.5" style={{ color: GREEN_DARK }} />
              <div>
                <p className="font-extrabold text-stone-900 text-base leading-tight mb-1">
                  {t('detoxFlow.offer.guaranteeBadge')}
                </p>
                <p className="text-xs text-stone-700 leading-snug">
                  {t('detoxFlow.offer.guaranteeText')}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section className="bg-white pb-8">
        <div className="max-w-xl mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-stone-900 mb-5 text-center leading-tight">
              {t('detoxFlow.offer.includesHeading')}
            </h2>
          </FadeIn>

          <div className="flex flex-col gap-3">
            {Array.isArray(includesItems) && includesItems.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className="bg-white rounded-2xl p-4 border border-stone-200 flex items-start gap-3 shadow-sm">
                  <span className="text-3xl flex-shrink-0 leading-none">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-stone-900 text-sm leading-snug">{item.title}</p>
                    <p className="text-xs text-stone-500 leading-snug mt-0.5">{item.desc}</p>
                  </div>
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GREEN_DARK }} />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRE-PRICING TESTIMONIAL ── */}
      <section className="bg-white pb-6">
        <div className="max-w-xl mx-auto px-5">
          <FadeIn>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 text-center mb-4">
              {t('detoxFlow.offer.socialProofHeading')}
            </p>
            {Array.isArray(testimonials) && testimonials.length > 0 && (
              <BeforeAfterTestimonialCarousel
                testimonials={testimonials.slice(0, 2)}
                verifiedBadgeTemplate={verifiedBadge}
              />
            )}
          </FadeIn>
        </div>
      </section>

      {/* ── VALUE COMPARISON ── */}
      <section className="bg-stone-100 py-8">
        <div className="max-w-xl mx-auto px-5">
          <FadeIn>
            <p className="text-sm font-extrabold text-stone-900 mb-4 text-center">
              {t('detoxFlow.offer.valueComparison.title')}
            </p>
            <div className="bg-white rounded-2xl overflow-hidden border border-stone-200">
              {Array.isArray(valueRows) && valueRows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 border-b border-stone-100 last:border-0"
                  style={row.highlight ? { background: '#E8F8F0' } : {}}
                >
                  <span className={`text-sm leading-snug ${row.highlight ? 'font-extrabold text-stone-900' : 'text-stone-600'}`}>
                    {row.label}
                  </span>
                  <span
                    className="text-sm font-extrabold tabular-nums flex-shrink-0 ml-3"
                    style={{ color: row.highlight ? GREEN_DARK : '#6b7280' }}
                  >
                    {row.price}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING CARD ── */}
      <section ref={pricingRef} className="bg-white py-10">
        <div className="max-w-xl mx-auto px-5">
          <FadeIn>
            <div
              className="rounded-2xl overflow-hidden bg-white"
              style={{ border: `2px solid ${GREEN}`, boxShadow: '0 12px 48px rgba(39,174,96,0.18)' }}
            >
              <div className="px-6 pt-6 pb-5">
                <div
                  className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-1.5 rounded-full mb-5"
                  style={{ background: '#E8F8F0', color: GREEN_DARK, border: '1px solid #A9DFBF' }}
                >
                  🌿 OFERTA ESPECIAL — Solo Hoy
                </div>

                {timeLeft > 0 && (
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-semibold"
                    style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: GREEN_DARK }} />
                    <span>Esta oferta expira en</span>
                    <span className="font-extrabold tabular-nums ml-auto" style={{ color: GREEN_DARK }}>{fmt(timeLeft)}</span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <p className="text-stone-400 line-through text-base">$97.00</p>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: '#FEF2F2', color: '#DC2626' }}
                    >
                      Ahorras $50
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: GREEN_DARK }}>$</span>
                    <span className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: GREEN_DARK }}>
                      {display_price}
                    </span>
                    <span className="text-stone-400 text-base ml-1">pago único</span>
                  </div>
                  <p className="text-sm font-bold mt-2 flex items-center gap-1.5" style={{ color: GREEN_DARK }}>
                    ♾️ Acceso VITALICIO — sin suscripción
                  </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', marginBottom: '20px' }} />

                <div className="flex items-center justify-center gap-2 mb-5 text-xs text-stone-600">
                  <Shield className="w-4 h-4 flex-shrink-0" style={{ color: GREEN_DARK }} />
                  Garantía total de 7 días · Devolución sin preguntas
                </div>

                {error && (
                  <p className="text-red-500 text-sm mb-3 bg-red-50 rounded-xl px-4 py-3 text-center">{error}</p>
                )}

                <motion.button
                  onClick={handleCheckout}
                  disabled={loading}
                  animate={loading ? {} : { scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full py-5 text-sm font-extrabold text-white flex items-center justify-center gap-2 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #27AE60, #1E8449)',
                    boxShadow: '0 4px 24px rgba(39,174,96,0.4)',
                    opacity: loading ? 0.75 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Espera...</>
                    : <span className="uppercase tracking-wide">¡ACTIVAR MI PROTOCOLO AHORA!</span>
                  }
                </motion.button>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-stone-400">
                  <Lock className="w-3.5 h-3.5" />
                  Pago seguro 256-bit · Hotmart
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── MORE TESTIMONIALS ── */}
      {Array.isArray(testimonials) && testimonials.length > 2 && (
        <section className="bg-stone-50 py-10">
          <div className="max-w-xl mx-auto px-5 flex flex-col gap-5">
            <FadeIn>
              <h2 className="text-2xl font-extrabold text-stone-900 text-center leading-tight">
                {t('detoxFlow.offer.moreTestimonialsHeading')}
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <BeforeAfterTestimonialCarousel
                testimonials={testimonials.slice(2)}
                verifiedBadgeTemplate={verifiedBadge}
              />
            </FadeIn>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="bg-white py-10">
        <div className="max-w-xl mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GREEN_DARK }}>
                {t('detoxFlow.offer.faq.tag')}
              </p>
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                {t('detoxFlow.offer.faq.title')}
              </h2>
            </div>
          </FadeIn>
          <div className="flex flex-col gap-3">
            {Array.isArray(faqItems) && faqItems.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <FaqItem q={item.q} a={item.a} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-stone-50 py-10">
        <div className="max-w-xl mx-auto px-5 flex flex-col gap-5 text-center">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
              ¿Lista para desintoxicar tu cabello?
            </h2>
            <p className="text-sm text-stone-500 mt-2">
              Cada día sin desintoxicar es un día más de acumulación tóxica.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <button
              onClick={scrollToPricing}
              className="w-full py-5 font-extrabold text-white rounded-full flex items-center justify-center gap-2 text-sm"
              style={{
                background: 'linear-gradient(135deg, #27AE60, #1E8449)',
                boxShadow: '0 4px 24px rgba(39,174,96,0.4)',
              }}
            >
              <span className="uppercase tracking-wide">QUIERO ACTIVAR MI PROTOCOLO</span>
            </button>
          </FadeIn>
        </div>
      </section>

      <div className="bg-stone-50 py-6 px-6 text-center">
        <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
          {t('resultsDetox.finePrint')}
        </p>
      </div>

      <LegalLine />

      <StickyMobileCTA
        price={display_price}
        label={t('detoxFlow.offer.stickyCTALabel')}
        onClick={scrollToPricing}
        loading={loading}
      />
    </div>
  )
}
