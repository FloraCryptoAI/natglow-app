import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/AuthContext';

const P    = '#FB45A9';
const PD   = '#E03594';
const PL   = '#FFF5FA';
const PL2  = '#FFE4F2';
const GRAD = 'linear-gradient(135deg, #FB45A9, #E03594)';
const ease = [0.22, 1, 0.36, 1];

const BEFORE_AFTER = [
  { antes: '/images/quiz-v2/antes-1.jpg', depois: '/images/quiz-v2/depois-1.jpg' },
  { antes: '/images/quiz-v2/antes-2.jpg', depois: '/images/quiz-v2/depois-2.jpg' },
  { antes: '/images/quiz-v2/antes-3.jpg', depois: '/images/quiz-v2/depois-3.jpg' },
];

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

export default function QuizResultsV2() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [currentPair, setCurrentPair] = useState(0);

  useEffect(() => {
    if (!state?.answers) navigate('/quiz', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    if (user && isSubscribed) navigate('/HairDashboard', { replace: true });
  }, [user, isSubscribed, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPair(p => (p + 1) % BEFORE_AFTER.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!state?.answers) return null;

  const { answers } = state;
  const { signs, causes } = getDiagnosis(answers, t);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── DIAGNOSIS ── */}
      <section className="bg-white">
        <div className="max-w-xl mx-auto px-6 pt-10 pb-10 flex flex-col gap-4">
          <div className="flex justify-center mb-4">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full"
              style={{ background: PL, color: PD, border: `1px solid ${PL2}` }}
            >
              {t('results.hero.badge')}
            </div>
          </div>

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
        </div>
      </section>

      {/* ── BEFORE & AFTER ── */}
      <section style={{ background: PL }}>
        <div className="max-w-xl mx-auto px-6 py-14 flex flex-col gap-8">
          <FadeIn>
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 leading-[1.1] tracking-tight mb-3">
                {t('quiz.beforeAfter.title')}
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
                {t('quiz.beforeAfter.subtitle')}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPair}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-center text-stone-400 uppercase tracking-widest">
                      {t('quiz.beforeAfter.before')}
                    </span>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', background: PL2 }}>
                      <img
                        src={BEFORE_AFTER[currentPair].antes}
                        alt={t('quiz.beforeAfter.before')}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-center uppercase tracking-widest" style={{ color: PD }}>
                      {t('quiz.beforeAfter.after')}
                    </span>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', background: PL2 }}>
                      <img
                        src={BEFORE_AFTER[currentPair].depois}
                        alt={t('quiz.beforeAfter.after')}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-5">
                {BEFORE_AFTER.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPair(i)}
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{ background: i === currentPair ? PD : PL2 }}
                  />
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.14}>
            <motion.button
              onClick={() => navigate('/quiz-sales', { state: { answers } })}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full py-5 font-extrabold text-white flex items-center justify-center gap-3 rounded-full"
              style={{
                background: GRAD,
                boxShadow: '0 4px 24px rgba(251,69,169,0.4)',
                fontSize: '0.95rem',
              }}
            >
              <span className="text-center leading-snug uppercase tracking-wide">
                {t('quiz.beforeAfter.cta')}
              </span>
            </motion.button>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
