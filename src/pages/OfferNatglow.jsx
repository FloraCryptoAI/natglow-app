import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Check, ChevronDown, ChevronUp, Lock, Leaf, Sparkles, SlidersHorizontal, CalendarDays, AlertTriangle, CheckCircle } from 'lucide-react'
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

// Dedicated sessionStorage namespace shared across the /quiz-natglow funnel.
const STORE = 'natglow'

const PINK = '#FB45A9'
const PINK_DARK = '#E03594'
const PINK_BG = '#FFE4F2'
// Pink brand hero gradient — mirrors the app's "Mi Rutina" (HairDashboard) header.
const BRAND_GRAD = 'linear-gradient(135deg, #FB45A9, #FFB3DD)'
// Pink brand gradient for CTAs / accents (matches the app's buttons).
const PINK_GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)'
const PINK_SHADOW = 'rgba(251,69,169,0.4)'

const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

// 2x2 personalization cards — "Mi Rutina" (HairDashboard) identity: white card,
// soft border, a small tinted chip holding a brand-toned line icon.
const CARD_TILES = [
  { icon: Leaf, color: '#1E8449', chip: '#E8F8F0' },            // green
  { icon: Sparkles, color: '#E03594', chip: '#FFE4F2' },        // brand pink
  { icon: SlidersHorizontal, color: '#D97706', chip: '#FEF3C7' }, // amber
  { icon: CalendarDays, color: '#E03594', chip: '#FFE4F2' },    // brand pink
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-100 bg-white">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="font-bold text-stone-800 text-sm pr-4 leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: PINK_DARK }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: PINK_DARK }} />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  )
}

function PrimaryCTA({ label, loading, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      animate={loading ? {} : { scale: [1, 1.03, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className="w-full text-sm font-extrabold text-white flex items-center justify-center gap-2 rounded-full"
      style={{
        background: PINK_GRAD,
        boxShadow: `0 6px 24px ${PINK_SHADOW}`,
        opacity: loading ? 0.75 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        paddingTop: '1.05rem',
        paddingBottom: '1.05rem',
      }}
    >
      {loading
        ? <><Loader2 className="w-5 h-5 animate-spin" /> Espera...</>
        : <span className="uppercase tracking-wide">{label}</span>}
    </motion.button>
  )
}

export default function OfferNatglow({ pricingPlan = 'natglow' }) {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, isSubscribed } = useAuth()
  const planConfig = PRICING_PLANS[pricingPlan] ?? PRICING_PLANS.natglow
  const { plan_key, route_path, display_price, hotmart_checkout_url } = planConfig

  const [loading, setLoading] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const testimonialsRef = useRef(null)

  // Fires the Meta Lead here (page: quiz_offer) — this funnel has no separate
  // results page, so the offer view is the conversion signal for the funnel.
  // leadFiredRef guards a re-render/StrictMode double fire.
  const leadFiredRef = useRef(false)
  useEffect(() => {
    trackFunnelEvent('offer_natglow_viewed', null, plan_key)
    Promise.all([initFacebookPixel(), initTikTokPixel()]).then(() => {
      trackFbEvent('ViewContent', { funnel: 'quiz_natglow', page: 'quiz_offer' })
      if (!leadFiredRef.current) {
        leadFiredRef.current = true
        trackFbEvent('Lead', { funnel: 'quiz_natglow', page: 'quiz_offer' })
      }
      trackTtEvent('ViewContent', { content_name: 'offer_natglow', content_id: plan_key, content_type: 'product' })
    })
  }, [plan_key])

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true })
  }, [user, isSubscribed, navigate])

  // Sticky CTA stays hidden until the testimonials scroll into view, then it
  // shows and stays fixed (observer disconnects after the first intersection).
  useEffect(() => {
    const el = testimonialsRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShowSticky(true); obs.disconnect() } },
      { rootMargin: '0px 0px -25% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const storedAnswers = (() => {
    try { return JSON.parse(sessionStorage.getItem(`glow_results_answers_${STORE}`) ?? '') } catch { return null }
  })()
  const answers = state?.answers ?? storedAnswers
  if (!answers) return <Navigate to={route_path} replace />

  const name = answers.name?.trim()

  // All CTAs route here. Fires tracking once per session; Hotmart owns
  // InitiateCheckout (partner pixel) and Purchase — only TikTok fires here.
  const ctaFiredRef = useRef(false)
  const handleCheckout = (source = 'offer_natglow') => {
    setLoading(true)
    const attribution = getAttribution()

    if (!ctaFiredRef.current) {
      ctaFiredRef.current = true
      const fbEventId = crypto.randomUUID()
      const ttCompleteId = crypto.randomUUID()
      sessionStorage.setItem('tt_complete_payment_id', ttCompleteId)
      sessionStorage.setItem('tt_complete_plan_key', plan_key)
      sessionStorage.setItem('tt_complete_value', String(display_price))
      trackFunnelEvent('cta_clicked', { fb_event_id: fbEventId, source }, plan_key)
      trackTtEvent('InitiateCheckout', { value: display_price, currency: 'USD', content_name: plan_key, content_id: plan_key, content_type: 'product' }, fbEventId)
    }

    let checkoutUrl = hotmart_checkout_url || '/'
    const params = new URLSearchParams()
    const funnelSessionId = getFunnelSessionId()
    if (funnelSessionId) params.set('src', funnelSessionId)
    if (attribution?.utm_source) params.set('utm_source', attribution.utm_source)
    if (attribution?.utm_medium) params.set('utm_medium', attribution.utm_medium)
    if (attribution?.utm_campaign) params.set('utm_campaign', attribution.utm_campaign)
    const qs = params.toString()
    if (qs) checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + qs

    setTimeout(() => { window.location.href = checkoutUrl }, 600)
  }

  const personalCards = t('natglowFlow.offer.personalCards', { returnObjects: true })
  const includes = t('natglowFlow.offer.card.includes', { returnObjects: true })
  const compareSin = t('natglowFlow.offer.compare.sin', { returnObjects: true })
  const compareCon = t('natglowFlow.offer.compare.con', { returnObjects: true })
  const faqItems = t('natglowFlow.offer.faq.items', { returnObjects: true })
  const testimonials = t('natglowFlow.testimonials', { returnObjects: true })
  const verifiedBadge = t('natglowFlow.verifiedBadge')

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══ SECTION 1 · HERO (brand pink gradient — "Mi Rutina" identity) ═══ */}
      <section className="bg-stone-50 pt-7 pb-4">
        <div className="max-w-md mx-auto px-5">
          {/* tag ABOVE the pink box */}
          <FadeIn>
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-full" style={{ background: PINK_BG, color: PINK_DARK }}>
                {t('natglowFlow.offer.hero.tag')}
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="rounded-3xl p-6 text-center text-white" style={{ background: BRAND_GRAD }}>
              <h1 className="text-2xl font-extrabold leading-tight">
                {name
                  ? t('natglowFlow.offer.hero.titlePreName', { name })
                  : t('natglowFlow.offer.hero.titlePreNoName')}
                {' '}
                {t('natglowFlow.offer.hero.titleHighlight')}
                {' '}
                {t('natglowFlow.offer.hero.titlePost')}
              </h1>
              <p className="text-white/90 text-sm mt-3 leading-relaxed">{t('natglowFlow.offer.hero.subtitle')}</p>

              {/* phase tiles (mirrors "Mi Rutina" header) */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-white/15 rounded-xl p-3 flex flex-col justify-center">
                  <p className="text-white/80 text-[11px] leading-tight">{t('natglowFlow.offer.hero.phaseLabel')}</p>
                  <p className="font-semibold text-xs mt-1 leading-snug">{t('natglowFlow.offer.hero.phaseValue')}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-3 flex flex-col justify-center">
                  <p className="text-white/80 text-[11px] leading-tight">{t('natglowFlow.offer.hero.durationLabel')}</p>
                  <p className="font-semibold text-sm mt-1 leading-snug">{t('natglowFlow.offer.hero.durationValue')}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 2 · 2x2 PERSONALIZATION CARDS ("Mi Rutina" tiles) ═══ */}
      <section className="bg-stone-50">
        <div className="max-w-md mx-auto px-5 pb-8">
          <div className="grid grid-cols-2 gap-3">
            {Array.isArray(personalCards) && personalCards.map((c, i) => {
              const tile = CARD_TILES[i % CARD_TILES.length]
              const Icon = tile.icon
              return (
                <FadeIn key={i} delay={i * 0.06}>
                  <div className="h-full bg-white rounded-2xl p-4 border border-stone-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: tile.chip }}>
                      <Icon className="w-5 h-5" strokeWidth={2.2} style={{ color: tile.color }} />
                    </div>
                    <p className="font-bold text-stone-800 text-sm leading-snug">{c.title}</p>
                    <p className="text-xs text-stone-400 mt-1 leading-snug">{c.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 · OFFER CARD (Mi Rutina identity) ═══ */}
      <section className="bg-stone-50 pb-10 pt-1">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="rounded-3xl overflow-hidden bg-white border border-stone-100" style={{ boxShadow: '0 14px 44px rgba(0,0,0,0.07)' }}>

              {/* pink header (mirrors the "Mi Rutina" gradient) with app mockup.
                  Image bottom sits flush on the pink→white boundary (no pb). */}
              <div className="pt-6 text-center" style={{ background: BRAND_GRAD }}>
                <p className="text-white font-bold text-xl uppercase tracking-wide leading-tight mb-5 max-w-[18rem] mx-auto">
                  {t('natglowFlow.offer.card.appLabel')}
                </p>
                <div className="flex justify-center">
                  <img
                    src="/images/quiz-natglow/app-mockup.webp"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block max-w-none"
                    style={{ width: '120%' }}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              </div>

              {/* body */}
              <div className="px-6 pt-6 pb-7">
                <h2 className="text-xl font-extrabold text-stone-900 text-center leading-tight">
                  {t('natglowFlow.offer.card.title')}
                </h2>
                <p className="text-sm text-stone-500 text-center mt-2 leading-snug">
                  {t('natglowFlow.offer.card.subtitle')}
                </p>

                {/* price tile */}
                <div className="rounded-2xl mt-5 px-5 py-9 text-center" style={{ background: '#FFF5FA', border: '1px solid #FFE4F2' }}>
                  <div className="flex items-end justify-center gap-3">
                    <div className="flex items-end gap-1">
                      <span className="text-base font-bold text-stone-400 mb-2">{t('natglowFlow.offer.card.priceCurrency')}</span>
                      <span className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: PINK_DARK }}>
                        {t('natglowFlow.offer.card.priceValue')}
                      </span>
                    </div>
                    <div className="flex flex-col items-start gap-1 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: PINK }}>
                        {t('natglowFlow.offer.card.offerTag')}
                      </span>
                      <span className="text-sm text-stone-400 line-through decoration-stone-300">
                        {t('natglowFlow.offer.card.priceAnchor')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* includes */}
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3.5">
                    {t('natglowFlow.offer.card.includesTitle')}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {Array.isArray(includes) && includes.map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PINK_BG }}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: PINK_DARK }} />
                        </span>
                        <span className="text-sm text-stone-700 leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="mt-7">
                  <PrimaryCTA label={t('natglowFlow.offer.card.cta')} loading={loading} onClick={() => handleCheckout('offer_card')} />
                  <div className="flex items-center justify-center gap-1.5 mt-3.5 text-xs text-stone-500">
                    <Lock className="w-3.5 h-3.5" /> {t('natglowFlow.offer.card.ctaSub1')}
                  </div>
                  <p className="text-[11px] text-stone-400 text-center leading-snug mt-1.5">
                    {t('natglowFlow.offer.card.ctaSub2')}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 4 · GUARANTEE (below the offer card, quiz-meta copy) ═══ */}
      <section className="bg-stone-50 pb-8">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-center gap-4">
              <span className="text-3xl flex-shrink-0 leading-none">🛡️</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-stone-900 text-base leading-snug">{t('natglowFlow.offer.guarantee.title')}</p>
                <p className="text-sm text-stone-500 leading-snug mt-0.5">{t('natglowFlow.offer.guarantee.text')}</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 5 · TESTIMONIALS ═══ */}
      <section ref={testimonialsRef} className="bg-stone-50 py-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-5">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                {t('natglowFlow.offer.testimonials.title')}
              </h2>
              <p className="text-xs text-stone-500 mt-2 leading-snug">
                {t('natglowFlow.offer.testimonials.subtitle')}
              </p>
            </div>
            {Array.isArray(testimonials) && testimonials.length > 0 && (
              <BeforeAfterTestimonialCarousel
                testimonials={testimonials}
                verifiedBadgeTemplate={verifiedBadge}
                beforeLabel={t('natglowFlow.offer.testimonials.beforeLabel')}
                afterLabel={t('natglowFlow.offer.testimonials.afterLabel')}
                cardBorder="border-stone-100"
              />
            )}
            <p className="text-[11px] text-stone-400 text-center italic mt-4">
              {t('natglowFlow.offer.testimonials.disclaimer')}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 6 · COMPARISON (Mi Rutina card style) ═══ */}
      <section className="bg-stone-50 py-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl font-extrabold text-stone-900 text-center leading-tight">
              {t('natglowFlow.offer.compare.titlePre')}{' '}
              <span style={{ color: PINK_DARK }}>{t('natglowFlow.offer.compare.titleVs')}</span>{' '}
              {t('natglowFlow.offer.compare.titlePost')}
            </h2>
            <p className="text-sm text-stone-500 text-center mt-2 mb-6 leading-snug">
              {t('natglowFlow.offer.compare.subtitle')}
            </p>
          </FadeIn>

          <div className="flex flex-col gap-4">
            {/* Sin una rutina guiada */}
            <FadeIn>
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <h3 className="font-bold text-stone-800">{t('natglowFlow.offer.compare.sinTitle')}</h3>
                </div>
                <ul className="space-y-3">
                  {Array.isArray(compareSin) && compareSin.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            {/* Con NatGlow */}
            <FadeIn delay={0.1}>
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-3.5">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <h3 className="font-bold text-stone-800">{t('natglowFlow.offer.compare.conTitle')}</h3>
                </div>
                <ul className="space-y-3">
                  {Array.isArray(compareCon) && compareCon.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700 font-medium leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7 · FAQ ═══ */}
      <section className="bg-stone-50 py-10">
        <div className="max-w-md mx-auto px-5">
          <FadeIn>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                {t('natglowFlow.offer.faq.title')}
              </h2>
              <p className="text-sm text-stone-500 mt-2">{t('natglowFlow.offer.faq.subtitle')}</p>
            </div>
          </FadeIn>
          <div className="flex flex-col gap-3">
            {Array.isArray(faqItems) && faqItems.map((item, i) => (
              <FadeIn key={i} delay={i * 0.04}>
                <FaqItem q={item.q} a={item.a} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <LegalLine />

      {showSticky && (
        <StickyMobileCTA
          label={t('natglowFlow.offer.stickyLabel')}
          onClick={() => handleCheckout('offer_sticky')}
          loading={loading}
          gradient={PINK_GRAD}
          shadow={PINK_SHADOW}
          pulse
        />
      )}
    </div>
  )
}
