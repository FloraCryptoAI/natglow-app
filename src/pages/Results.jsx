import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowDown, Shield, Star, Loader2, ChevronDown, ChevronUp,
  Clock, Lock, Check, Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// ── design tokens ──────────────────────────────────────────────────────────
const P    = '#FB45A9';
const PD   = '#E03594';
const PL   = '#FFF5FA';
const PL2  = '#FFE4F2';
const GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)';
const ease = [0.22, 1, 0.36, 1];

const TESTIMONIALS = [
  { screenshot: '/images/testimonials/screenshot-1.jpg' },
  { screenshot: '/images/testimonials/screenshot-2.jpg' },
  { screenshot: '/images/testimonials/screenshot-3.jpg' },
];

// ── helpers ────────────────────────────────────────────────────────────────

function getDiagnosis(answers, t) {
  const signs = [];
  const causes = [];

  if (answers.chemProducts === 'yes_heavy') {
    signs.push(t('results.diagnosisItems.chemHeavy.sign'));
    causes.push(t('results.diagnosisItems.chemHeavy.cause'));
  }
  if (answers.chemProducts === 'yes_mild') {
    signs.push(t('results.diagnosisItems.chemMild.sign'));
    causes.push(t('results.diagnosisItems.chemMild.cause'));
  }
  if (answers.waterTemp === 'hot') {
    signs.push(t('results.diagnosisItems.waterHot.sign'));
    causes.push(t('results.diagnosisItems.waterHot.cause'));
  }
  if (answers.heatTools === 'daily' || answers.heatTools === 'few') {
    signs.push(t('results.diagnosisItems.heatTools.sign'));
    causes.push(t('results.diagnosisItems.heatTools.cause'));
  }
  if (answers.hydration === 'never' || answers.hydration === 'sometimes') {
    signs.push(t('results.diagnosisItems.noHydration.sign'));
    causes.push(t('results.diagnosisItems.noHydration.cause'));
  }
  if (answers.washFreq === 'daily') {
    signs.push(t('results.diagnosisItems.washDaily.sign'));
    causes.push(t('results.diagnosisItems.washDaily.cause'));
  }
  if (signs.length === 0) {
    signs.push(t('results.diagnosisItems.default.sign'));
    causes.push(t('results.diagnosisItems.default.cause'));
  }

  return { signs: signs.slice(0, 4), causes: causes.slice(0, 3) };
}

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// ── sub-components ─────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-56px' }}
      transition={{ duration: 0.65, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.07)', background: '#fff' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className="font-bold text-stone-800 text-sm pr-4 leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: P }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: P }} />}
      </button>
      {open && <p className="px-6 pb-5 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  );
}

function RecipeCard({ recipe, t }) {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: recipe.tagBg, color: recipe.tagColor }}
          >
            {recipe.tag}
          </span>
          <span className="text-2xl">{recipe.emoji}</span>
        </div>

        <h3 className="text-lg font-extrabold text-stone-900 mb-1 leading-snug">
          {recipe.title}
        </h3>
        <p className="text-xs text-stone-400 mb-4">{recipe.subtitle}</p>

        <ul className="space-y-2.5 mb-6">
          {recipe.benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-stone-700">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: PL2 }}
              >
                <Check className="w-3 h-3" style={{ color: PD }} />
              </div>
              {b}
            </li>
          ))}
        </ul>

        <div className="rounded-xl p-4" style={{ background: PL, border: `1px solid ${PL2}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5" style={{ color: P }} />
            <span className="text-xs font-bold" style={{ color: PD }}>{t('results.recipes.howToPrepare')}</span>
          </div>
          <div
            className="text-sm font-medium text-stone-500 mb-1"
            style={{ filter: 'blur(5px)', userSelect: 'none' }}
          >
            {t('results.recipes.secretIngredientA')}
          </div>
          <p className="text-xs text-stone-400">{t('results.recipes.revealedAfter')}</p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ onCheckout, loading, error, t }) {
  const benefits = t('results.pricing.benefits', { returnObjects: true });

  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = sessionStorage.getItem('glow_results_timer_end');
    if (stored) {
      const remaining = Math.floor((parseInt(stored) - Date.now()) / 1000);
      if (remaining > 0) return remaining;
    }
    return 0;
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: `1.5px solid ${PL2}`, boxShadow: '0 12px 48px rgba(251,69,169,0.18)' }}
    >
      <div className="px-7 pt-7 pb-5">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
          style={{ background: PL, color: PD, border: `1px solid ${PL2}` }}
        >
          {t('results.pricing.promoBadge')}
        </div>

        {timeLeft > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm font-semibold"
            style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', color: '#1c1c1c' }}
          >
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: P }} />
            <span>{t('results.pricing.offerExpires')}</span>
            <span className="font-extrabold tabular-nums ml-auto" style={{ color: PD }}>{fmt(timeLeft)}</span>
          </div>
        )}

        <div className="mb-7">
          <div className="flex items-center gap-2.5 mb-1">
            <p className="text-stone-400 line-through text-base">{t('results.pricing.originalPrice')}</p>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#FEF2F2', color: '#DC2626' }}
            >
              {t('results.pricing.savings')}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: P }}>$</span>
            <span className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: P }}>
              {t('results.pricing.price')}
            </span>
            <span className="text-stone-400 text-lg ml-1">{t('results.pricing.period')}</span>
          </div>
          <p className="text-sm text-stone-400 mt-2">{t('results.pricing.cancel')}</p>
        </div>

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '24px' }} />

        <ul className="space-y-3.5 mb-7">
          {Array.isArray(benefits) && benefits.map((text, i) => (
            <li key={i} className="flex items-center gap-3 text-base text-stone-700">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: PL2 }}
              >
                <Check className="w-3 h-3" style={{ color: PD }} />
              </div>
              {text}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-4 py-3 text-center">{error}</p>
        )}

        <motion.button
          onClick={onCheckout}
          disabled={loading}
          animate={loading ? {} : { scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full py-5 text-base font-extrabold text-white flex items-center justify-center gap-2.5 rounded-full"
          style={{
            background: GRAD,
            boxShadow: '0 4px 24px rgba(251,69,169,0.4)',
            opacity: loading ? 0.75 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('results.pricing.ctaLoading')}</>
            : (
              <span className="text-center leading-snug uppercase tracking-wide">
                {t('results.pricing.cta')}
              </span>
            )}
        </motion.button>

        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-stone-400">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          {t('results.pricing.secure')}
        </div>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function Results() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const pricingRef = useRef(null);

  const RECIPES_TEASE = [
    {
      emoji: '🌿',
      tag: t('results.recipes.recipe1.tag'),
      tagColor: '#16A34A',
      tagBg: '#F0FDF4',
      title: t('results.recipes.recipe1.title'),
      subtitle: t('results.recipes.recipe1.subtitle'),
      benefits: t('results.recipes.recipe1.benefits', { returnObjects: true }),
    },
    {
      emoji: '🌙',
      tag: t('results.recipes.recipe2.tag'),
      tagColor: '#7C3AED',
      tagBg: '#F5F3FF',
      title: t('results.recipes.recipe2.title'),
      subtitle: t('results.recipes.recipe2.subtitle'),
      benefits: t('results.recipes.recipe2.benefits', { returnObjects: true }),
    },
    {
      emoji: '✨',
      tag: t('results.recipes.recipe3.tag'),
      tagColor: '#B45309',
      tagBg: '#FFFBEB',
      title: t('results.recipes.recipe3.title'),
      subtitle: t('results.recipes.recipe3.subtitle'),
      benefits: t('results.recipes.recipe3.benefits', { returnObjects: true }),
    },
  ];

  const FAQ_ITEMS = t('results.faq.items', { returnObjects: true });
  const REASSURANCE = t('results.reassurance', { returnObjects: true });

  useEffect(() => {
    const stored = sessionStorage.getItem('glow_results_timer_end');
    if (!stored) {
      sessionStorage.setItem('glow_results_timer_end', (Date.now() + 15 * 60 * 1000).toString());
    }
  }, []);

  useEffect(() => {
    if (!state?.answers) navigate('/quiz', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial(i => (i + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true });
  }, [user, isSubscribed, navigate]);

  if (!state?.answers) return null;

  const { answers } = state;
  const { signs, causes } = getDiagnosis(answers, t);
  const name = answers.name?.trim();

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const invokeOptions = {
        body: {
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/Results',
        },
      };
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
        }
      }
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', invokeOptions);
      if (fnError) throw fnError;
      if (!data?.url) throw new Error('Checkout URL not returned');
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(t('results.pricing.errorCheckout'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NatGlow" className="w-11 h-11 rounded-2xl object-cover" />
            <span style={{ fontWeight: 400, color: '#535353', fontSize: '16px', letterSpacing: '-0.01em' }}>NatGlow</span>
          </div>
          <Link to="/Login" className="text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors">
            {t('results.header.alreadyHaveAccount')}
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-14 pb-6 overflow-hidden bg-white">
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-140px', right: '-140px',
            width: '560px', height: '560px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${PL2} 0%, transparent 70%)`,
            opacity: 0.8,
          }}
        />
        <div className="max-w-xl mx-auto px-6 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full mb-7"
            style={{ background: PL, color: PD, border: `1px solid ${PL2}` }}
          >
            {t('results.hero.badge')}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.07, ease }}
            className="text-4xl sm:text-5xl font-extrabold text-stone-900 leading-[1.1] tracking-tight mb-6"
          >
            {name
              ? <>{t('results.hero.titleWithName', { name })}{' '}<span style={{ color: P }}>{t('results.hero.titleHighlight')}</span></>
              : <>{t('results.hero.titleNoName')}{' '}<span style={{ color: P }}>{t('results.hero.titleHighlight')}</span></>}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.13, ease }}
            className="text-base text-stone-500 leading-relaxed mb-8"
          >
            {t('results.hero.subtitle')}
          </motion.p>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex justify-center"
          >
            <ArrowDown className="w-6 h-6" style={{ color: P }} />
          </motion.div>
        </div>
      </section>

      {/* ── DIAGNOSIS ── */}
      <section className="bg-white">
        <div className="max-w-xl mx-auto px-6 pt-12 pb-10 flex flex-col gap-4">
          <FadeIn>
            <div className="rounded-2xl p-6" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
              <p className="text-lg font-extrabold text-stone-800 mb-4 flex items-center gap-2">
                {t('results.diagnosis.signs')}
              </p>
              <ul className="space-y-3">
                {signs.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-stone-700 leading-snug">
                    <span className="text-red-400 font-extrabold mt-0.5 flex-shrink-0">✕</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <div className="rounded-2xl p-6" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-lg font-extrabold text-stone-800 mb-4 flex items-center gap-2">
                {t('results.diagnosis.causes')}
              </p>
              <ul className="space-y-3">
                {causes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-stone-700 leading-snug">
                    <span className="text-amber-500 font-extrabold mt-0.5 flex-shrink-0">→</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.12}>
            <div className="rounded-2xl p-6" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <p className="text-lg font-extrabold text-emerald-800 mb-2 flex items-center gap-2">
                {t('results.diagnosis.goodNews')}
              </p>
              <p className="text-base text-stone-600 leading-relaxed">
                {t('results.diagnosis.goodNewsText')}
              </p>
            </div>
          </FadeIn>

          <div className="flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowDown className="w-6 h-6" style={{ color: P }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── RECIPE TEASE ── */}
      <section style={{ background: PL }}>
        <div className="max-w-xl mx-auto px-6 py-14">
          <FadeIn>
            <div className="text-center mb-10">
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                style={{ background: PL2, color: PD }}
              >
                <Sparkles className="w-3.5 h-3.5" /> {t('results.recipes.badge')}
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-3">
                <span className="text-stone-900">{t('results.recipes.title1')}</span>
                <span style={{ color: P }}>{t('results.recipes.title2')}</span>
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                {t('results.recipes.subtitle')}
              </p>
            </div>
          </FadeIn>

          <div className="flex flex-col gap-5">
            {RECIPES_TEASE.map((recipe, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <RecipeCard recipe={recipe} t={t} />
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <button
              onClick={scrollToPricing}
              className="mt-6 w-full rounded-2xl p-5 flex items-center justify-between"
              style={{ background: PL2, border: `1px solid ${P}30` }}
            >
              <p className="font-bold text-sm" style={{ color: PD }}>
                {t('results.recipes.unlock')}
              </p>
              <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: PD }} />
            </button>
          </FadeIn>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{ background: '#F8F8F8' }}>
        <div className="max-w-xl mx-auto px-6 py-14">
          <FadeIn>
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-2">
                {t('results.social.title1')}<span style={{ color: P }}>{t('results.social.title2')}</span>
              </h2>
              <p className="text-stone-400 text-sm">{t('results.social.stars')}</p>
            </div>
          </FadeIn>

          <FadeIn>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
              >
                <span className="text-xs font-semibold text-stone-400">{t('results.social.verifiedPost')}</span>
              </div>
              <div className="relative overflow-hidden bg-white">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentTestimonial}
                    src={TESTIMONIALS[currentTestimonial].screenshot}
                    alt={`Testimonial ${currentTestimonial + 1}`}
                    className="w-full block"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35 }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </AnimatePresence>
              </div>
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)' }}
              >
                <div className="flex gap-2">
                  {TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTestimonial(i)}
                      className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{ background: i === currentTestimonial ? P : '#e7e5e4' }}
                    />
                  ))}
                </div>
                <span className="text-xs text-stone-400 tabular-nums">
                  {currentTestimonial + 1}/{TESTIMONIALS.length}
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section ref={pricingRef} style={{ background: PL }}>
        <div className="max-w-xl mx-auto px-6 py-14 flex flex-col gap-6">
          <FadeIn>
            <div className="text-center mb-4">
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full mb-5"
                style={{ background: PL, color: PD, border: `1px solid ${PL2}` }}
              >
                {t('results.pricing.badge')}
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-3">
                {t('results.pricing.title')}{' '}<span style={{ color: P }}>{t('results.pricing.titleHighlight')}</span>
              </h2>
              <p className="text-stone-500 text-sm">
                {t('results.pricing.subtitle')}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <PricingCard onCheckout={handleCheckout} loading={loading} error={error} t={t} />
          </FadeIn>

          <FadeIn delay={0.1}>
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <span className="text-3xl leading-none flex-shrink-0">🛡️</span>
              <div>
                <p className="font-bold text-stone-800 mb-1">{t('results.pricing.cancelTitle')}</p>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {t('results.pricing.cancelText')}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── REASSURANCE ── */}
      <section style={{ background: PL }}>
        <div className="max-w-xl mx-auto px-6 py-12">
          <FadeIn>
            <div className="grid grid-cols-3 gap-3">
              {Array.isArray(REASSURANCE) && REASSURANCE.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: '#fff', border: `1px solid ${PL2}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-xs font-bold leading-snug" style={{ color: PD }}>{item.text}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white">
        <div className="max-w-xl mx-auto px-6 py-14">
          <FadeIn>
            <div className="text-center mb-8">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: P }}>
                {t('results.faq.tag')}
              </p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-stone-900 leading-[1.1] tracking-tight">
                {t('results.faq.title')}
              </h2>
            </div>
          </FadeIn>
          <div className="flex flex-col gap-3">
            {Array.isArray(FAQ_ITEMS) && FAQ_ITEMS.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <FaqItem q={item.q} a={item.a} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINE PRINT ── */}
      <div className="bg-stone-50 py-6 px-6 text-center">
        <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
          {t('results.finePrint')}
        </p>
      </div>
    </div>
  );
}
