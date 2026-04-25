import { useTranslation } from 'react-i18next';
import {
  HAIR_RECIPES as BASE_RECIPES,
  HAIR_INGREDIENTS as BASE_INGREDIENTS,
  HAIR_PHASES as BASE_PHASES,
  PHASE_PLANS as BASE_PHASE_PLANS,
  TAG_LABELS as BASE_TAG_LABELS,
  DAY_TYPE_LABELS as BASE_DAY_TYPE_LABELS,
} from '../lib/hairData';
import * as enText from '../locales/hairDataText.en';
import * as esText from '../locales/hairDataText.es';

export function useTranslatedHairData() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'es' ? esText : enText;

  const recipes = BASE_RECIPES.map(r => ({
    ...r,
    ...(lang.RECIPE_TEXT[r.id] || {}),
  }));

  const ingredients = BASE_INGREDIENTS.map(ing => {
    const translated = lang.INGREDIENT_TEXT[ing.name];
    if (!translated) return ing;
    return { ...ing, name: translated.name, benefits: translated.benefits };
  });

  const phases = BASE_PHASES.map(phase => {
    const translated = lang.PHASE_TEXT[phase.id];
    if (!translated) return phase;
    return { ...phase, ...translated };
  });

  const phasePlans = {};
  Object.keys(BASE_PHASE_PLANS).forEach(phaseKey => {
    const phaseNum = parseInt(phaseKey);
    const translatedTasks = lang.PHASE_PLAN_TEXT[phaseNum] || [];
    phasePlans[phaseNum] = BASE_PHASE_PLANS[phaseNum].map((day, i) => ({
      ...day,
      task: translatedTasks[i]?.task || day.task,
    }));
  });

  const tagLabels = {};
  Object.keys(BASE_TAG_LABELS).forEach(key => {
    tagLabels[key] = {
      ...BASE_TAG_LABELS[key],
      label: lang.TAG_TEXT[key] || BASE_TAG_LABELS[key].label,
    };
  });

  const dayTypeLabels = {};
  Object.keys(BASE_DAY_TYPE_LABELS).forEach(key => {
    dayTypeLabels[key] = {
      ...BASE_DAY_TYPE_LABELS[key],
      label: lang.DAY_TYPE_TEXT[key] || BASE_DAY_TYPE_LABELS[key].label,
    };
  });

  const weekDescriptions = lang.WEEK_DESCRIPTIONS || {};

  return {
    recipes,
    ingredients,
    phases,
    phasePlans,
    tagLabels,
    dayTypeLabels,
    weekDescriptions,
    getRecipeById: (id) => recipes.find(r => r.id === id),
  };
}
