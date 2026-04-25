import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/AuthContext';

const STEPS = {
  ANCHOR: 0, AGE: 1, HAIR_TYPE: 2,
  Q1: 3, Q2: 4, Q3: 5, Q4: 6, Q5: 7,
  NAME: 8, LOADING: 9,
};
const TOTAL_QUIZ_STEPS = 8;

const HAIR_PROBLEM_IMGS = [
  '/images/quiz-v2/ressecado-frizz.jpg',
  '/images/quiz-v2/quebra-pontas.jpg',
  '/images/quiz-v2/queda-crescimento.jpg',
  '/images/quiz-v2/oleoso.jpg',
  '/images/quiz-v2/sem-volume.jpg',
  '/images/quiz-v2/sem-brilho.jpg',
];

const HAIR_TYPE_META = [
  { value: 'liso',     img: '/images/quiz-v2/liso.jpg' },
  { value: 'ondulado', img: '/images/quiz-v2/ondulado.jpg' },
  { value: 'cacheado', img: '/images/quiz-v2/cacheado.jpg' },
  { value: 'crespo',   img: '/images/quiz-v2/crespo.jpg' },
];

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

export default function QuizV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [step, setStep] = useState(STEPS.ANCHOR);
  const [answers, setAnswers] = useState({
    age: '', hairType: '',
    washFreq: '', waterTemp: '', heatTools: '', hydration: '', chemProducts: '',
    name: '',
  });
  const [loadingProgress, setLoadingProgress] = useState(0);

  const HAIR_PROBLEMS_V2 = [
    { label: t('quiz.problems.dryFrizz'),  img: HAIR_PROBLEM_IMGS[0] },
    { label: t('quiz.problems.splitEnds'), img: HAIR_PROBLEM_IMGS[1] },
    { label: t('quiz.problems.hairLoss'),  img: HAIR_PROBLEM_IMGS[2] },
    { label: t('quiz.problems.oily'),      img: HAIR_PROBLEM_IMGS[3] },
    { label: t('quiz.problems.noVolume'),  img: HAIR_PROBLEM_IMGS[4] },
    { label: t('quiz.problems.noShine'),   img: HAIR_PROBLEM_IMGS[5] },
  ];

  const HAIR_TYPES = [
    { value: 'liso',     label: t('quiz.hairTypes.liso'),     img: '/images/quiz-v2/liso.jpg' },
    { value: 'ondulado', label: t('quiz.hairTypes.ondulado'), img: '/images/quiz-v2/ondulado.jpg' },
    { value: 'cacheado', label: t('quiz.hairTypes.cacheado'), img: '/images/quiz-v2/cacheado.jpg' },
    { value: 'crespo',   label: t('quiz.hairTypes.crespo'),   img: '/images/quiz-v2/crespo.jpg' },
  ];

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('glow_quizv2_state');
      if (saved) {
        const { step: s, answers: a } = JSON.parse(saved);
        if (s < STEPS.LOADING) { setStep(s); setAnswers(a); }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (step < STEPS.LOADING) {
      sessionStorage.setItem('glow_quizv2_state', JSON.stringify({ step, answers }));
    }
  }, [step, answers]);

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard');
  }, [user, isSubscribed, navigate]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if (step !== STEPS.LOADING) return;
    setLoadingProgress(0);
    const timers = [
      setTimeout(() => setLoadingProgress(30), 600),
      setTimeout(() => setLoadingProgress(65), 1300),
      setTimeout(() => setLoadingProgress(100), 2100),
    ];
    const done = setTimeout(() => {
      sessionStorage.removeItem('glow_quizv2_state');
      navigate('/quiz-results', { state: { answers } });
    }, 2800);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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
        .img-card { border:2px solid #e7e5e4; border-radius:16px; cursor:pointer; transition:all .2s; background:#fff; overflow:hidden; }
        .img-card:hover { border-color:#FB45A9; }
        .img-card.selected { border-color:#FB45A9; }
      `}</style>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ═══ ANCHOR ═══ */}
          {step === STEPS.ANCHOR && (
            <motion.div key="anchor" {...slide} className="max-w-lg mx-auto w-full px-4 pt-6 pb-6 flex flex-col gap-4">
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-stone-900 leading-snug mb-1">
                  {t('quiz.anchor.title')}
                </h1>
                <p className="text-base text-stone-500">{t('quiz.anchor.subtitle')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {HAIR_PROBLEMS_V2.map((opt, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                    <div className="w-full overflow-hidden" style={{ aspectRatio: '3/2', background: '#FFE4F2' }}>
                      <img
                        src={opt.img}
                        alt={opt.label}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="px-3 py-3.5 text-center">
                      <span className="text-sm font-semibold text-stone-700 leading-snug">{opt.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(STEPS.AGE)}
                className="btn-primary btn-pulse w-full py-6 text-base flex items-center justify-center gap-2"
              >
                {t('quiz.anchor.cta')}
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
              </button>

              <p className="text-sm text-stone-500 text-center leading-relaxed -mt-1">
                {t('quiz.anchor.reassurance')}
              </p>
            </motion.div>
          )}

          {/* ═══ AGE ═══ */}
          {step === STEPS.AGE && (
            <motion.div key="age" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={1} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.age.title')}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: '18_29',   label: t('quiz.options.age18'), emoji: '🌸' },
                  { value: '30_39',   label: t('quiz.options.age30'), emoji: '🌺' },
                  { value: '40_49',   label: t('quiz.options.age40'), emoji: '🌼' },
                  { value: '50_plus', label: t('quiz.options.age50'), emoji: '🌻' },
                ].map(opt => (
                  <QuizOption
                    key={opt.value}
                    {...opt}
                    selected={answers.age === opt.value}
                    onClick={() => { ans('age', opt.value); setStep(STEPS.HAIR_TYPE); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ HAIR TYPE ═══ */}
          {step === STEPS.HAIR_TYPE && (
            <motion.div key="hair-type" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={2} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.hairType.title')}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {HAIR_TYPES.map(opt => (
                  <div
                    key={opt.value}
                    className={`img-card ${answers.hairType === opt.value ? 'selected' : ''}`}
                    onClick={() => { ans('hairType', opt.value); setStep(STEPS.Q1); }}
                  >
                    <div className="w-full overflow-hidden" style={{ aspectRatio: '3/2', background: '#FFE4F2' }}>
                      <img
                        src={opt.img}
                        alt={opt.label}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="px-3 py-3.5 flex items-center justify-center gap-2">
                      <span className="text-sm font-semibold text-stone-700 text-center">{opt.label}</span>
                      {answers.hairType === opt.value && (
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#FB45A9' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ Q1 — wash frequency ═══ */}
          {step === STEPS.Q1 && (
            <motion.div key="q1" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={3} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.washFreq.title')}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'daily', label: t('quiz.options.washDaily'), emoji: '🚿', desc: t('quiz.options.washDailyDesc') },
                  { value: '3_4',   label: t('quiz.options.wash3_4'),   emoji: '📅', desc: t('quiz.options.wash3_4Desc') },
                  { value: '1_2',   label: t('quiz.options.wash1_2'),   emoji: '🌿', desc: t('quiz.options.wash1_2Desc') },
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

          {/* ═══ Q2 — water temperature ═══ */}
          {step === STEPS.Q2 && (
            <motion.div key="q2" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={4} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.waterTemp.title')}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'hot',  label: t('quiz.options.waterHot'),  emoji: '🔥', desc: t('quiz.options.waterHotDesc') },
                  { value: 'warm', label: t('quiz.options.waterWarm'), emoji: '💧', desc: t('quiz.options.waterWarmDesc') },
                  { value: 'cold', label: t('quiz.options.waterCold'), emoji: '❄️', desc: t('quiz.options.waterColdDesc') },
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

          {/* ═══ Q3 — heat tools ═══ */}
          {step === STEPS.Q3 && (
            <motion.div key="q3" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={5} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.heatTools.title')}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'daily',  label: t('quiz.options.heatDaily'),  emoji: '🔌', desc: t('quiz.options.heatDailyDesc') },
                  { value: 'few',    label: t('quiz.options.heatFew'),    emoji: '📆', desc: t('quiz.options.heatFewDesc') },
                  { value: 'rarely', label: t('quiz.options.heatRarely'), emoji: '🌬️', desc: t('quiz.options.heatRarelyDesc') },
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

          {/* ═══ Q4 — hydration ═══ */}
          {step === STEPS.Q4 && (
            <motion.div key="q4" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={6} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.hydration.title')}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'regularly', label: t('quiz.options.hydroRegularly'), emoji: '✅', desc: t('quiz.options.hydroRegularlyDesc') },
                  { value: 'sometimes', label: t('quiz.options.hydroSometimes'), emoji: '🔄', desc: t('quiz.options.hydroSometimesDesc') },
                  { value: 'never',     label: t('quiz.options.hydroNever'),     emoji: '❌', desc: t('quiz.options.hydroNeverDesc') },
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

          {/* ═══ Q5 — chemical products ═══ */}
          {step === STEPS.Q5 && (
            <motion.div key="q5" {...slide} className="max-w-lg mx-auto w-full px-4 pt-5 pb-6 flex flex-col gap-5">
              <ProgressBar current={7} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-stone-900 leading-snug">
                  {t('quiz.chemProducts.title')}
                </h2>
                <p className="text-sm text-stone-400 mt-2">{t('quiz.chemProducts.subtitle')}</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'yes_heavy', label: t('quiz.options.chemHeavy'), emoji: '⚗️', desc: t('quiz.options.chemHeavyDesc') },
                  { value: 'yes_mild',  label: t('quiz.options.chemMild'),  emoji: '🧴', desc: t('quiz.options.chemMildDesc') },
                  { value: 'no',        label: t('quiz.options.chemNo'),    emoji: '🌿', desc: t('quiz.options.chemNoDesc') },
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
              <ProgressBar current={8} total={TOTAL_QUIZ_STEPS} />
              <div className="text-center pt-6">
                <div className="text-5xl mb-4">🌿</div>
                <h2 className="text-2xl font-extrabold text-stone-900 mb-2">
                  {t('quiz.name.title')}
                </h2>
                <p className="text-base text-stone-500">
                  {t('quiz.name.subtitle')}
                </p>
              </div>
              <input
                type="text"
                placeholder={t('quiz.name.placeholder')}
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
                {t('quiz.name.cta')}
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
                <h2 className="text-2xl font-extrabold text-stone-900">{t('quiz.loading.title')}</h2>
                <p className="text-sm text-stone-400 mt-2">{t('quiz.loading.subtitle')}</p>
              </div>
              <div className="w-full space-y-4">
                {[
                  { label: t('quiz.loading.step1'), threshold: 30 },
                  { label: t('quiz.loading.step2'), threshold: 65 },
                  { label: t('quiz.loading.step3'), threshold: 100 },
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
