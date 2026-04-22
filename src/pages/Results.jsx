import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Star, Loader2, ChevronDown, ChevronUp, Clock, Lock } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// ── constants ──────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: '🌿', text: 'As 3 receitas campeãs com resultado na 1ª aplicação' },
  { icon: '📋', text: 'Rotina capilar personalizada de 21 dias' },
  { icon: '📅', text: 'Plano progressivo de 4 fases (84+ dias)' },
  { icon: '🍯', text: 'Biblioteca completa com 25 receitas naturais caseiras' },
  { icon: '📈', text: 'Acompanhamento de progresso e conquistas' },
  { icon: '📱', text: 'Acesso em qualquer dispositivo, a qualquer hora' },
];

const RECIPES_TEASE = [
  {
    emoji: '🌿',
    tag: 'Resultado na 1ª aplicação',
    benefit: 'Hidratação que transforma na hora',
    description: 'Fios macios como seda, cheios de brilho e sem frizz — visível logo após enxaguar.',
  },
  {
    emoji: '🥥',
    tag: 'Age enquanto você dorme',
    benefit: 'Tônico noturno de crescimento',
    description: 'Acorda com o cabelo mais forte, menos queda e crescimento visivelmente acelerado.',
  },
  {
    emoji: '🍋',
    tag: 'Dura dias inteiros',
    benefit: 'Selante natural anti-frizz',
    description: 'Controla o frizz por 3 a 5 dias com uma mistura simples de ingredientes da sua cozinha.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Ana Paula R.',
    text: 'Em 3 semanas meu cabelo parou de quebrar completamente. Eu não acreditava que ia funcionar tão rápido!',
    stars: 5,
    result: 'Quebra -70%',
    photo: '/images/testimonials/ana-paula.jpg',
  },
  {
    name: 'Camila S.',
    text: 'As receitas têm ingredientes que eu já tinha em casa. O resultado foi incrível já na primeira vez que usei.',
    stars: 5,
    result: '100% natural',
    photo: '/images/testimonials/camila.jpg',
  },
  {
    name: 'Júlia M.',
    text: 'O frizz sumiu nos primeiros 15 dias. Olhei no espelho e não acreditei — meu cabelo nunca esteve assim.',
    stars: 5,
    result: 'Frizz -80%',
    photo: '/images/testimonials/julia.jpg',
  },
];

const FAQ = [
  {
    q: 'E se eu não gostar?',
    a: 'Cancele quando quiser, direto pelo portal do cliente. Sem perguntas, sem burocracia, sem taxas. Você tem total controle.',
  },
  {
    q: 'Os ingredientes das receitas são caros?',
    a: 'Não! As receitas usam coisas simples como mel, babosa, óleo de coco e limão — ingredientes que você provavelmente já tem em casa agora mesmo.',
  },
  {
    q: 'Quanto tempo até ver resultado?',
    a: 'Muitas usuárias notam diferença já na 1ª aplicação das receitas. Para resultados de transformação completa, a maioria vê em 2 a 3 semanas de rotina.',
  },
  {
    q: 'Funciona para qualquer tipo de cabelo?',
    a: 'Sim! Seu plano foi montado com base nas respostas do seu diagnóstico, então as receitas e a rotina são específicas para o seu tipo de fio e problema.',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

function getDiagnosis(answers) {
  const signs = [];
  const causes = [];

  if (answers.waterTemp === 'hot') {
    signs.push('Ressecamento e perda de brilho nos fios');
    causes.push('Água quente abre as cutículas e resseca profundamente cada fio');
  }
  if (answers.heatTools === 'daily' || answers.heatTools === 'few') {
    signs.push('Dano térmico acumulado nos fios');
    causes.push('Calor frequente sem proteção enfraquece e fragiliza o fio');
  }
  if (answers.hydration === 'never' || answers.hydration === 'sometimes') {
    signs.push('Falta de hidratação profunda e constante');
    causes.push('Hidratação irregular não repõe a nutrição que os fios perdem todo dia');
  }
  if (answers.washFreq === 'daily') {
    signs.push('Remoção excessiva dos óleos naturais protetores');
    causes.push('Lavagem diária elimina a barreira natural que protege e hidrata os fios');
  }
  if (answers.waterTemp === 'warm' && answers.heatTools === 'rarely' && answers.hydration === 'regularly') {
    signs.push('Rotina parcialmente correta, mas com gaps que limitam os resultados');
    causes.push('Pequenos ajustes na rotina podem destravar um resultado muito maior');
  }

  if (signs.length === 0) {
    signs.push('Ressecamento e opacidade dos fios', 'Falta de nutrição profunda', 'Rotina capilar desbalanceada');
  }
  if (causes.length === 0) {
    causes.push('Hábitos diários que prejudicam os fios sem você perceber', 'Técnicas inadequadas para o seu tipo de fio');
  }

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
        <span className="font-semibold text-stone-800 text-sm pr-2">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{a}</p>}
    </div>
  );
}

function PricingCard({ onCheckout, loading, error, name }) {
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
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="rounded-2xl border-2 shadow-lg overflow-hidden" style={{ borderColor: '#FB45A9' }}>
      <div className="text-white text-center py-2.5 text-xs font-bold" style={{ background: 'linear-gradient(135deg, #FB45A9, #E03594)' }}>
        🔥 Promoção Especial de Lançamento
      </div>
      <div className="bg-white p-6">
        {timeLeft > 0 && (
          <div
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 mb-4 text-sm font-semibold"
            style={{ background: '#FFF5FA', color: '#E03594' }}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            Oferta expira em <span className="font-extrabold ml-1">{fmt(timeLeft)}</span>
          </div>
        )}

        <div className="text-center mb-5">
          <p className="text-sm text-stone-400 line-through mb-1">R$ 47,99/mês</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-sm font-bold text-stone-600">R$</span>
            <span className="text-5xl font-extrabold" style={{ color: '#E03594' }}>6,99</span>
            <span className="text-stone-400 text-base">/mês</span>
          </div>
          <p className="text-xs text-stone-400 mt-1">Cancele quando quiser · Sem fidelidade</p>
        </div>

        <ul className="space-y-2 mb-5">
          {BENEFITS.map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
              <span className="text-base leading-none flex-shrink-0">{b.icon}</span>
              {b.text}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-4 py-2 text-center">{error}</p>
        )}

        <button
          onClick={onCheckout}
          disabled={loading}
          className="btn-primary w-full py-5 text-base flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Aguarde...</>
            : <>Quero meu plano personalizado agora <ArrowRight className="w-5 h-5" /></>}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-stone-400">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          Pagamento seguro via Stripe · Cancele quando quiser. Sem taxas ocultas.
        </div>
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

  // Initialise the 15-min timer once per quiz session
  useEffect(() => {
    const stored = sessionStorage.getItem('glow_results_timer_end');
    if (!stored) {
      const end = Date.now() + 15 * 60 * 1000;
      sessionStorage.setItem('glow_results_timer_end', end.toString());
    }
  }, []);

  // No state (direct URL access) → back to quiz
  useEffect(() => {
    if (!state?.answers) navigate('/Landing', { replace: true });
  }, [state, navigate]);

  // Subscribed user → straight to app
  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true });
  }, [user, isSubscribed, navigate]);

  if (!state?.answers) return null;

  const { answers } = state;
  const { signs, causes } = getDiagnosis(answers);
  const name = answers.name?.trim();

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
        .btn-primary { background:linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover:not(:disabled) { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
      `}</style>

      {/* HEADER */}
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

      {/* HERO */}
      <div className="px-4 pt-10 pb-12 text-center text-white" style={{ background: 'linear-gradient(to bottom, #FB45A9, #E03594)' }}>
        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
          🌿 Diagnóstico pronto
        </div>
        <h1 className="text-2xl font-extrabold leading-tight mb-2">
          {name ? `${name}, seu diagnóstico está pronto!` : 'Seu diagnóstico está pronto!'}
        </h1>
        <p className="text-pink-100 text-sm">
          Encontramos o que está impedindo seu cabelo de ser lindo
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-16 flex flex-col gap-5">

        {/* ── Diagnosis cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-100 rounded-2xl p-5"
        >
          <p className="font-bold text-stone-800 mb-3">🚨 Seu cabelo está pedindo socorro:</p>
          <ul className="space-y-2">
            {signs.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">•</span> {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-amber-50 border border-amber-100 rounded-2xl p-5"
        >
          <p className="font-bold text-stone-800 mb-3">⚠️ E isso acontece porque:</p>
          <ul className="space-y-2">
            {causes.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-amber-500 font-bold mt-0.5 flex-shrink-0">→</span> {c}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 space-y-2"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
        >
          <p className="font-bold text-emerald-800">🌱 A boa notícia? Isso tem solução — e mais rápida do que você imagina.</p>
          <p className="text-sm text-stone-600 leading-relaxed">
            Seu cabelo pode se recuperar muito mais rápido quando você troca os produtos químicos por receitas naturais caseiras que realmente funcionam.
          </p>
        </motion.div>

        {/* ── Tease das 3 receitas campeãs ── */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✨</span>
            <p className="font-bold text-stone-900">Seu plano inclui 3 receitas campeãs</p>
          </div>
          <p className="text-xs text-stone-500 mb-4">
            Resultado comprovado já na 1ª aplicação — as mesmas receitas que transformaram o cabelo de mais de 3.200 mulheres brasileiras
          </p>
          <div className="flex flex-col gap-3">
            {RECIPES_TEASE.map((r, i) => (
              <div key={i} className="border border-stone-100 rounded-xl overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <span className="text-2xl leading-none flex-shrink-0">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#FFE4F2', color: '#E03594' }}
                      >
                        {r.tag}
                      </span>
                    </div>
                    <p className="font-semibold text-stone-800 text-sm mb-0.5">{r.benefit}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{r.description}</p>
                  </div>
                </div>
                <div className="border-t border-stone-100 bg-stone-50 px-4 py-2 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <div className="flex gap-1.5 flex-1">
                    {['████████', '██████', '█████████'].map((b, j) => (
                      <span key={j} className="text-stone-300 text-xs font-bold select-none">{b}</span>
                    ))}
                  </div>
                  <span className="text-xs text-stone-400 font-medium whitespace-nowrap">Ingredientes ocultos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Social proof ── */}
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['👩','🙋','💁','👩‍🦱'].map((e, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-xs leading-none">{e}</div>
              ))}
            </div>
            <p className="text-sm text-stone-600">
              <strong className="text-stone-800">3.200+</strong> mulheres brasileiras já transformaram o cabelo
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            <span className="text-xs text-stone-500 ml-1">4,9 de 5 estrelas</span>
          </div>
        </div>

        {/* ── Main pricing CTA ── */}
        <PricingCard onCheckout={handleCheckout} loading={loading} error={error} name={name} />

        {/* ── Guarantee ── */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-3xl leading-none">🛡️</div>
          <div>
            <p className="font-bold text-stone-800 mb-1">Cancele quando quiser</p>
            <p className="text-sm text-stone-500">Sem perguntas, sem burocracia. Você tem total controle da sua assinatura a qualquer momento — pelo portal do cliente, em segundos.</p>
          </div>
        </div>

        {/* ── Testimonials ── */}
        <p className="font-bold text-stone-800 text-center mt-2">O que dizem nossas usuárias</p>
        <div className="flex flex-col gap-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#FFE4F2' }}>
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-sm">{t.name}</p>
                  <div className="flex mt-0.5">
                    {Array.from({ length: t.stars }).map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#F0FDF4', color: '#16A34A' }}
                >
                  {t.result}
                </span>
              </div>
              <p className="text-stone-600 text-sm italic leading-relaxed">"{t.text}"</p>
            </div>
          ))}
        </div>

        {/* ── Reassurance grid ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🚫', text: 'Sem produtos caros' },
            { icon: '🌱', text: 'Sem químicas agressivas' },
            { icon: '✔️', text: 'Apenas o que funciona' },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: '#FFF5FA', border: '1px solid #FFB3DD' }}>
              <div className="text-xl mb-1">{item.icon}</div>
              <p className="text-xs font-semibold" style={{ color: '#E03594' }}>{item.text}</p>
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
        <PricingCard onCheckout={handleCheckout} loading={loading} error={error} name={name} />

        <p className="text-center text-xs text-stone-400 pb-4">
          Ao assinar você concorda com os termos de uso. Cobrança recorrente mensal. Cancele a qualquer momento pelo portal do cliente.
        </p>
      </div>
    </div>
  );
}
