import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const HAIR_PROBLEMS = [
  { label: 'Cabelo ressecado',          img: '/images/quiz/dry-hair.jpg' },
  { label: 'Frizz excessivo',           img: '/images/quiz/frizz.jpg' },
  { label: 'Queda de cabelo',           img: '/images/quiz/hair-loss.jpg' },
  { label: 'Pontas duplas / quebradas', img: '/images/quiz/split-ends.jpg' },
  { label: 'Oleosidade excessiva',      img: '/images/quiz/oily-hair.jpg' },
  { label: 'Falta de volume',           img: '/images/quiz/no-volume.jpg' },
  { label: 'Cabelo sem brilho',         img: '/images/quiz/no-shine.jpg' },
  { label: 'Dificuldade para crescer',  img: '/images/quiz/slow-growth.jpg' },
];

const STEPS = { ANCHOR: 0, Q1: 1, Q2: 2, Q3: 3, Q4: 4, Q5: 5, NAME: 6, LOADING: 7 };
const TOTAL_QUIZ_STEPS = 6;

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
  transition: { duration: 0.3 },
};

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5">
      <motion.div
        className="h-1.5 rounded-full"
        style={{ background: 'linear-gradient(90deg, #FB45A9, #E03594)' }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function QuizOption({ value, label, desc, emoji, selected, onClick }) {
  return (
    <div
      className={`card-option px-4 py-4 flex items-center gap-4 ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="text-3xl leading-none flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-700 text-base">{label}</p>
        {desc && <p className="text-sm text-stone-400 mt-0.5">{desc}</p>}
      </div>
      {selected && <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#FB45A9' }} />}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [step, setStep] = useState(STEPS.ANCHOR);
  const [answers, setAnswers] = useState({ washFreq: '', waterTemp: '', heatTools: '', hydration: '', chemProducts: '', name: '' });
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('glow_quiz_state');
      if (saved) {
        const { step: s, answers: a } = JSON.parse(saved);
        if (s < STEPS.LOADING) { setStep(s); setAnswers(a); }
      }
    } catch {}
  }, []);

  // Persist state to sessionStorage
  useEffect(() => {
    if (step < STEPS.LOADING) {
      sessionStorage.setItem('glow_quiz_state', JSON.stringify({ step, answers }));
    }
  }, [step, answers]);

  // Subscribed users go straight to the app
  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard');
  }, [user, isSubscribed, navigate]);

  // Loading animation → navigate to Results
  useEffect(() => {
    if (step !== STEPS.LOADING) return;
    setLoadingProgress(0);
    const timers = [
      setTimeout(() => setLoadingProgress(30), 600),
      setTimeout(() => setLoadingProgress(65), 1300),
      setTimeout(() => setLoadingProgress(100), 2100),
    ];
    const done = setTimeout(() => {
      sessionStorage.removeItem('glow_quiz_state');
      sessionStorage.removeItem('glow_results_timer_end');
      navigate('/Results', { state: { answers } });
    }, 2800);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const showStepCounter = step >= STEPS.Q1 && step <= STEPS.NAME;
  const ans = (field, value) => setAnswers(a => ({ ...a, [field]: value }));

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .btn-primary { background: linear-gradient(135deg,#FB45A9,#E03594); color:#fff; border-radius:9999px; font-weight:700; transition:all .2s; }
        .btn-primary:hover { opacity:.9; box-shadow:0 8px 24px rgba(251,69,169,.35); transform:scale(1.02); }
        .btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
        @keyframes pulse-scale { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
        .btn-pulse { animation: pulse-scale 1.8s ease-in-out infinite; }
        .card-option { border:2px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; }
        .card-option:active { border-color:#FB45A9; background:#FFF5FA; }
        .card-option.selected { border-color:#FB45A9; background:#FFF5FA; }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-stone-800 text-sm">NatGlow</span>
          </div>
          {showStepCounter ? (
            <span className="text-xs text-stone-400 font-medium">{step}/{TOTAL_QUIZ_STEPS}</span>
          ) : (
            <Link to="/Login" className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium">
              Já tenho conta →
            </Link>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ═══ ANCHOR ═══ */}
          {step === STEPS.ANCHOR && (
            <motion.div key="anchor" {...slide} className="max-w-lg mx-auto w-full px-4 pt-6 pb-6 flex flex-col gap-4">
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-stone-900 leading-snug mb-1">
                  Você sofre de algum destes problemas capilares?
                </h1>
                <p className="text-base text-stone-500">Por favor, seja sincera</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {HAIR_PROBLEMS.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-stone-100 px-3 py-2.5 shadow-sm">
                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: '#FFE4F2' }}
                    >
                      <img
                        src={opt.img}
                        alt={opt.label}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-stone-700 leading-snug">{opt.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-stone-500 text-center leading-relaxed">
                Você não está sozinha! Milhares de mulheres enfrentam exatamente isso todos os dias.
              </p>

              <button
                onClick={() => setStep(STEPS.Q1)}
                className="btn-primary btn-pulse w-full py-6 text-base flex items-center justify-center gap-2"
              >
                Sim, tenho pelo menos 1 deles
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
              </button>
              <p className="text-center text-xs text-stone-400 -mt-2">100% gratuito · Leva menos de 60 segundos</p>
            </motion.div>
          )}

          {/* ═══ Q1 — frequência de lavagem ═══ */}
          {step === STEPS.Q1 && (
            <motion.div key="q1" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={1} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  Com que frequência você lava o cabelo?
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'daily', label: 'Todos os dias',           emoji: '🚿', desc: 'Quase todo dia, faz parte da rotina' },
                  { value: '3_4',   label: '3 a 4 vezes por semana',  emoji: '📅', desc: 'Na maioria dos dias da semana' },
                  { value: '1_2',   label: '1 a 2 vezes por semana',  emoji: '🌿', desc: 'Só quando realmente precisa' },
                ].map(opt => (
                  <QuizOption
                    key={opt.value}
                    {...opt}
                    selected={answers.washFreq === opt.value}
                    onClick={() => { ans('washFreq', opt.value); setStep(STEPS.Q2); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q2 — temperatura da água ═══ */}
          {step === STEPS.Q2 && (
            <motion.div key="q2" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={2} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  A água do seu banho é geralmente:
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'hot',  label: 'Bem quente', emoji: '🔥', desc: 'Bem quente, como eu gosto' },
                  { value: 'warm', label: 'Morna',       emoji: '💧', desc: 'Temperatura agradável, não extrema' },
                  { value: 'cold', label: 'Fria',        emoji: '❄️', desc: 'Fria ou finalizo sempre fria' },
                ].map(opt => (
                  <QuizOption
                    key={opt.value}
                    {...opt}
                    selected={answers.waterTemp === opt.value}
                    onClick={() => { ans('waterTemp', opt.value); setStep(STEPS.Q3); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q3 — calor ═══ */}
          {step === STEPS.Q3 && (
            <motion.div key="q3" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={3} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  Você usa secador ou chapinha com frequência?
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'daily',  label: 'Todos os dias',             emoji: '🔌', desc: 'Faz parte da minha rotina diária' },
                  { value: 'few',    label: 'Algumas vezes por semana',  emoji: '📆', desc: 'Na maioria das vezes que lavo' },
                  { value: 'rarely', label: 'Raramente',                 emoji: '🌬️', desc: 'Só em ocasiões especiais' },
                ].map(opt => (
                  <QuizOption
                    key={opt.value}
                    {...opt}
                    selected={answers.heatTools === opt.value}
                    onClick={() => { ans('heatTools', opt.value); setStep(STEPS.Q4); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q4 — hidratação ═══ */}
          {step === STEPS.Q4 && (
            <motion.div key="q4" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={4} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  Você costuma fazer hidratação no cabelo?
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'regularly', label: 'Sim, regularmente', emoji: '✅', desc: 'Faço hidratação toda semana' },
                  { value: 'sometimes', label: 'Às vezes',          emoji: '🔄', desc: 'Quando lembro ou tenho tempo' },
                  { value: 'never',     label: 'Quase nunca',       emoji: '❌', desc: 'Não tenho esse hábito ainda' },
                ].map(opt => (
                  <QuizOption
                    key={opt.value}
                    {...opt}
                    selected={answers.hydration === opt.value}
                    onClick={() => { ans('hydration', opt.value); setStep(STEPS.Q5); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q5 — produtos químicos ═══ */}
          {step === STEPS.Q5 && (
            <motion.div key="q5" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={5} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#FB45A9' }}>
                  Esse detalhe muda tudo no diagnóstico
                </p>
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  Você usa produtos químicos no cabelo?
                </h2>
                <p className="text-sm text-stone-400 mt-2">Cremes, máscaras, botox, progressiva, etc...</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'yes_heavy', label: 'Sim, químicas fortes',   emoji: '⚗️', desc: 'Progressiva, botox, relaxamento, tintura' },
                  { value: 'yes_mild',  label: 'Sim, cremes e máscaras', emoji: '🧴', desc: 'Produtos de tratamento convencionais' },
                  { value: 'no',        label: 'Não uso',                emoji: '🌿', desc: 'Meu cabelo é natural, sem químicos' },
                ].map(opt => (
                  <QuizOption
                    key={opt.value}
                    {...opt}
                    selected={answers.chemProducts === opt.value}
                    onClick={() => { ans('chemProducts', opt.value); setStep(STEPS.NAME); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ NAME ═══ */}
          {step === STEPS.NAME && (
            <motion.div key="name" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={6} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center pt-6">
                <div className="text-5xl mb-4">🌿</div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">
                  Quase lá! Como posso te chamar?
                </h2>
                <p className="text-base text-stone-500">
                  Seu plano será personalizado especialmente para você.
                </p>
              </div>
              <input
                type="text"
                placeholder="Seu primeiro nome"
                value={answers.name}
                onChange={e => ans('name', e.target.value)}
                className="w-full border-2 border-stone-200 rounded-2xl px-5 py-4 text-lg text-stone-800 outline-none transition-colors"
                onFocus={e => { e.target.style.borderColor = '#FB45A9'; }}
                onBlur={e => { if (!answers.name.trim()) e.target.style.borderColor = '#e7e5e4'; }}
              />
              <button
                disabled={!answers.name.trim()}
                onClick={() => setStep(STEPS.LOADING)}
                className="btn-primary py-6 text-base flex items-center justify-center gap-2"
              >
                Ver meu diagnóstico personalizado
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* ═══ LOADING ═══ */}
          {step === STEPS.LOADING && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-lg mx-auto w-full px-4 py-16 flex flex-col items-center gap-8"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🔬</div>
                <h2 className="text-2xl font-extrabold text-stone-900">Analisando suas respostas…</h2>
                <p className="text-sm text-stone-400 mt-2">Isso leva apenas alguns segundos</p>
              </div>
              <div className="w-full space-y-4">
                {[
                  { label: 'Identificando hábitos que prejudicam seu cabelo', threshold: 30 },
                  { label: 'Avaliando a saúde dos seus fios',                 threshold: 65 },
                  { label: 'Montando seu diagnóstico personalizado',           threshold: 100 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                      style={{ background: loadingProgress >= item.threshold ? '#FB45A9' : '#e7e5e4' }}
                    >
                      {loadingProgress >= item.threshold && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <p className={`text-sm transition-colors duration-500 ${loadingProgress >= item.threshold ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #FB45A9, #E03594)' }}
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
