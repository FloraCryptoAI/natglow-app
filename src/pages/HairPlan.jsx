import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, RotateCcw, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HairRecipeDetail from '../components/hair/HairRecipeDetail';
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData';
import { useHairPlan } from '@/hooks/useHairPlan';

const PHASE_RECIPE_IDS = {
  1: [
    { id: 'babosa-mel',              emoji: '🌿', tag: 'ultra' },
    { id: 'tratamento-noturno-oleo', emoji: '🥥', tag: 'ultra' },
    { id: 'maizena-acucar',          emoji: '🍋', tag: 'eficiente' },
  ],
  2: [
    { id: 'ovo-mel',      emoji: '🥚', tag: 'eficiente' },
    { id: 'iogurte-ovo',  emoji: '🥛', tag: 'eficiente' },
    { id: 'abacate-coco', emoji: '🥑', tag: 'ultra' },
  ],
  3: [
    { id: 'cebola-crescimento', emoji: '🧅', tag: 'complementar' },
    { id: 'cafe-estimulo',      emoji: '☕', tag: 'complementar' },
    { id: 'babosa-cebola',      emoji: '🌿', tag: 'eficiente' },
  ],
  4: [
    { id: 'babosa-pura',            emoji: '🪴', tag: 'ultra' },
    { id: 'mascara-manutencao',     emoji: '🍯', tag: 'eficiente' },
    { id: 'oleo-argan-finalizacao', emoji: '🥥', tag: 'complementar' },
  ],
};

const PHASE_COLORS = {
  1: 'from-brand to-brand-light',
  2: 'from-blue-600 to-blue-800',
  3: 'from-violet-600 to-violet-800',
  4: 'from-amber-500 to-amber-700',
};

function TagBadge({ tag, tagLabels }) {
  const data = tagLabels[tag];
  if (!data) return null;
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${data.color}`}>{data.label}</span>;
}

function WeekCard({ weekNum, phaseNum, phaseRecipeIds, completed, onToggle, onSelectRecipe, t, tagLabels, getRecipeById }) {
  const [open, setOpen] = useState(false);
  const gradient = PHASE_COLORS[phaseNum];

  const focus = t(`hairPlan.phases.${phaseNum}.weeks.${weekNum}.focus`);
  const desc = t(`hairPlan.phases.${phaseNum}.weeks.${weekNum}.desc`);
  const habits = t(`hairPlan.phases.${phaseNum}.weeks.${weekNum}.habits`, { returnObjects: true });

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${completed ? 'border-green-300 bg-green-50/30' : 'border-stone-200 bg-white'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50/50 transition-all text-left"
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${gradient} flex-shrink-0`}>
          {completed ? <Check className="w-4 h-4" /> : weekNum}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800">{t('hairPlan.weekLabel', { n: weekNum })}</p>
          <p className="text-xs text-stone-400">{focus}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-stone-100">
              <p className="text-sm text-stone-500 leading-relaxed pt-4">{desc}</p>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{t('hairPlan.recipesThisWeek')}</p>
                <div className="space-y-2">
                  {phaseRecipeIds.map(item => {
                    const recipe = getRecipeById(item.id);
                    if (!recipe) return null;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectRecipe(recipe)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 hover:border-brand-light hover:bg-brand-bg transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-brand-bg border border-brand-pale flex items-center justify-center text-lg flex-shrink-0">
                          {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-700">{recipe.name}</p>
                          <p className="text-xs text-stone-400">{recipe.duration_minutes >= 60 ? '🌙' : `${recipe.duration_minutes} min`} · {recipe.frequency}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <TagBadge tag={item.tag} tagLabels={tagLabels} />
                          <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{t('hairPlan.habitsThisWeek')}</p>
                <ul className="space-y-2">
                  {Array.isArray(habits) && habits.map((habit, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-2 flex-shrink-0" />
                      {habit}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => { onToggle(); setOpen(false); }}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  completed ? 'bg-stone-100 text-stone-500' : 'bg-brand text-white hover:bg-brand-dark'
                }`}
              >
                {completed
                  ? <><Check className="w-4 h-4" /> {t('hairPlan.weekCompleted')}</>
                  : t('hairPlan.markComplete')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HairPlan() {
  const { t } = useTranslation();
  const { phases, tagLabels, getRecipeById } = useTranslatedHairData();
  const { planState, updatePlanState, loading } = useHairPlan();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showReset, setShowReset] = useState(false);

  const { phase, completedWeeks } = planState;
  const phaseData = phases[phase - 1];
  const phaseRecipes = PHASE_RECIPE_IDS[phase] || PHASE_RECIPE_IDS[1];

  const toggleWeek = (weekNum) => {
    let newCompleted = completedWeeks.includes(weekNum)
      ? completedWeeks.filter(w => w !== weekNum)
      : [...completedWeeks, weekNum];

    let newPhase = phase;
    if (newCompleted.length >= 3 && phase < 4) {
      newPhase = phase + 1;
      newCompleted = [];
    }

    updatePlanState({ phase: newPhase, completedWeeks: newCompleted });
  };

  const resetPlan = () => {
    updatePlanState({ phase: 1, completedWeeks: [] });
    setShowReset(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-4 border-stone-200 border-t-brand rounded-full animate-spin" /></div>;

  if (selectedRecipe) {
    return <HairRecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  const gradient = PHASE_COLORS[phase];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{t('hairPlan.title')}</h1>
        <p className="text-stone-500 mt-1">{t('hairPlan.subtitle')}</p>
      </div>

      <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{phaseData?.emoji}</span>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">{t('hairPlan.phaseLabel', { n: phase })}</p>
        </div>
        <h2 className="text-xl font-bold">{phaseData?.name}</h2>
        <p className="text-white/70 text-sm mt-1 leading-relaxed">{phaseData?.description}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">{t('hairPlan.weeksCompleted')}</span>
            <span className="text-white/60">{completedWeeks.length}/3</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${(completedWeeks.length / 3) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map(weekNum => (
          <WeekCard
            key={weekNum}
            weekNum={weekNum}
            phaseNum={phase}
            phaseRecipeIds={phaseRecipes}
            completed={completedWeeks.includes(weekNum)}
            onToggle={() => toggleWeek(weekNum)}
            onSelectRecipe={setSelectedRecipe}
            t={t}
            tagLabels={tagLabels}
            getRecipeById={getRecipeById}
          />
        ))}
      </div>

      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">💡 {t('hairPlan.reminder')}</p>
        <p className="text-sm text-stone-600 leading-relaxed">{t('hairPlan.reminderText')}</p>
      </div>

      <div className="text-center">
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3 h-3" />
            {t('hairPlan.restart')}
          </button>
        ) : (
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-center space-y-3">
            <p className="text-sm text-stone-700 font-medium">{t('hairPlan.restartConfirmTitle')}</p>
            <p className="text-xs text-stone-400">{t('hairPlan.restartConfirmText')}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowReset(false)} className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-100 transition-all">
                {t('common.cancel')}
              </button>
              <button onClick={resetPlan} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all">
                {t('hairPlan.confirmRestart')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
