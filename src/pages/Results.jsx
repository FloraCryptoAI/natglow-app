import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Star, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// ── constants ──────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: '📋', text: 'Rotina capilar personalizada de 21 dias' },
  { icon: '📅', text: 'Plano progressivo de 4 fases (84+ dias)' },
  { icon: '🌿', text: 'Biblioteca com 25 receitas naturais caseiras' },
  { icon: '🔍', text: 'Filtro por ingrediente e tipo de problema' },
  { icon: '📈', text: 'Acompanhamento de progresso e conquistas' },
  { icon: '📱', text: 'Acesso em qualquer dispositivo, a qualquer hora' },
];

const TESTIMONIALS = [
  { name: 'Ana Paula R.', text: 'Em 3 semanas meu cabelo parou de quebrar. Não acreditava que seria tão rápido!', stars: 5, result: 'Quebra -70%' },
  { name: 'Camila S.', text: 'As receitas são simples e com ingredientes que já tenho em casa. Adorei demais!', stars: 5, result: '100% natural' },
  { name: 'Júlia M.', text: 'Meu frizz diminuiu muito nos primeiros 15 dias. O plano é fácil de seguir.', stars: 5, result: 'Frizz -80%' },
  { name: 'Mariana C.', text: 'Meu cabelo estava caindo muito e em 30 dias vi resultado real. Vale cada centavo!', stars: 5, result: 'Queda reduzida' },
];

const FAQ = [
  {
    q: 'E se eu não gostar?',
    a: 'Você pode cancelar a qualquer momento pelo portal do cliente. Sem perguntas, sem burocracia. Total controle na sua mão.',
  },
  {
    q: 'Os ingredientes das receitas são caros?',
    a: 'Não! Todas as receitas usam ingredientes simples como mel, azeite, ovos e aloe vera — que você provavelmente já tem em casa.',
  },
  {
    q: 'Quanto tempo até ver resultados?',
    a: 'A maioria das usuárias nota melhora visível em 2 a 3 semanas seguindo a rotina. Resultados de longo prazo em 60–90 dias.',
  },
  {
    q: 'Funciona para qualquer tipo de cabelo?',
    a: 'Sim! O plano é personalizado com base no seu diagnóstico para funcionar com seu tipo e problema específico.',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

function getDiagnosis(answers) {
  const signs = [];
  const causes = [];

  if (answers.problems.includes('dry') || answers.waterTemp === 'hot') {
    signs.push('Ressecamento avançado dos fios');
  }
  if (answers.heatTools === 'daily' || answers.heatTools === 'few') {
    signs.push('Dano térmico acumulado');
    causes.push('Uso frequente de calor sem proteção adequada');
  }
  if (answers.hydration === 'never' || answers.hydration === 'sometimes') {
    signs.push('Falta de hidratação profunda');
    causes.push('Hidratação irregular não repõe a nutrição perdida');
  }
  if (answers.washFreq === 'daily') {
    signs.push('Remoção excessiva dos óleos naturais');
    causes.push('Lavagem diária remove a proteção natural do fio');
  }
  if (answers.waterTemp === 'hot') {
    causes.push('Água quente abre as cutículas e resseca os fios');
  }
  if (answers.problems.includes('loss')) {
    signs.push('Enfraquecimento do couro cabeludo');
  }
  if (answers.problems.includes('frizz')) {
    signs.push('Desequilíbrio de proteína e hidratação no fio');
    if (!causes.some(c => c.includes('proteína')))
      causes.push('Desequilíbrio proteína-hidratação deixa o fio poroso');
  }
  if (answers.problems.includes('breakage')) {
    signs.push('Fios fragilizados com tendência à quebra');
  }
  if (answers.problems.includes('growth')) {
    signs.push('Crescimento abaixo do esperado');
    causes.push('Couro cabeludo não nutrido limita o crescimento');
  }

  if (signs.length === 0) signs.push('Ressecamento avançado', 'Dano térmico', 'Perda da proteção natural');
  if (causes.length === 0) causes.push('Rotina inadequada para seu tipo de cabelo', 'Produtos que não respeitam a química natural do fio');

  return { signs: signs.slice(0, 4), causes: causes.slice(0, 3) };
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-stone-800 text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  );
}

function PricingCard({ onCheckout, loading, error }) {
  return (
    <div className="bg-white rounded-2xl border-2 shadow-lg p-6 text-center" style={{ borderColor: '#FB45A9' }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#E03594' }}>Acesso Completo</p>
      <div className="flex items-baseline justify-center gap-1 mb-1">
        <span className="text-4xl font-extrabold text-stone-900">
          {import.meta.env.VITE_PLAN_PRICE ?? 'R$ 19,90'}
        </span>
        <span className="text-stone-400 text-sm">/mês</span>
      </div>
      <p className="text-xs text-stone-400 mb-5">Cancele quando quiser · Sem fidelidade</p>

      {error && (
        <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-4 py-2">{error}</p>
      )}

      <button
        onClick={onCheckout}
        disabled={loading}
        className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
      >
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Aguarde...</>
          : <>Assinar agora <ArrowRight className="w-5 h-5" /></>}
      </button>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-stone-400">
        <Shield className="w-3.5 h-3.5" />
        Pagamento seguro via Stripe · Cartão de crédito
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = sessionStorage.getItem('glow_results_timer_end');
    if (stored) {
      const remaining = Math.floor((parseInt(stored) - Date.now()) / 1000);
      if (remaining > 0) return remaining;
    }
    const end = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem('glow_results_timer_end', end.toString());
    return 15 * 60;
  });

  // Sem state (acesso direto) → volta para o quiz
  useEffect(() => {
    if (!state?.answers) {
      navigate('/Landing', { replace: true });
    }
  }, [state, navigate]);

  // Usuária já assinante → vai direto para o app
  useEffect(() => {
    if (user && isSubscribed) {
      navigate('/HairDashboard', { replace: true });
    }
  }, [user, isSubscribed, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  if (!state?.answers) return null;

  const { answers } = state;
  const { signs, causes } = getDiagnosis(answers);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      // Monta headers — sem Authorization para guest checkout
      const invokeOptions = {
        body: {
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/Results',
        },
      };

      // Se usuária já está logada, passa o token para reutilizar customer Stripe
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
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </div>
          <Link to="/Login" className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium">
            Já tenho conta →
          </Link>
        </div>
      </header>

      {/* Hero gradient */}
      <div className="px-4 pt-10 pb-12 text-center text-white" style={{ background: 'linear-gradient(to bottom, #FB45A9, #E03594)' }}>
        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
          📋 Diagnóstico pronto
        </div>
        <h1 className="text-3xl font-extrabold leading-tight mb-2">
          Seu diagnóstico capilar
        </h1>
        {answers.name && (
          <p className="text-pink-100 text-base font-medium">Olá, {answers.name}!</p>
        )}

        {/* Urgency timer */}
        {timeLeft > 0 && (
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-xl px-4 py-2 mt-4 text-sm font-semibold">
            <Clock className="w-4 h-4" />
            Oferta expira em <span className="font-extrabold ml-1">{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-16 flex flex-col gap-5">

        {/* ── Diagnosis cards ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <p className="font-bold text-stone-800 mb-3">Seu cabelo apresenta sinais de:</p>
          <ul className="space-y-2">
            {signs.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                <span className="text-red-400 font-bold">•</span> {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="font-bold text-stone-800 mb-3">Isso acontece porque:</p>
          <ul className="space-y-2">
            {causes.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                <span className="text-amber-500 font-bold">→</span> {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
          <p className="font-bold text-emerald-800 text-base">🌱 A boa notícia é que isso não é definitivo.</p>
          <p className="text-sm text-stone-600 leading-relaxed">
            Seu cabelo pode recuperar muito mais rápido do que você imagina quando você corrige os erros e troca produtos químicos por receitas caseiras que realmente funcionam.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-stone-900 rounded-2xl p-5 space-y-2">
          <p className="font-bold text-white">💡 O problema não é falta de produto.</p>
          <p className="text-sm text-stone-400 leading-relaxed">
            Na maioria dos casos, o cabelo piora justamente pelo excesso de química e pelo uso errado no dia a dia.
          </p>
        </motion.div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400 font-medium">Seu plano personalizado</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* ── Social proof ── */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {['👩','🙋','💁','👩‍🦱'].map((e, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-xs leading-none">{e}</div>
            ))}
          </div>
          <p className="text-xs text-stone-500"><strong className="text-stone-700">3.200+</strong> mulheres já transformaram o cabelo</p>
        </div>
        <div className="flex items-center justify-center gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
          <span className="text-xs text-stone-500 ml-1">4,9 de 5 estrelas</span>
        </div>

        {/* ── Benefits ── */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <p className="font-bold text-stone-800 mb-4">Seu plano inclui:</p>
          <ul className="space-y-3">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-xl">{b.icon}</span>
                <span className="text-stone-700 text-sm font-medium">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Reassurance grid ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🚫', text: 'Sem produtos caros' },
            { icon: '🌱', text: 'Sem químicas agressivas' },
            { icon: '✔️', text: 'Apenas o que funciona' },
          ].map((item, i) => (
            <div key={i} className="bg-pink-50 border border-pink-100 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <p className="text-xs font-semibold text-pink-800">{item.text}</p>
            </div>
          ))}
        </div>

        {/* ── Main pricing CTA ── */}
        <PricingCard onCheckout={handleCheckout} loading={loading} error={error} />

        {/* ── Guarantee ── */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-3xl leading-none">🛡️</div>
          <div>
            <p className="font-bold text-stone-800 mb-1">Cancele quando quiser</p>
            <p className="text-sm text-stone-500">Sem perguntas, sem burocracia. Você tem total controle da sua assinatura a qualquer momento.</p>
          </div>
        </div>

        {/* ── Testimonials ── */}
        <p className="font-bold text-stone-800 text-center mt-2">O que dizem nossas usuárias</p>
        <div className="flex flex-col gap-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{t.result}</span>
              </div>
              <p className="text-stone-600 text-sm italic">"{t.text}"</p>
              <p className="text-stone-400 text-xs mt-1 font-medium">— {t.name}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <p className="font-bold text-stone-800 text-center mt-2">Perguntas frequentes</p>
        <div className="flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        {/* ── Second CTA ── */}
        <PricingCard onCheckout={handleCheckout} loading={loading} error={error} />

        <p className="text-center text-xs text-stone-400 pb-4">
          Ao assinar você concorda com os termos de uso. Cobrança recorrente mensal. Cancele a qualquer momento pelo portal do cliente.
        </p>
      </div>
    </div>
  );
}
