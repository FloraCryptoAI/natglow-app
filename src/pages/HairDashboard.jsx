import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import HairSpecialRecipe from '../components/hair/HairSpecialRecipe';
import HairRecipeDetail from '../components/hair/HairRecipeDetail';
import { HAIR_RECIPES } from '../lib/hairData';

const ESSENTIAL_IDS = ['babosa-mel', 'tratamento-noturno-oleo', 'maizena-acucar'];

const ESSENTIAL_DISPLAY = {
  'babosa-mel':              { emoji: '🌿', shortName: 'Babosa + Mel',          shortDesc: 'Hidratação profunda, brilho e fechamento de cutículas', star: true },
  'tratamento-noturno-oleo': { emoji: '🥥', shortName: 'Óleo de Coco + Rícino', shortDesc: 'Nutrição profunda noturna e fortalecimento dos fios' },
  'maizena-acucar':          { emoji: '🍋', shortName: 'Maizena + Açúcar',      shortDesc: 'Maciez intensa, brilho e selamento das cutículas' },
};

const SPECIAL_RECIPE = {
  name: 'Tônico para couro cabeludo com vinagre de maçã',
  description: 'Equilibra o pH, remove resíduos de produtos e estimula a circulação para um crescimento mais saudável.',
  ingredients: ['2 colheres de sopa de vinagre de maçã orgânico', '200ml de água', '5 gotas de óleo essencial de alecrim (opcional)'],
  instructions: 'Misture o vinagre na água. Após lavar o cabelo, aplique no couro cabeludo com massagem leve. Deixe agir 2 minutos e enxágue.',
  frequency: 'A cada 15 dias',
  benefits: ['Equilíbrio do pH', 'Redução de oleosidade', 'Estímulo ao crescimento', 'Couro cabeludo saudável'],
};

const DAILY_HABITS = [
  'Use água morna ou fria para lavar o cabelo',
  'Proteja o cabelo com protetor térmico antes de usar calor',
  'Durma com fronha de cetim ou seda para reduzir o atrito',
  'Hidrate-se bem — o cabelo reflete a saúde interna do corpo',
  'Penteie com cuidado, sempre de baixo para cima, sem puxar',
  'Evite prender o cabelo molhado — causa quebra',
];

const HABITS_TO_AVOID = [
  'Água quente no banho — resseca os fios e abre a cutícula',
  'Uso diário de secador ou chapinha sem proteção térmica',
  'Escovar o cabelo molhado com força — é quando ele está mais fraco',
  'Excesso de produtos químicos sem hidratação compensatória',
  'Prender muito apertado com elásticos de borracha',
];

const TAG_LABELS = {
  ultra:        { label: 'Ultra eficaz', color: 'bg-green-100 text-green-800 border border-green-200' },
  eficiente:    { label: 'Eficaz',       color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  complementar: { label: 'Complementar', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
};

function TagBadge({ tag }) {
  const t = TAG_LABELS[tag];
  if (!t) return null;
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${t.color}`}>{t.label}</span>;
}

export default function HairDashboard() {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const essentialRecipes = ESSENTIAL_IDS.map(id => HAIR_RECIPES.find(r => r.id === id)).filter(Boolean);

  if (selectedRecipe) {
    return <HairRecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <style>{`
        .bg-emerald-700 { background-color: #FB45A9 !important; }
        .bg-emerald-800 { background-color: #E03594 !important; }
        .bg-emerald-900 { background-color: #1A5A43 !important; }
        .text-emerald-700 { color: #FB45A9 !important; }
        .text-emerald-600 { color: #E03594 !important; }
        .text-emerald-200 { color: #B6EDD9 !important; }
        .border-emerald-300 { border-color: #FFB3DD !important; }
        .border-emerald-100 { border-color: #FFE4F2 !important; }
        .bg-emerald-50 { background-color: #FFF5FA !important; }
        .bg-emerald-100 { background-color: #FFE4F2 !important; }
        .from-emerald-700 { --tw-gradient-from: #FB45A9 !important; }
        .to-emerald-900 { --tw-gradient-to: #1A5A43 !important; }
      `}</style>

      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-3xl p-6 text-white">
        <p className="text-emerald-200 text-sm font-medium">Seu Plano de Recuperação</p>
        <h1 className="text-2xl font-bold mt-1">Rotina Capilar ✨</h1>
        <p className="text-emerald-200 text-sm mt-2 leading-relaxed">
          Plano estruturado para restaurar a saúde dos fios, controlar o frizz e prevenir a quebra com ingredientes naturais.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-emerald-200 text-xs">Foco atual</p>
            <p className="font-semibold mt-1 text-sm">Recuperação e hidratação</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-emerald-200 text-xs">Duração do Plano</p>
            <p className="font-semibold mt-1 text-sm">21 dias</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border-b border-stone-100 px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h2 className="text-lg font-bold text-stone-900">Método Essencial</h2>
          </div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">Comece por aqui</p>
          <p className="text-sm text-stone-500 leading-relaxed">
            Para melhores resultados, foque nessas 3 receitas. Elas são a base da recuperação capilar.
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {essentialRecipes.map((recipe) => {
            const disp = ESSENTIAL_DISPLAY[recipe.id] || {};
            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl flex-shrink-0">
                  {disp.emoji || '🌿'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-bold text-stone-800 text-sm">{disp.shortName || recipe.name}</p>
                    <TagBadge tag={recipe.tag} />
                    {disp.star && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
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
          <h3 className="font-semibold text-stone-800">Hábitos para Adotar</h3>
        </div>
        <ul className="space-y-2">
          {DAILY_HABITS.map((habit, i) => (
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
          <h3 className="font-semibold text-stone-800">Hábitos para Evitar</h3>
        </div>
        <ul className="space-y-2">
          {HABITS_TO_AVOID.map((habit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
              {habit}
            </li>
          ))}
        </ul>
      </div>

      <HairSpecialRecipe recipe={SPECIAL_RECIPE} />

      <div className="grid grid-cols-2 gap-3">
        <Link to="/HairPlan" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
          <Calendar className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="font-medium text-stone-800 text-sm">Plano Capilar</p>
          <p className="text-xs text-stone-400 mt-1">Guia semanal</p>
        </Link>
        <Link to="/HairRecipes" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
          <Sparkles className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="font-medium text-stone-800 text-sm">Receitas</p>
          <p className="text-xs text-stone-400 mt-1">Tratamentos naturais</p>
        </Link>
      </div>
    </div>
  );
}