import React, { useState } from 'react';
import { motion } from 'framer-motion';
import HairRecipeDetail from '../components/hair/HairRecipeDetail';
import { Star } from 'lucide-react';
import { HAIR_RECIPES, HAIR_INGREDIENTS, TAG_LABELS } from '../lib/hairData';

const ESSENTIAL_IDS = ['babosa-mel', 'tratamento-noturno-oleo', 'maizena-acucar'];

const ESSENTIAL_DISPLAY = {
  'babosa-mel':              { emoji: '🌿', shortName: 'Babosa + Mel',          shortDesc: 'Hidratação profunda, brilho e fechamento de cutículas', star: true },
  'tratamento-noturno-oleo': { emoji: '🥥', shortName: 'Óleo de Coco + Rícino', shortDesc: 'Nutrição profunda noturna e fortalecimento dos fios' },
  'maizena-acucar':          { emoji: '🍋', shortName: 'Maizena + Açúcar',      shortDesc: 'Maciez intensa, brilho e selamento das cutículas' },
};

function EfficiencyTag({ tag }) {
  const t = TAG_LABELS[tag];
  if (!t) return null;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${t.color}`}>
      {t.label}
    </span>
  );
}

export default function HairRecipes() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const essentialRecipes = ESSENTIAL_IDS.map(id => HAIR_RECIPES.find(r => r.id === id)).filter(Boolean);

  const toggleIngredient = (name) => {
    setSelectedIngredients(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const filteredRecipes = selectedIngredients.length === 0
    ? HAIR_RECIPES
    : HAIR_RECIPES.filter(recipe =>
        selectedIngredients.every(sel =>
          recipe.ingredients.some(ing => ing.toLowerCase().includes(sel.split(' ')[0].toLowerCase()))
        )
      );

  if (selectedRecipe) {
    return <HairRecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <div className="space-y-6 pb-8">

      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Receitas Naturais</h1>
        <p className="text-stone-500 mt-1">Biblioteca curada de {HAIR_RECIPES.length} receitas · Selecione ingredientes para filtrar</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-amber-50 to-brand-bg border-b border-stone-100 px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h2 className="text-base font-bold text-stone-900">Comece por essas</h2>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">
            Se você fizer apenas essas receitas, já verá diferença real no seu cabelo.
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {essentialRecipes.map(recipe => {
            const t = TAG_LABELS[recipe.tag];
            const disp = ESSENTIAL_DISPLAY[recipe.id] || {};
            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-full bg-brand-bg border border-brand-pale flex items-center justify-center text-xl flex-shrink-0">
                  {disp.emoji || '🌿'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-bold text-stone-800 text-sm">{disp.shortName || recipe.name}</p>
                    {t && <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${t.color}`}>{t.label}</span>}
                    {disp.star && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-stone-400 leading-snug">{disp.shortDesc || recipe.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Filtrar por ingrediente
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {HAIR_INGREDIENTS.map((ing) => {
            const active = selectedIngredients.includes(ing.name);
            return (
              <button
                key={ing.name}
                onClick={() => toggleIngredient(ing.name)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left w-full ${
                  active
                    ? 'border-brand bg-brand-bg'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <span className="text-xl flex-shrink-0">{ing.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-tight truncate ${active ? 'text-brand-dark' : 'text-stone-700'}`}>
                    {ing.name.split(' ')[0]}
                  </p>
                  <div className="mt-1">
                    <EfficiencyTag tag={ing.tag} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {selectedIngredients.length > 0 && (
          <button
            onClick={() => setSelectedIngredients([])}
            className="mt-2 text-xs text-stone-400 hover:text-stone-600 transition-colors mt-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">
          {filteredRecipes.length} receita{filteredRecipes.length !== 1 ? 's' : ''} disponíve{filteredRecipes.length !== 1 ? 'is' : 'l'}
        </h2>
        {filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center">
            <p className="text-stone-400 text-sm">Nenhuma receita com esses ingredientes combinados.</p>
            <button onClick={() => setSelectedIngredients([])} className="mt-2 text-brand text-sm font-medium">
              Ver todas as receitas
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredRecipes.map((recipe, i) => (
              <motion.button
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedRecipe(recipe)}
                className="bg-white rounded-2xl p-5 border border-stone-200 text-left hover:border-brand-light hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">{recipe.category}</p>
                  <EfficiencyTag tag={recipe.tag} />
                </div>
                <h3 className="font-semibold text-stone-800 mb-1 leading-snug">{recipe.name}</h3>
                <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{recipe.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-stone-400">
                  <span>⏱ {recipe.duration_minutes} min</span>
                  <span>🔄 {recipe.frequency}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}