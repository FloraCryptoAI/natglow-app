import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

export default function HairWeeklyCard({ mask }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-stone-800 text-sm">{mask.name}</h3>
            {mask.frequency && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                {mask.frequency}
              </span>
            )}
          </div>
          {mask.description && (
            <p className="text-stone-500 text-xs leading-relaxed">{mask.description}</p>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0 ml-3" /> : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0 ml-3" />}
      </button>

      {expanded && mask.recipe && (
        <div className="px-5 pb-5 border-t border-stone-50 space-y-4 pt-4">
          {mask.recipe.ingredients && mask.recipe.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Ingredientes</p>
              <ul className="space-y-1">
                {mask.recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mask.recipe.instructions && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Como preparar</p>
              <p className="text-stone-600 text-sm leading-relaxed">{mask.recipe.instructions}</p>
            </div>
          )}
          {mask.recipe.time && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 inline-block">
              ⏱ Tempo: {mask.recipe.time}
            </p>
          )}
          {mask.benefits && mask.benefits.length > 0 && (
            <div className="space-y-1">
              {mask.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-stone-500">{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}