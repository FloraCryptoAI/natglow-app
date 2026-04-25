import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HairSpecialRecipe({ recipe }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!recipe) return null;

  return (
    <div className="rounded-3xl overflow-hidden shadow-lg border border-amber-100">
      <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-white text-xs font-semibold uppercase tracking-wider">{t('hairSpecialRecipe.label')}</span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">{recipe.name}</h3>
        {recipe.frequency && (
          <p className="text-amber-100 text-xs mt-1">{recipe.frequency}</p>
        )}
      </div>

      <div className="bg-white p-5">
        {recipe.description && (
          <p className="text-stone-600 text-sm leading-relaxed mb-4">{recipe.description}</p>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-amber-600 text-sm font-medium"
        >
          {expanded ? (
            <>{t('hairSpecialRecipe.hideFull')} <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>{t('hairSpecialRecipe.showFull')} <ChevronDown className="w-4 h-4" /></>
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{t('hairSpecialRecipe.ingredients')}</p>
                <ul className="space-y-1">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recipe.instructions && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{t('hairSpecialRecipe.howToPrepare')}</p>
                <p className="text-stone-600 text-sm leading-relaxed">{recipe.instructions}</p>
              </div>
            )}
            {recipe.benefits && recipe.benefits.length > 0 && (
              <div className="space-y-1 pt-2">
                {recipe.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-stone-500">{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
