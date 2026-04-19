import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, AlertTriangle, Calendar, BookOpen, BarChart3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HAIR_RECIPES, TAG_LABELS } from '../lib/hairData';

const analyzingSteps = [
  { label: 'Analisando seus hábitos capilares', delay: 0 },
  { label: 'Identificando principais causas do dano', delay: 900 },
  { label: 'Selecionando melhores ingredientes para você', delay: 1800 },
  { label: 'Preparando seu plano de recuperação', delay: 2700 },
];

const PREVIEW_RECIPES = [
  HAIR_RECIPES.find(r => r.id === 'babosa-mel'),
  HAIR_RECIPES.find(r => r.id === 'oleo-coco-nutricao'),
  HAIR_RECIPES.find(r => r.id === 'abacate-azeite'),
];

const PREVIEW_PLAN = [
  { day: 1, task: 'Troque água quente por morna ou fria' },
  { day: 3, task: 'Máscara de Babosa e Mel — 20 min' },
  { day: 7, task: 'Check-in: observe o brilho e o frizz' },
];

const FIXED_ISSUES = [
  'ressecamento e falta de brilho',
  'frizz e dificuldade de controle',
  'quebra e pontas fragilizadas',
];

const FIXED_CAUSES = [
  'hábitos diários que danificam o fio ao longo do tempo',
  'falta de hidratação e nutrição regulares',
];

function EfficiencyTag({ tag }) {
  const t = TAG_LABELS[tag];
  if (!t) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${t.color}`}>{t.label}</span>;
}

export default function HairDiagnosis() {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(true);
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => {
    analyzingSteps.forEach(({ delay }, index) => {
      setTimeout(() => setCompletedSteps(prev => [...prev, index]), delay + 400);
    });
    setTimeout(() => setAnalyzing(false), 3800);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex flex-col">
      <style>{`
        .bg-emerald-700 { background-color: #FB45A9 !important; }
        .bg-emerald-800 { background-color: #E03594 !important; }
        .bg-emerald-900 { background-color: #1A5A43 !important; }
        .hover\\:bg-emerald-50:hover { background-color: #FFF5FA !important; }
        .text-emerald-700 { color: #FB45A9 !important; }
        .text-emerald-600 { color: #E03594 !important; }
        .text-emerald-200 { color: #B6EDD9 !important; }
        .bg-emerald-50 { background-color: #FFF5FA !important; }
        .bg-emerald-100 { background-color: #FFE4F2 !important; }
        .from-emerald-700 { --tw-gradient-from: #FB45A9 !important; }
        .to-emerald-900 { --tw-gradient-to: #1A5A43 !important; }
        .border-emerald-200 { border-color: #B6EDD9 !important; }
        .border-emerald-100 { border-color: #FFE4F2 !important; }
      `}</style>

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
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">Analisando suas respostas…</h2>
                <p className="text-stone-500 text-sm mb-8">Preparando seu plano de recuperação</p>
                <div className="space-y-3 text-left">
                  {analyzingSteps.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: completedSteps.includes(i) ? 1 : 0.3, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${completedSteps.includes(i) ? 'bg-emerald-100' : 'bg-stone-100'}`}>
                        {completedSteps.includes(i) ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
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
                <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-3xl p-7 text-white text-center">
                  <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-2">Plano Pronto</p>
                  <h1 className="text-2xl font-bold leading-tight mb-1">Seu plano de recuperação está pronto</h1>
                  <p className="text-emerald-200 text-sm">Identificamos o que pode estar prejudicando seu cabelo</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Seu cabelo apresenta sinais de</p>
                  <div className="space-y-2">
                    {FIXED_ISSUES.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-stone-700 text-sm font-medium capitalize">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">O que provavelmente está causando isso</p>
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
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Seu plano inclui</p>
                  <div className="space-y-3">
                    {[
                      { icon: Sparkles, label: 'Rotina capilar completa para recuperação e hidratação' },
                      { icon: Calendar, label: 'Plano de 21 dias passo a passo' },
                      { icon: BookOpen, label: 'Biblioteca de receitas naturais com ingredientes simples' },
                      { icon: ListChecks, label: 'Checklist diário de acompanhamento' },
                      { icon: BarChart3, label: 'Progresso e conquistas ao longo da jornada' },
                    ].map(({ icon: Icon, label }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-emerald-700" />
                        </div>
                        <span className="text-stone-700 text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Receitas incluídas no seu plano</p>
                  <div className="space-y-2">
                    {PREVIEW_RECIPES.filter(Boolean).map((recipe, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-stone-50 rounded-xl px-3 py-2.5">
                        <span className="text-stone-700 text-sm font-medium">{recipe.name}</span>
                        <EfficiencyTag tag={recipe.tag} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Preview do plano de 21 dias</p>
                  <div className="space-y-2">
                    {PREVIEW_PLAN.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {item.day}
                        </div>
                        <span className="text-stone-700 text-sm">{item.task}</span>
                      </div>
                    ))}
                    <p className="text-xs text-stone-400 text-center pt-1">+ 18 dias de plano detalhado</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-3xl p-7 text-center text-white shadow-xl">
                  <h3 className="text-lg font-bold mb-2 leading-snug">Comece sua recuperação hoje</h3>
                  <p className="text-emerald-200 text-sm mb-6 leading-relaxed">
                    Plano de 21 dias com receitas naturais, rotina completa e acompanhamento de progresso.
                  </p>
                  <Button
                    onClick={() => navigate('/HairDashboard')}
                    className="w-full bg-white text-emerald-800 hover:bg-emerald-50 rounded-full py-5 text-base font-bold shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      Acessar meu plano agora
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Button>
                  <p className="text-emerald-300 text-xs mt-3">Gratuito · Começa hoje</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}