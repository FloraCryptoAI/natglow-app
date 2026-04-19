import React from 'react';
import { ArrowLeft, Clock, Leaf, Heart, Repeat, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RecipeDetail({ recipe, onBack }) {
  return (
    <div className="space-y-6 pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às receitas
      </button>

      <div>
        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">{recipe.category}</p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{recipe.name}</h1>
        <p className="text-stone-500 mt-2 leading-relaxed">{recipe.description}</p>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span>{recipe.duration_minutes} min</span>
        </div>
        {recipe.frequency && (
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Repeat className="w-4 h-4 text-indigo-600" />
            </div>
            <span>{recipe.frequency}</span>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-stone-800">Ingredientes</h2>
        </div>
        <ul className="space-y-2">
          {recipe.ingredients?.map((ing, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {ing}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <h2 className="font-semibold text-stone-800 mb-3">Como Preparar</h2>
        <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{recipe.instructions}</p>
      </div>

      {recipe.benefits && recipe.benefits.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-stone-800">Benefícios</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recipe.benefits.map((b, i) => (
              <span key={i} className="text-xs bg-white text-stone-600 px-3 py-1.5 rounded-full border border-amber-200">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {recipe.tips && (
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-stone-500" />
            <h2 className="font-semibold text-stone-800">Dica</h2>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">{recipe.tips}</p>
        </div>
      )}

      {recipe.skin_types && recipe.skin_types.length > 0 && (
        <div className="text-sm text-stone-400">
          Indicado para: {recipe.skin_types.join(', ')}
        </div>
      )}
    </div>
  );
}