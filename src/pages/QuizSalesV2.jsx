import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowDown, Shield, Star, Loader2, ChevronDown, ChevronUp,
  Clock, Lock, Check, Sparkles,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const P    = '#FB45A9';
const PD   = '#E03594';
const PL   = '#FFF5FA';
const PL2  = '#FFE4F2';
const GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)';
const ease = [0.22, 1, 0.36, 1];

const BENEFITS = [
  { icon: '🌿', text: 'As 3 receitas campeãs com resultado já na primeira aplicação' },
  { icon: '📋', text: 'Rotina capilar personalizada de 21 dias' },
  { icon: '📅', text: 'Plano progressivo de 4 fases com 84 dias de tratamento completo' },
  { icon: '🍯', text: 'Biblioteca completa com 25 receitas naturais caseiras' },
  { icon: '📈', text: 'Acompanhamento de progresso e conquistas' },
  { icon: '📱', text: 'Acesso em qualquer dispositivo, a qualquer hora' },
];

const RECIPES_TEASE = [
  {
    emoji: '🌿',
    tag: 'Resultado na 1ª aplicação',
    tagColor: '#16A34A',
    tagBg: '#F0FDF4',
    title: 'A receita da maciez instantânea',
    subtitle: 'O que você vai sentir logo na primeira aplicação:',
    benefits: [
      'Frizz eliminado em menos de 20 minutos',
      'Brilho intenso visível na hora',
      'Maciez profunda que dura dias inteiros',
      'Cutículas fechadas e cabelo liso',
    ],
  },
  {
    emoji: '🌙',
    tag: 'Age enquanto você dorme',
    tagColor: '#7C3AED',
    tagBg: '#F5F3FF',
    title: 'A receita do cabelo forte',
    subtitle: 'O que acontece enquanto você dorme:',
    benefits: [
      'Nutrição profunda agindo a noite toda',
      'Fortalece cada fio do interior para fora',
      'Reduz a quebra de forma visível',
      'Acorde com cabelo sedoso e com vida',
    ],
  },
  {
    emoji: '✨',
    tag: 'Efeito dura até 5 dias',
    tagColor: '#B45309',
    tagBg: '#FFFBEB',
    title: 'A receita antifrizz definitiva',
    subtitle: 'Por que essa receita é diferente de tudo:',
    benefits: [
      'Controla o frizz por até 5 dias seguidos',
      'Funciona em qualquer clima, até em dia de chuva',
      'Brilho intenso e selamento duradouro',
      'Leveza e maciez ao mesmo tempo',
    ],
  },
];

const TESTIMONIALS = [
  { screenshot: '/images/testimonials/screenshot-1.jpg' },
  { screenshot: '/images/testimonials/screenshot-2.jpg' },
  { screenshot: '/images/testimonials/screenshot-3.jpg' },
];

const FAQ_ITEMS = [
  {
    q: 'E se eu não gostar?',
    a: 'Cancele quando quiser, direto pelo portal do cliente. Sem perguntas, sem burocracia, sem taxas. Você tem total controle da sua assinatura. Um clique e está feito.',
  },
  {
    q: 'Os ingredientes das receitas são caros?',
    a: 'Não! As receitas usam ingredientes simples como mel, babosa, óleo de coco e outros que você provavelmente já tem em casa agora mesmo. O custo médio de cada receita é menos de R$2,00.',
  },
  {
    q: 'Quanto tempo até ver resultado?',
    a: 'Muitas pessoas notam diferença já na primeira aplicação das receitas. Para resultados de transformação completa, a maioria vê em 2 a 3 semanas seguindo a rotina.',
  },
  {
    q: 'Funciona para qualquer tipo de cabelo?',
    a: 'Sim! Seu plano foi montado com base nas respostas do seu diagnóstico, então as receitas e a rotina são específicas para o seu tipo de fio e o seu problema principal.',
  },
];

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

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

function RecipeCard({ recipe, onUnlock }) {
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
            <span className="text-xs font-bold" style={{ color: PD }}>Como preparar</span>
          </div>
          <div
            className="text-sm font-medium text-stone-500 mb-1"
            style={{ filter: 'blur(5px)', userSelect: 'none' }}
          >
            Ingrediente secreto A + Ingrediente secreto B
          </div>
          <p className="text-xs text-stone-400">Receita revelada após a assinatura</p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ onCheckout, loading, error }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = sessionStorage.getItem('glow_quizv2_sales_timer_end');
    if (stored) {
      const remaining = Math.floor((parseInt(stored) - Date.now()) / 1000);
      if (remaining > 0) return remaining;
    }
    return 0;
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
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
          🔥 Promoção Especial de Lançamento
        </div>

        {timeLeft > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm font-semibold"
            style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', color: '#1c1c1c' }}
          >
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: P }} />
            <span>Esta oferta expira em</span>
            <span className="font-extrabold tabular-nums ml-auto" style={{ color: PD }}>{fmt(timeLeft)}</span>
          </div>
        )}

        <div className="mb-7">
          <div className="flex items-center gap-2.5 mb-1">
            <p className="text-stone-400 line-through text-base">$47.99/mês</p>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#FEF2F2', color: '#DC2626' }}
            >
              Você economiza $41/mês
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: P }}>$</span>
            <span className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: P }}>6.99</span>
            <span className="text-stone-400 text-lg ml-1">/mês</span>
          </div>
          <p className="text-sm text-stone-400 mt-2">Cancele quando quiser. Sem fidelidade.</p>
        </div>

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '24px' }} />

        <ul className="space-y-3.5 mb-7">
          {BENEFITS.map((b, i) => (
            <li key={i} className="flex items-center gap-3 text-base text-stone-700">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: PL2 }}
              >
                <Check className="w-3 h-3" style={{ color: PD }} />
              </div>
              {b.text}
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
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Aguarde...</>
            : (
              <span className="text-center leading-snug uppercase tracking-wide">
                <span>Quero meu plano</span>
                <br className="sm:hidden" />
                <span> personalizado agora</span>
              </span>
            )}
        </motion.button>

        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-stone-400">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          Pagamento seguro via Stripe. Cancele quando quiser. Sem taxas ocultas.
        </div>
      </div>
    </div>
  );
}

export default function QuizSalesV2() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTestimonial(i => (i + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Salva answers em sessionStorage para recuperar após cancel do Stripe
  const answers = state?.answers ?? (() => {
    try {
      const backup = sessionStorage.getItem('glow_quizv2_sales_backup');
      return backup ? JSON.parse(backup) : null;
    } catch { return null; }
  })();

  useEffect(() => {
    if (!answers) { navigate('/quiz', { replace: true }); return; }
    sessionStorage.setItem('glow_quizv2_sales_backup', JSON.stringify(answers));
    const stored = sessionStorage.getItem('glow_quizv2_sales_timer_end');
    if (!stored) {
      sessionStorage.setItem('glow_quizv2_sales_timer_end', (Date.now() + 15 * 60 * 1000).toString());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true });
  }, [user, isSubscribed, navigate]);

  if (!answers) return null;

  const name = answers.name?.trim();

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const invokeOptions = {
        body: {
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/quiz-sales',
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
      if (!data?.url) throw new Error('URL de checkout não retornada');
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Erro ao iniciar pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

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
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
            className="text-4xl sm:text-5xl font-extrabold text-stone-900 leading-[1.1] tracking-tight mb-5"
          >
            {name
              ? <>{name}, seu cabelo merece uma rotina que <span style={{ color: P }}>realmente funciona.</span></>
              : <>Seu cabelo merece uma rotina que <span style={{ color: P }}>realmente funciona.</span></>}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease }}
            className="text-base text-stone-500 leading-relaxed mb-8"
          >
            Conheça as 3 receitas secretas que transformaram o cabelo de milhares de mulheres e um plano personalizado exclusivamente para o seu tipo de cabelo e necessidades, para você chegar ao ponto máximo da sua beleza natural.
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

      {/* ── PRICING ── */}
      <section style={{ background: PL }}>
        <div className="max-w-xl mx-auto px-6 py-14 flex flex-col gap-6">
          <FadeIn>
            <div className="text-center mb-4">
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full mb-5"
                style={{ background: PL, color: PD, border: `1px solid ${PL2}` }}
              >
                🌸 Oferta exclusiva
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-3">
                Seu plano personalizado <span style={{ color: P }}>começa hoje</span>
              </h2>
              <p className="text-stone-500 text-sm">
                Acesse agora e comece a transformação ainda esta semana.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <PricingCard onCheckout={handleCheckout} loading={loading} error={error} />
          </FadeIn>

          <FadeIn delay={0.1}>
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <span className="text-3xl leading-none flex-shrink-0">🛡️</span>
              <div>
                <p className="font-bold text-stone-800 mb-1">Cancele quando quiser</p>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Sem perguntas, sem burocracia. Você tem total controle da sua assinatura a qualquer momento, pelo portal do cliente, em segundos. Nenhuma taxa de cancelamento.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── RECIPE TEASE ── */}
      <section style={{ background: '#fff' }}>
        <div className="max-w-xl mx-auto px-6 py-14">
          <FadeIn>
            <div className="text-center mb-10">
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                style={{ background: PL2, color: PD }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Exclusivo para assinantes
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight mb-3">
                <span className="text-stone-900">As 3 receitas que transformaram o cabelo e a </span>
                <span style={{ color: P }}>autoestima de milhares de mulheres</span>
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                Resultados reais já na primeira aplicação. Com ingredientes que você provavelmente já tem em casa.
              </p>
            </div>
          </FadeIn>

          <div className="flex flex-col gap-5">
            {RECIPES_TEASE.map((recipe, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <RecipeCard recipe={recipe} />
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <button
              onClick={handleCheckout}
              className="mt-6 w-full rounded-2xl p-5 flex items-center justify-between"
              style={{ background: PL2, border: `1px solid ${P}30` }}
            >
              <p className="font-bold text-sm" style={{ color: PD }}>
                🔒 Desbloqueie as 3 receitas agora
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
                3.200+ pessoas já <span style={{ color: P }}>transformaram o cabelo</span>
              </h2>
              <p className="text-stone-400 text-sm">4,9 de 5 estrelas em avaliações verificadas</p>
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
                <span className="text-xs font-semibold text-stone-400">📸 Post verificado</span>
              </div>
              <div className="relative overflow-hidden bg-white">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentTestimonial}
                    src={TESTIMONIALS[currentTestimonial].screenshot}
                    alt={`Depoimento ${currentTestimonial + 1}`}
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

      {/* ── REASSURANCE ── */}
      <section style={{ background: PL }}>
        <div className="max-w-xl mx-auto px-6 py-12">
          <FadeIn>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🚫', text: 'Sem produtos caros' },
                { icon: '🌱', text: 'Sem químicas agressivas' },
                { icon: '✔️', text: 'Apenas o que funciona' },
              ].map((item, i) => (
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
                Dúvidas frequentes
              </p>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-stone-900 leading-[1.1] tracking-tight">
                Tudo que você precisa saber
              </h2>
            </div>
          </FadeIn>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item, i) => (
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
          Ao assinar você concorda com os termos de uso. Cobrança recorrente mensal em dólares americanos. Cancele a qualquer momento pelo portal do cliente sem nenhuma taxa.
        </p>
      </div>
    </div>
  );
}
