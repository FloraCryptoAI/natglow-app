import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, AlertTriangle, Calendar, BookOpen, BarChart3, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData';

const PREVIEW_IDS = ['babosa-mel', 'oleo-coco-nutricao', 'abacate-azeite'];

function EfficiencyTag({ tag, tagLabels }) {
  const data = tagLabels[tag];
  if (!data) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${data.color}`}>{data.label}</span>;
}

export default function HairDiagnosis() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getRecipeById, tagLabels } = useTranslatedHairData();
  const [analyzing, setAnalyzing] = useState(true);
  const [completedSteps, setCompletedSteps] = useState([]);

  const analyzingSteps = [
    { label: t('hairDiagnosis.step1'), delay: 0 },
    { label: t('hairDiagnosis.step2'), delay: 900 },
    { label: t('hairDiagnosis.step3'), delay: 1800 },
    { label: t('hairDiagnosis.step4'), delay: 2700 },
  ];

  const PREVIEW_PLAN = [
    { day: 1, task: t('hairDiagnosis.day1Task') },
    { day: 3, task: t('hairDiagnosis.day3Task') },
    { day: 7, task: t('hairDiagnosis.day7Task') },
  ];

  const FIXED_ISSUES = [
    t('hairDiagnosis.signs.dry'),
    t('hairDiagnosis.signs.frizz'),
    t('hairDiagnosis.signs.breakage'),
  ];

  const FIXED_CAUSES = [
    t('hairDiagnosis.causes.daily'),
    t('hairDiagnosis.causes.hydration'),
  ];

  const PLAN_ITEMS = t('hairDiagnosis.planItems', { returnObjects: true });

  const planItemIcons = [Sparkles, Calendar, BookOpen, ListChecks, BarChart3];

  useEffect(() => {
    analyzingSteps.forEach(({ delay }, index) => {
      setTimeout(() => setCompletedSteps(prev => [...prev, index]), delay + 400);
    });
    setTimeout(() => setAnalyzing(false), 3800);
  }, []);

  const previewRecipes = PREVIEW_IDS.map(id => getRecipeById(id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex flex-col">

      <header className="bg-white/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link to="/Landing" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="NatGlow"
              className="w-10 h-10 rounded-2xl"
            />
            <span className="font-semibold text-stone-800">NatGlow</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {analyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-10 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-brand-pale flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">{t('hairDiagnosis.analyzing')}</h2>
                <p className="text-stone-500 text-sm mb-8">{t('hairDiagnosis.preparingPlan')}</p>
                <div className="space-y-3 text-left">
                  {analyzingSteps.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: completedSteps.includes(i) ? 1 : 0.3, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${completedSteps.includes(i) ? 'bg-brand-pale' : 'bg-stone-100'}`}>
                        {completedSteps.includes(i) ? (
                          <CheckCircle className="w-5 h-5 text-brand" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-stone-300" />
                        )}
                      </div>
                      <span className={`text-sm ${completedSteps.includes(i) ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
                        {s.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-br from-brand to-brand-light rounded-3xl p-7 text-white text-center">
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-2">{t('hairDiagnosis.planReady')}</p>
                  <h1 className="text-2xl font-bold leading-tight mb-1">{t('hairDiagnosis.planReadyTitle')}</h1>
                  <p className="text-white/80 text-sm">{t('hairDiagnosis.planReadySubtitle')}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{t('hairDiagnosis.signsLabel')}</p>
                  <div className="space-y-2">
                    {FIXED_ISSUES.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-stone-700 text-sm font-medium capitalize">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">{t('hairDiagnosis.causesLabel')}</p>
                      <ul className="space-y-1">
                        {FIXED_CAUSES.map((cause, i) => (
                          <li key={i} className="text-stone-700 text-sm leading-relaxed flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                            <span className="capitalize">{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{t('hairDiagnosis.planIncludes')}</p>
                  <div className="space-y-3">
                    {Array.isArray(PLAN_ITEMS) && PLAN_ITEMS.map((label, i) => {
                      const Icon = planItemIcons[i] || Sparkles;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-brand" />
                          </div>
                          <span className="text-stone-700 text-sm">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{t('hairDiagnosis.recipesLabel')}</p>
                  <div className="space-y-2">
                    {previewRecipes.map((recipe, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-stone-50 rounded-xl px-3 py-2.5">
                        <span className="text-stone-700 text-sm font-medium">{recipe.name}</span>
                        <EfficiencyTag tag={recipe.tag} tagLabels={tagLabels} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{t('hairDiagnosis.planPreview')}</p>
                  <div className="space-y-2">
                    {PREVIEW_PLAN.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-pale text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {item.day}
                        </div>
                        <span className="text-stone-700 text-sm">{item.task}</span>
                      </div>
                    ))}
                    <p className="text-xs text-stone-400 text-center pt-1">{t('hairDiagnosis.moreDays')}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-brand to-brand-light rounded-3xl p-7 text-center text-white shadow-xl">
                  <h3 className="text-lg font-bold mb-2 leading-snug">{t('hairDiagnosis.startTitle')}</h3>
                  <p className="text-white/80 text-sm mb-6 leading-relaxed">
                    {t('hairDiagnosis.startSubtitle')}
                  </p>
                  <Button
                    onClick={() => navigate('/HairDashboard')}
                    className="w-full bg-white text-brand hover:bg-brand-bg rounded-full py-5 text-base font-bold shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      {t('hairDiagnosis.startCta')}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Button>
                  <p className="text-white/60 text-xs mt-3">{t('hairDiagnosis.startHelper')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
