import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, Sparkles, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// ── constants ──────────────────────────────────────────────────────────────

const HAIR_PROBLEMS = [
  { value: 'dry',      label: 'Seco ou ressecado',         img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=300&q=70' },
  { value: 'frizz',   label: 'Com frizz',                  img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=70' },
  { value: 'breakage',label: 'Quebradiço',                  img: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=300&q=70' },
  { value: 'loss',    label: 'Caindo mais que o normal',   img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=70' },
  { value: 'growth',  label: 'Não cresce',                 img: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=300&q=70' },
];

const STEPS = {
  HOOK: 0,
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4,
  Q5: 5,
  NAME: 6,
  LOADING: 7,
  DIAGNOSIS: 8,
  PAYWALL: 9,
};

const TOTAL_QUIZ_STEPS = 5; // Q1–Q5

// ── helpers ────────────────────────────────────────────────────────────────

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
  transition: { duration: 0.35 },
};

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-stone-200 rounded-full h-2 mb-6">
      <motion.div
        className="h-2 rounded-full bg-emerald-500"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [step, setStep] = useState(STEPS.HOOK);
  const [answers, setAnswers] = useState({
    problems: [],
    washFreq: '',
    waterTemp: '',
    heatTools: '',
    hydration: '',
    name: '',
  });
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Se já está logado e veio do redirect OAuth, vai direto para o dashboard
  useEffect(() => {
    if (user && step === STEPS.HOOK) {
      const pendingStep = sessionStorage.getItem('glow_pending_step');
      if (pendingStep === 'dashboard') {
        sessionStorage.removeItem('glow_pending_step');
        navigate('/HairDashboard');
      }
    }
  }, [user, step, navigate]);

  // loading animation
  useEffect(() => {
    if (step !== STEPS.LOADING) return;
    setLoadingProgress(0);
    const items = [
      { pct: 30, delay: 600 },
      { pct: 65, delay: 1300 },
      { pct: 100, delay: 2100 },
    ];
    const timers = items.map(({ pct, delay }) =>
      setTimeout(() => setLoadingProgress(pct), delay)
    );
    const done = setTimeout(() => setStep(STEPS.DIAGNOSIS), 2800);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [step]);

  const goNext = (nextStep) => {
    setStep(nextStep);
  };

  const handleStart = () => {
    setStep(STEPS.Q1);
  };

  const handleProblemToggle = (val) => {
    setAnswers(prev => ({
      ...prev,
      problems: prev.problems.includes(val)
        ? prev.problems.filter(v => v !== val)
        : [...prev.problems, val],
    }));
  };

  const handleUnlock = async () => {
    if (!user) {
      // Marca intenção para ir ao dashboard após login
      sessionStorage.setItem('glow_pending_step', 'dashboard');
      await signInWithGoogle('/Landing');
      return;
    }
    navigate('/HairDashboard');
  };

  // quiz progress (Q1=1, Q2=2 … Q5=5)
  const quizProgress = step >= STEPS.Q1 && step <= STEPS.Q5 ? step : 0;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: #FB45A9; color: #fff; border-radius: 9999px; font-weight: 700; transition: all .2s; }
        .btn-primary:hover { background: #E03594; box-shadow: 0 8px 24px rgba(251,69,169,.35); transform: scale(1.02); }
        .btn-white { background: #fff; color: #E03594; border-radius: 9999px; font-weight: 700; transition: all .2s; }
        .btn-white:hover { box-shadow: 0 8px 24px rgba(0,0,0,.15); transform: scale(1.02); }
        .card-option { border: 2px solid #e7e5e4; border-radius: 16px; cursor: pointer; transition: all .2s; }
        .card-option:hover { border-color: #FB45A9; background: #FFF5FA; }
        .card-option.selected { border-color: #FB45A9; background: #FFF5FA; }
        .card-img-option { border: 2px solid #e7e5e4; border-radius: 16px; cursor: pointer; overflow: hidden; transition: all .2s; }
        .card-img-option:hover { border-color: #FB45A9; }
        .card-img-option.selected { border-color: #FB45A9; box-shadow: 0 0 0 3px rgba(251,69,169,.25); }
      `}</style>

      {/* ── HEADER ── */}
      {step !== STEPS.PAYWALL && (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200/60">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="NatGlow"
                className="w-9 h-9 rounded-xl"
              />
              <span className="font-bold text-stone-800 text-sm">NatGlow</span>
            </div>
            {quizProgress > 0 ? (
              <span className="text-xs text-stone-400 font-medium">{quizProgress}/{TOTAL_QUIZ_STEPS}</span>
            ) : user ? (
              <button
                onClick={() => navigate('/HairDashboard')}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium"
              >
                Ir para minha conta →
              </button>
            ) : (
              <button
                onClick={async () => {
                  sessionStorage.setItem('glow_pending_step', 'dashboard');
                  await signInWithGoogle('/Landing');
                }}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium"
              >
                Entrar
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ═══ HOOK ═══ */}
          {step === STEPS.HOOK && (
            <motion.div key="hook" {...slide} className="flex flex-col">
              <div className="w-full max-w-lg mx-auto">
                <img
                  src="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80"
                  alt="Cabelo com frizz e ressecado"
                  className="w-full object-cover"
                  style={{ maxHeight: 340, objectPosition: 'top' }}
                />
              </div>
              <div className="max-w-lg mx-auto px-5 py-8 flex flex-col gap-6">
                <div className="inline-flex self-start items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                  ⚠️ Atenção
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 leading-tight">
                  Você pode estar destruindo seu cabelo sem perceber
                </h1>
                <p className="text-stone-500 leading-relaxed">
                  A maioria das pessoas com cabelo seco, com frizz ou caindo não tem falta de produto.<br /><br />
                  O problema é que está cuidando do jeito errado todos os dias.<br /><br />
                  Em menos de 60 segundos, vamos identificar o que pode estar prejudicando seu cabelo e mostrar o que realmente funciona.
                </p>
                <button
                  onClick={handleStart}
                  className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
                >
                  Começar diagnóstico
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-xs text-stone-400">100% gratuito · Leva menos de 60 segundos</p>
              </div>
            </motion.div>
          )}

          {/* ═══ Q1 — hair problems (multi-select with images) ═══ */}
          {step === STEPS.Q1 && (
            <motion.div key="q1" {...slide} className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
              <ProgressBar current={1} total={TOTAL_QUIZ_STEPS} />
              <div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Como seu cabelo está hoje?</h2>
                <p className="text-xs font-semibold text-emerald-600 mb-1">Você pode escolher mais de uma opção</p>
                <p className="text-sm text-stone-500">Seja sincera. Esses são sinais de que algo está errado na forma como você está cuidando do seu cabelo.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {HAIR_PROBLEMS.map(opt => (
                  <div
                    key={opt.value}
                    className={`card-img-option ${answers.problems.includes(opt.value) ? 'selected' : ''}`}
                    onClick={() => handleProblemToggle(opt.value)}
                  >
                    <div className="relative">
                      <img src={opt.img} alt={opt.label} className="w-full h-28 object-cover" />
                      {answers.problems.includes(opt.value) && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-stone-700 px-3 py-2 text-center">{opt.label}</p>
                  </div>
                ))}
              </div>
              <button
                disabled={answers.problems.length === 0}
                onClick={() => goNext(STEPS.Q2)}
                className="btn-primary py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </motion.div>
          )}

          {/* ═══ Q2 — wash frequency ═══ */}
          {step === STEPS.Q2 && (
            <motion.div key="q2" {...slide} className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
              <ProgressBar current={2} total={TOTAL_QUIZ_STEPS} />
              <div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">Com que frequência você lava o cabelo?</h2>
                <p className="text-sm text-stone-500">Muita gente acredita que está cuidando bem do cabelo, mas aqui começa um dos erros mais comuns que acabam destruindo a saúde dos fios aos poucos.</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'daily',    label: 'Todos os dias', emoji: '🚿' },
                  { value: '3_4',      label: '3 a 4 vezes por semana', emoji: '📅' },
                  { value: '1_2',      label: '1 a 2 vezes por semana', emoji: '🌿' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`card-option px-5 py-4 flex items-center gap-4 ${answers.washFreq === opt.value ? 'selected' : ''}`}
                    onClick={() => { setAnswers(a => ({ ...a, washFreq: opt.value })); goNext(STEPS.Q3); }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="font-semibold text-stone-700">{opt.label}</span>
                    {answers.washFreq === opt.value && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q3 — water temp (with image) ═══ */}
          {step === STEPS.Q3 && (
            <motion.div key="q3" {...slide} className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
              <ProgressBar current={3} total={TOTAL_QUIZ_STEPS} />
              <div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">A temperatura da água costuma ser:</h2>
                <p className="text-sm text-stone-500">Esse é um dos fatores que mais causam ressecamento, frizz e perda de brilho, mesmo em pessoas que usam bons produtos.</p>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1585341090996-c1fd7e08c685?w=600&q=70"
                  alt="Banho quente"
                  className="w-full h-40 object-cover"
                />
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'hot',  label: 'Quente', emoji: '🔥', desc: 'Bem quente, como eu gosto' },
                  { value: 'warm', label: 'Morna',  emoji: '💧', desc: 'Temperatura agradável' },
                  { value: 'cold', label: 'Fria',   emoji: '❄️', desc: 'Fria ou finalizo fria' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`card-option px-5 py-4 flex items-center gap-4 ${answers.waterTemp === opt.value ? 'selected' : ''}`}
                    onClick={() => { setAnswers(a => ({ ...a, waterTemp: opt.value })); goNext(STEPS.Q4); }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className="font-semibold text-stone-700">{opt.label}</p>
                      <p className="text-xs text-stone-400">{opt.desc}</p>
                    </div>
                    {answers.waterTemp === opt.value && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q4 — heat tools ═══ */}
          {step === STEPS.Q4 && (
            <motion.div key="q4" {...slide} className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
              <ProgressBar current={4} total={TOTAL_QUIZ_STEPS} />
              <div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">Você usa secador ou chapinha?</h2>
                <p className="text-sm text-stone-500">O uso frequente de calor pode enfraquecer o fio, aumentar a quebra e deixar o cabelo com aparência sem vida, mesmo que você tente hidratar.</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'daily',  label: 'Todos os dias',              emoji: '🔌' },
                  { value: 'few',    label: 'Algumas vezes por semana',   emoji: '📆' },
                  { value: 'rarely', label: 'Raramente',                  emoji: '🌬️' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`card-option px-5 py-4 flex items-center gap-4 ${answers.heatTools === opt.value ? 'selected' : ''}`}
                    onClick={() => { setAnswers(a => ({ ...a, heatTools: opt.value })); goNext(STEPS.Q5); }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="font-semibold text-stone-700">{opt.label}</span>
                    {answers.heatTools === opt.value && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q5 — hydration ═══ */}
          {step === STEPS.Q5 && (
            <motion.div key="q5" {...slide} className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
              <ProgressBar current={5} total={TOTAL_QUIZ_STEPS} />
              <div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">Você faz hidratação ou tratamento no cabelo?</h2>
                <p className="text-sm text-stone-500">Aqui está outro ponto importante. Muitas pessoas até tentam cuidar, mas fazem isso da forma errada ou com produtos que não ajudam de verdade.</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'regularly', label: 'Sim, regularmente',  emoji: '✅', desc: 'Faço hidratação toda semana' },
                  { value: 'sometimes', label: 'Às vezes',           emoji: '🔄', desc: 'Quando lembro ou tenho tempo' },
                  { value: 'never',     label: 'Quase nunca',        emoji: '❌', desc: 'Não tenho esse hábito' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`card-option px-5 py-4 flex items-center gap-4 ${answers.hydration === opt.value ? 'selected' : ''}`}
                    onClick={() => { setAnswers(a => ({ ...a, hydration: opt.value })); goNext(STEPS.NAME); }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className="font-semibold text-stone-700">{opt.label}</p>
                      <p className="text-xs text-stone-400">{opt.desc}</p>
                    </div>
                    {answers.hydration === opt.value && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ NAME ═══ */}
          {step === STEPS.NAME && (
            <motion.div key="name" {...slide} className="max-w-lg mx-auto w-full px-4 py-10 flex flex-col gap-6">
              <div className="text-center">
                <div className="text-5xl mb-4">🌿</div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">Como podemos te chamar?</h2>
                <p className="text-sm text-stone-500">Queremos personalizar seu diagnóstico para você.<br />Leva só alguns segundos.</p>
              </div>
              <input
                type="text"
                placeholder="Seu primeiro nome"
                value={answers.name}
                onChange={e => setAnswers(a => ({ ...a, name: e.target.value }))}
                className="w-full border-2 border-stone-200 rounded-2xl px-5 py-4 text-lg text-stone-800 outline-none focus:border-emerald-400 transition-colors"
              />
              <button
                disabled={!answers.name.trim()}
                onClick={() => setStep(STEPS.LOADING)}
                className="btn-primary py-5 text-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ver meu diagnóstico
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* ═══ LOADING ═══ */}
          {step === STEPS.LOADING && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto w-full px-4 py-16 flex flex-col items-center gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🔬</div>
                <h2 className="text-2xl font-extrabold text-stone-900">Analisando suas respostas…</h2>
                <p className="text-sm text-stone-400 mt-2">Isso leva apenas alguns segundos</p>
              </div>
              <div className="w-full space-y-4">
                {[
                  { label: 'Identificando hábitos que prejudicam seu cabelo', threshold: 30 },
                  { label: 'Avaliando saúde do fio', threshold: 65 },
                  { label: 'Cruzando padrões e montando diagnóstico', threshold: 100 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${loadingProgress >= item.threshold ? 'bg-emerald-500' : 'bg-stone-200'}`}>
                      {loadingProgress >= item.threshold && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <p className={`text-sm transition-colors duration-500 ${loadingProgress >= item.threshold ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full bg-emerald-500"
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {/* ═══ DIAGNOSIS ═══ */}
          {step === STEPS.DIAGNOSIS && (
            <motion.div key="diag" {...slide} className="max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-6">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <h2 className="text-2xl font-extrabold text-stone-900">Seu diagnóstico capilar</h2>
                {answers.name && <p className="text-emerald-600 font-medium mt-1">Olá, {answers.name}!</p>}
              </div>

              {/* Signs */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <p className="font-bold text-stone-800 mb-3">Seu cabelo apresenta sinais de:</p>
                <ul className="space-y-2">
                  {['Ressecamento avançado', 'Dano térmico', 'Perda da proteção natural'].map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                      <span className="text-red-400 font-bold">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Why */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <p className="font-bold text-stone-800 mb-3">Isso geralmente acontece quando:</p>
                <ul className="space-y-2">
                  {[
                    'O cabelo é exposto à água quente com frequência',
                    'Há uso constante de calor',
                    'A hidratação não é feita da forma correta',
                  ].map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                      <span className="text-amber-500 font-bold">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hope */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <p className="font-bold text-emerald-800 text-lg">🌱 A boa notícia é que isso não é definitivo.</p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Seu cabelo pode recuperar muito mais rápido do que você imagina quando você corrige os erros e troca produtos químicos por receitas caseiras que realmente funcionam.
                </p>
              </div>

              {/* Myth busting */}
              <div className="bg-stone-900 rounded-2xl p-5 space-y-2">
                <p className="font-bold text-white">💡 O problema não é falta de produto.</p>
                <p className="text-sm text-stone-400 leading-relaxed">
                  Na maioria dos casos, o cabelo piora justamente pelo excesso de química e pelo uso errado no dia a dia.
                </p>
              </div>

              <button
                onClick={() => setStep(STEPS.PAYWALL)}
                className="btn-primary py-5 text-lg flex items-center justify-center gap-2"
              >
                Ver meu plano personalizado
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* ═══ PAYWALL ═══ */}
          {step === STEPS.PAYWALL && (
            <motion.div key="paywall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-b from-emerald-700 to-emerald-900 px-4 pt-12 pb-10 text-center text-white">
                <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> Plano pronto!
                </div>
                <h1 className="text-3xl font-extrabold leading-tight mb-3">Seu plano está pronto</h1>
                <p className="text-emerald-100 text-sm max-w-xs mx-auto">
                  Criamos um plano personalizado com base nas suas respostas.
                </p>
              </div>

              <div className="max-w-lg mx-auto w-full px-4 -mt-4 flex flex-col gap-5 pb-16">
                {/* Includes */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
                  <p className="font-bold text-stone-800 mb-4">Seu plano inclui:</p>
                  <ul className="space-y-3">
                    {[
                      { icon: '📋', text: 'Rotina completa personalizada' },
                      { icon: '📅', text: 'Plano de 21 dias passo a passo' },
                      { icon: '🌿', text: 'Receitas naturais mais eficazes para seu tipo' },
                      { icon: '✅', text: 'Checklist diário de acompanhamento' },
                      { icon: '📈', text: 'Acompanhamento da evolução' },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-stone-700 font-medium">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reassurance */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: '🚫', text: 'Sem produtos caros' },
                    { icon: '🌱', text: 'Sem químicas agressivas' },
                    { icon: '✔️', text: 'Apenas o que funciona' },
                  ].map((item, i) => (
                    <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                      <div className="text-xl mb-1">{item.icon}</div>
                      <p className="text-xs font-semibold text-emerald-800">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-stone-400" />
                    <p className="text-sm text-stone-500 font-medium">Conteúdo personalizado</p>
                  </div>
                  <p className="text-stone-800 font-bold text-lg mb-4">Acesse seu plano completo agora</p>
                  <button
                    onClick={handleUnlock}
                    className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
                  >
                    Começar agora
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-stone-400 mt-3">Gratuito · Sem cartão · Começa hoje</p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}