import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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
};

const TOTAL_QUIZ_STEPS = 5;

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
  const { user, isSubscribed } = useAuth();
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

  // Usuária já logada e assinante → redireciona para o app
  useEffect(() => {
    if (user && isSubscribed && step === STEPS.HOOK) {
      navigate('/HairDashboard');
    }
  }, [user, isSubscribed, step, navigate]);

  // Loading animation → navega para /Results com as respostas
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
    const done = setTimeout(() => {
      navigate('/Results', { state: { answers } });
    }, 2800);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [step]);  // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = (nextStep) => setStep(nextStep);

  const handleProblemToggle = (val) => {
    setAnswers(prev => ({
      ...prev,
      problems: prev.problems.includes(val)
        ? prev.problems.filter(v => v !== val)
        : [...prev.problems, val],
    }));
  };

  const quizProgress = step >= STEPS.Q1 && step <= STEPS.Q5 ? step : 0;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color: #fff; border-radius: 9999px; font-weight: 700; transition: all .2s; }
        .btn-primary:hover { opacity: .9; box-shadow: 0 8px 24px rgba(251,69,169,.35); transform: scale(1.02); }
        .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
        .card-option { border: 2px solid #e7e5e4; border-radius: 16px; cursor: pointer; transition: all .2s; }
        .card-option:hover { border-color: #FB45A9; background: #FFF5FA; }
        .card-option.selected { border-color: #FB45A9; background: #FFF5FA; }
        .card-img-option { border: 2px solid #e7e5e4; border-radius: 16px; cursor: pointer; overflow: hidden; transition: all .2s; }
        .card-img-option:hover { border-color: #FB45A9; }
        .card-img-option.selected { border-color: #FB45A9; box-shadow: 0 0 0 3px rgba(251,69,169,.25); }
        .bg-emerald-500 { background-color: #FB45A9 !important; }
        .text-emerald-500 { color: #FB45A9 !important; }
        .text-emerald-600 { color: #FB45A9 !important; }
        .focus\\:border-emerald-400:focus { border-color: #FB45A9 !important; }
      `}</style>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </div>
          {quizProgress > 0 ? (
            <span className="text-xs text-stone-400 font-medium">{quizProgress}/{TOTAL_QUIZ_STEPS}</span>
          ) : (
            <Link
              to="/Login"
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium"
            >
              Já tenho conta →
            </Link>
          )}
        </div>
      </header>

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
                  onClick={() => setStep(STEPS.Q1)}
                  className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
                >
                  Começar diagnóstico
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-xs text-stone-400">100% gratuito · Leva menos de 60 segundos</p>
              </div>
            </motion.div>
          )}

          {/* ═══ Q1 — hair problems ═══ */}
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
                className="btn-primary py-4 text-base"
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
                  { value: 'daily', label: 'Todos os dias', emoji: '🚿' },
                  { value: '3_4',   label: '3 a 4 vezes por semana', emoji: '📅' },
                  { value: '1_2',   label: '1 a 2 vezes por semana', emoji: '🌿' },
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

          {/* ═══ Q3 — water temp ═══ */}
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
                  { value: 'daily',  label: 'Todos os dias',            emoji: '🔌' },
                  { value: 'few',    label: 'Algumas vezes por semana', emoji: '📆' },
                  { value: 'rarely', label: 'Raramente',                emoji: '🌬️' },
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
                  { value: 'regularly', label: 'Sim, regularmente', emoji: '✅', desc: 'Faço hidratação toda semana' },
                  { value: 'sometimes', label: 'Às vezes',          emoji: '🔄', desc: 'Quando lembro ou tenho tempo' },
                  { value: 'never',     label: 'Quase nunca',       emoji: '❌', desc: 'Não tenho esse hábito' },
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
                className="btn-primary py-5 text-lg flex items-center justify-center gap-2"
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

        </AnimatePresence>
      </div>
    </div>
  );
}
