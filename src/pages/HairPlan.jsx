import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, RotateCcw, ArrowRight } from 'lucide-react';
import HairRecipeDetail from '../components/hair/HairRecipeDetail';
import { HAIR_RECIPES, HAIR_PHASES } from '../lib/hairData';

function loadPlanState() {
  try {
    const saved = localStorage.getItem('hairPlanState');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { phase: 1, completedWeeks: [] };
}
function savePlanState(state) {
  localStorage.setItem('hairPlanState', JSON.stringify(state));
}

const PHASE_RECIPES = {
  1: [
    { id: 'babosa-mel',              emoji: '🌿', shortName: 'Babosa + Mel',          tag: 'ultra' },
    { id: 'tratamento-noturno-oleo', emoji: '🥥', shortName: 'Óleo de Coco + Rícino', tag: 'ultra' },
    { id: 'maizena-acucar',          emoji: '🍋', shortName: 'Maizena + Açúcar',      tag: 'eficiente' },
  ],
  2: [
    { id: 'ovo-mel',      emoji: '🥚', shortName: 'Ovo + Mel',       tag: 'eficiente' },
    { id: 'iogurte-ovo',  emoji: '🥛', shortName: 'Iogurte + Ovo',   tag: 'eficiente' },
    { id: 'abacate-coco', emoji: '🥑', shortName: 'Abacate + Coco',  tag: 'ultra' },
  ],
  3: [
    { id: 'cebola-crescimento', emoji: '🧅', shortName: 'Tônico de Cebola', tag: 'complementar' },
    { id: 'cafe-estimulo',      emoji: '☕', shortName: 'Café + Azeite',    tag: 'complementar' },
    { id: 'babosa-cebola',      emoji: '🌿', shortName: 'Babosa + Cebola',  tag: 'eficiente' },
  ],
  4: [
    { id: 'babosa-pura',            emoji: '🪴', shortName: 'Babosa Pura',   tag: 'ultra' },
    { id: 'mascara-manutencao',     emoji: '🍯', shortName: 'Mel + Iogurte', tag: 'eficiente' },
    { id: 'oleo-argan-finalizacao', emoji: '🥥', shortName: 'Óleo de Coco', tag: 'complementar' },
  ],
};

const WEEKLY_PLANS = {
  1: [
    { week: 1, focus: 'Hidratação inicial', description: 'O primeiro passo é restaurar a umidade perdida. Faça pelo menos 1 receita esta semana.', habits: ['Use água morna ou fria para lavar o cabelo', 'Hidrate-se bem — o cabelo reflete a saúde interna', 'Evite prender o cabelo molhado', 'Evite uso excessivo de calor'] },
    { week: 2, focus: 'Hidratação intensa', description: 'Com 2 aplicações essa semana, os fios começam a se recuperar visivelmente.', habits: ['Finalize o banho com água fria por 30 segundos', 'Evite o secador — deixe secar naturalmente quando possível', 'Durma com o cabelo solto', 'Continue bebendo bastante água'] },
    { week: 3, focus: 'Consolidação e brilho', description: 'Consolide os hábitos e observe os resultados. Tire uma foto para comparar!', habits: ['Mantenha os hábitos das semanas anteriores', 'Observe a diferença no brilho e na maciez', 'Evite secador, chapinha e elásticos com metal', 'Tire uma foto para comparar com o início 📸'] },
  ],
  2: [
    { week: 1, focus: 'Reconstrução proteica', description: 'Foco em fortalecer a fibra capilar com proteínas. O ovo e iogurte são excelentes para isso.', habits: ['Continue com água morna ou fria', 'Evite elásticos que puxam o cabelo', 'Corte as pontas duplas se houver', 'Evite calor excessivo'] },
    { week: 2, focus: 'Nutrição e selagem', description: 'Nutra os fios por dentro. O brilho começa a aparecer com consistência.', habits: ['Durma com trança solta para reduzir quebra noturna', 'Aplique óleo de coco nas pontas antes de dormir', 'Beba 2L de água por dia', 'Evite chapinha ou secador esta semana'] },
    { week: 3, focus: 'Consolidação do fortalecimento', description: 'A quebra deve reduzir. Continue com constância e celebre o progresso.', habits: ['Observe a redução na quebra ao escovar', 'Mantenha os hábitos das semanas anteriores', 'Continue evitando calor', 'Hidrate-se bem internamente'] },
  ],
  3: [
    { week: 1, focus: 'Estimulação do couro cabeludo', description: 'Couro cabeludo saudável cresce mais. Massageie e cuide da raiz diariamente.', habits: ['Massageie o couro cabeludo por 5 min antes de dormir', 'Beba 2L de água por dia', 'Evite prender o cabelo com tensão', 'Alimente-se bem — vitaminas fazem diferença'] },
    { week: 2, focus: 'Nutrição da raiz', description: 'Foco nos folículos. O crescimento começa a acelerar com nutrição certa.', habits: ['Continue com massagem capilar diária', 'Evite prender muito apertado', 'Use água fria no final do banho', 'Durma com o cabelo solto'] },
    { week: 3, focus: 'Crescimento acelerado', description: 'Com consistência, o crescimento fica visível. Mantenha o ritmo.', habits: ['Massageie o couro cabeludo com as pontas dos dedos por 5 min', 'Beba 2L de água por dia', 'Evite elásticos que puxam', 'Continue com os tratamentos semanais'] },
  ],
  4: [
    { week: 1, focus: 'Manutenção leve', description: 'Você chegou ao estado ideal. Mantenha com consistência simples.', habits: ['Aplique babosa pura nos fios como hidratante leve', 'Mantenha água fria no final do banho', 'Óleo de coco nas pontas antes de dormir', 'Hidrate-se bem internamente'] },
    { week: 2, focus: 'Continuidade', description: 'Mantenha os resultados conquistados com hábitos simples e eficazes.', habits: ['Hidratação leve semanal com as receitas base', 'Evite calor excessivo', 'Durma com cabelo solto em travesseiro limpo', 'Massageie o couro cabeludo por 3 minutos'] },
    { week: 3, focus: 'Evolução contínua', description: 'Você está em manutenção plena. Continue evoluindo com consistência.', habits: ['Aplique mel puro nas pontas por 15 min antes de lavar', 'Evite prender muito apertado', 'Mantenha os hábitos aprendidos nas fases anteriores', 'Celebre os resultados conquistados! 🎉'] },
  ],
};

const PHASE_COLORS = {
  1: 'from-emerald-600 to-emerald-800',
  2: 'from-blue-600 to-blue-800',
  3: 'from-violet-600 to-violet-800',
  4: 'from-amber-500 to-amber-700',
};

const TAG_LABELS = {
  ultra:        { label: 'Ultra eficaz', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  eficiente:    { label: 'Eficaz',       color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  complementar: { label: 'Complementar', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
};

function TagBadge({ tag }) {
  const t = TAG_LABELS[tag];
  if (!t) return null;
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${t.color}`}>{t.label}</span>;
}

function WeekCard({ weekData, phaseRecipes, phaseNum, completed, onToggle, onSelectRecipe }) {
  const [open, setOpen] = useState(false);
  const gradient = PHASE_COLORS[phaseNum];

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${completed ? 'border-emerald-300 bg-emerald-50/30' : 'border-stone-200 bg-white'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50/50 transition-all text-left"
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${gradient} flex-shrink-0`}>
          {completed ? <Check className="w-4 h-4" /> : weekData.week}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800">Semana {weekData.week}</p>
          <p className="text-xs text-stone-400">{weekData.focus}</p>
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
              <p className="text-sm text-stone-500 leading-relaxed pt-4">{weekData.description}</p>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Receitas desta semana</p>
                <div className="space-y-2">
                  {phaseRecipes.map(item => {
                    const recipe = HAIR_RECIPES.find(r => r.id === item.id);
                    if (!recipe) return null;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectRecipe(recipe)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-lg flex-shrink-0">
                          {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-700">{item.shortName}</p>
                          <p className="text-xs text-stone-400">{recipe.duration_minutes >= 60 ? 'Durante a noite' : `${recipe.duration_minutes} min`} · {recipe.frequency}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <TagBadge tag={item.tag} />
                          <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Hábitos desta semana</p>
                <ul className="space-y-2">
                  {weekData.habits.map((habit, i) => (
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
                  completed ? 'bg-stone-100 text-stone-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {completed ? <><Check className="w-4 h-4" /> Semana concluída</> : <>Marcar semana como concluída</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HairPlan() {
  const [planState, setPlanState] = useState(() => loadPlanState());
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showReset, setShowReset] = useState(false);

  const { phase, completedWeeks } = planState;
  const phaseData = HAIR_PHASES[phase - 1];
  const weeklyPlan = WEEKLY_PLANS[phase] || WEEKLY_PLANS[1];
  const phaseRecipes = PHASE_RECIPES[phase] || PHASE_RECIPES[1];

  const toggleWeek = (weekNum) => {
    let newCompleted = completedWeeks.includes(weekNum)
      ? completedWeeks.filter(w => w !== weekNum)
      : [...completedWeeks, weekNum];

    let newPhase = phase;
    if (newCompleted.length >= 3 && phase < 4) {
      newPhase = phase + 1;
      newCompleted = [];
    }

    const newState = { phase: newPhase, completedWeeks: newCompleted };
    setPlanState(newState);
    savePlanState(newState);
  };

  const resetPlan = () => {
    const newState = { phase: 1, completedWeeks: [] };
    setPlanState(newState);
    savePlanState(newState);
    setShowReset(false);
  };

  if (selectedRecipe) {
    return <HairRecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  const gradient = PHASE_COLORS[phase];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Plano Capilar</h1>
        <p className="text-stone-500 mt-1">Jornada de 4 fases · 3 semanas cada</p>
      </div>

      <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{phaseData.emoji}</span>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Fase {phase} de 4</p>
        </div>
        <h2 className="text-xl font-bold">{phaseData.name}</h2>
        <p className="text-white/70 text-sm mt-1 leading-relaxed">{phaseData.description}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">Semanas concluídas</span>
            <span className="text-white/60">{completedWeeks.length}/3</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${(completedWeeks.length / 3) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {weeklyPlan.map(weekData => (
          <WeekCard
            key={weekData.week}
            weekData={weekData}
            phaseRecipes={phaseRecipes}
            phaseNum={phase}
            completed={completedWeeks.includes(weekData.week)}
            onToggle={() => toggleWeek(weekData.week)}
            onSelectRecipe={setSelectedRecipe}
          />
        ))}
      </div>

      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">💡 Lembre-se</p>
        <p className="text-sm text-stone-600 leading-relaxed">
          Não precisa fazer tudo. Escolha <strong>1 receita por semana</strong> e mantenha os hábitos. Consistência simples gera resultados reais.
        </p>
      </div>

      <div className="text-center">
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Reiniciar tratamento
          </button>
        ) : (
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-center space-y-3">
            <p className="text-sm text-stone-700 font-medium">Reiniciar do começo?</p>
            <p className="text-xs text-stone-400">Seu progresso será apagado e você voltará para a Fase 1.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowReset(false)} className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-100 transition-all">
                Cancelar
              </button>
              <button onClick={resetPlan} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all">
                Sim, reiniciar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}