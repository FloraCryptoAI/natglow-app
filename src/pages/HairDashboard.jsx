import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HairSpecialRecipe from '../components/hair/HairSpecialRecipe';
import HairRecipeDetail from '../components/hair/HairRecipeDetail';
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData';

const ESSENTIAL_IDS = ['babosa-mel', 'tratamento-noturno-oleo', 'maizena-acucar'];
const ESSENTIAL_EMOJIS = { 'babosa-mel': '🌿', 'tratamento-noturno-oleo': '🥥', 'maizena-acucar': '🍋' };
const ESSENTIAL_STAR = { 'babosa-mel': true };

function TagBadge({ tag, tagLabels }) {
  const data = tagLabels[tag];
  if (!data) return null;
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${data.color}`}>{data.label}</span>;
}

export default function HairDashboard() {
  const { t } = useTranslation();
  const { getRecipeById, tagLabels } = useTranslatedHairData();
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const essentialRecipes = ESSENTIAL_IDS.map(id => getRecipeById(id)).filter(Boolean);
  const essentialDisplay = t('hairDashboard.essentialRecipes', { returnObjects: true });
  const dailyHabits = t('hairDashboard.dailyHabits', { returnObjects: true });
  const habitsToAvoid = t('hairDashboard.habitsToAvoid', { returnObjects: true });
  const specialRecipe = t('hairDashboard.specialRecipe', { returnObjects: true });

  if (selectedRecipe) {
    return <HairRecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-gradient-to-br from-brand to-brand-light rounded-3xl p-6 text-white">
        <p className="text-white/80 text-sm font-medium">{t('hairDashboard.planLabel')}</p>
        <h1 className="text-2xl font-bold mt-1">{t('hairDashboard.title')}</h1>
        <p className="text-white/80 text-sm mt-2 leading-relaxed">
          {t('hairDashboard.subtitle')}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white/80 text-xs">{t('hairDashboard.focusLabel')}</p>
            <p className="font-semibold mt-1 text-sm">{t('hairDashboard.focusValue')}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white/80 text-xs">{t('hairDashboard.durationLabel')}</p>
            <p className="font-semibold mt-1 text-sm">{t('hairDashboard.durationValue')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-brand-bg to-white border-b border-stone-100 px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h2 className="text-lg font-bold text-stone-900">{t('hairDashboard.essentialTitle')}</h2>
          </div>
          <p className="text-xs font-semibold text-brand mb-1">{t('hairDashboard.essentialLabel')}</p>
          <p className="text-sm text-stone-500 leading-relaxed">
            {t('hairDashboard.essentialSubtitle')}
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {essentialRecipes.map((recipe) => {
            const disp = essentialDisplay[recipe.id] || {};
            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-full bg-brand-bg border border-brand-pale flex items-center justify-center text-xl flex-shrink-0">
                  {ESSENTIAL_EMOJIS[recipe.id] || '🌿'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-bold text-stone-800 text-sm">{disp.shortName || recipe.name}</p>
                    <TagBadge tag={recipe.tag} tagLabels={tagLabels} />
                    {ESSENTIAL_STAR[recipe.id] && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-stone-400 leading-snug">{disp.shortDesc || recipe.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-stone-800">{t('hairDashboard.habitsAdopt')}</h3>
        </div>
        <ul className="space-y-2">
          {Array.isArray(dailyHabits) && dailyHabits.map((habit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
              {habit}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-stone-800">{t('hairDashboard.habitsAvoid')}</h3>
        </div>
        <ul className="space-y-2">
          {Array.isArray(habitsToAvoid) && habitsToAvoid.map((habit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
              {habit}
            </li>
          ))}
        </ul>
      </div>

      <HairSpecialRecipe recipe={specialRecipe} />

      <div className="grid grid-cols-2 gap-3">
        <Link to="/HairPlan" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-brand-light hover:bg-brand-bg transition-all">
          <Calendar className="w-6 h-6 text-brand mb-2" />
          <p className="font-medium text-stone-800 text-sm">{t('hairDashboard.navPlan')}</p>
          <p className="text-xs text-stone-400 mt-1">{t('hairDashboard.navPlanSub')}</p>
        </Link>
        <Link to="/HairRecipes" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-brand-light hover:bg-brand-bg transition-all">
          <Sparkles className="w-6 h-6 text-brand mb-2" />
          <p className="font-medium text-stone-800 text-sm">{t('hairDashboard.navRecipes')}</p>
          <p className="text-xs text-stone-400 mt-1">{t('hairDashboard.navRecipesSub')}</p>
        </Link>
      </div>
    </div>
  );
}
