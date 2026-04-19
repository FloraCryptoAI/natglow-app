import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, CheckCircle2, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HAIR_PHASES } from '../lib/hairData';

function loadPlanState() {
  try {
    const saved = localStorage.getItem('hairPlanState');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { phase: 1, completedWeeks: [] };
}

export default function HairProgress() {
  const { phase: currentPhaseNumber, completedWeeks } = loadPlanState();
  const currentPhase = HAIR_PHASES[currentPhaseNumber - 1];

  const totalWeeksCompleted = (currentPhaseNumber - 1) * 3 + completedWeeks.length;
  const weeksInCurrentPhase = completedWeeks.length;

  const weeklyData = [1, 2, 3].map(w => ({
    name: `Sem ${w}`,
    completos: completedWeeks.includes(w) ? 1 : 0,
  }));

  const phaseColors = {
    1: { gradient: 'from-emerald-600 to-emerald-700', text: 'text-emerald-200', bar: '#FB45A9' },
    2: { gradient: 'from-blue-600 to-blue-700',       text: 'text-blue-200',    bar: '#3B82F6' },
    3: { gradient: 'from-violet-600 to-violet-700',   text: 'text-violet-200',  bar: '#7C3AED' },
    4: { gradient: 'from-amber-500 to-amber-600',     text: 'text-amber-200',   bar: '#F59E0B' },
  };
  const colors = phaseColors[currentPhaseNumber] || phaseColors[1];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Seu Progresso</h1>
        <p className="text-stone-500 mt-1">Jornada capilar contínua — acompanhe cada fase</p>
      </div>

      {/* Current phase hero */}
      <div className={`bg-gradient-to-br ${colors.gradient} rounded-3xl p-6 text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{currentPhase.emoji}</span>
          <p className={`text-sm font-semibold ${colors.text}`}>Fase atual</p>
        </div>
        <h2 className="text-xl font-bold">Fase {currentPhaseNumber} — {currentPhase.name}</h2>
        <p className={`text-sm ${colors.text} mt-1`}>{currentPhase.focus}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className={colors.text}>Semanas concluídas</span>
            <span className={colors.text}>{weeksInCurrentPhase}/3 semanas</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${(weeksInCurrentPhase / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Journey phases overview */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-4">Sua Jornada Capilar</h3>
        <div className="space-y-3">
          {HAIR_PHASES.map((phase, i) => {
            const phaseNum = i + 1;
            const phaseCompleted = currentPhaseNumber > phaseNum;
            const isActive = currentPhaseNumber === phaseNum;
            const isLocked = phaseNum > currentPhaseNumber;
            return (
              <div key={phase.id} className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? 'bg-stone-50 border border-stone-200' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${phaseCompleted ? 'bg-emerald-100' : isActive ? 'bg-stone-100' : 'bg-stone-50'}`}>
                  {phaseCompleted ? '✅' : phase.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isLocked ? 'text-stone-300' : 'text-stone-800'}`}>
                    Fase {phaseNum} — {phase.name}
                  </p>
                  <p className={`text-xs ${isLocked ? 'text-stone-300' : 'text-stone-400'}`}>{phase.focus}</p>
                </div>
                {isActive && <span className="text-xs bg-stone-800 text-white px-2 py-1 rounded-full font-medium flex-shrink-0">Atual</span>}
                {phaseCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                {isLocked && <span className="text-xs text-stone-300 flex-shrink-0">🔒</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`bg-gradient-to-br ${colors.gradient} rounded-2xl p-5 text-white`}>
          <Trophy className={`w-6 h-6 ${colors.text} mb-2`} />
          <p className="text-3xl font-bold">{totalWeeksCompleted}</p>
          <p className={`${colors.text} text-sm`}>Semanas no total</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <Sparkles className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-3xl font-bold text-stone-900">{weeksInCurrentPhase}</p>
          <p className="text-stone-400 text-sm">Semanas nesta fase</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-4">Semanas concluídas (fase atual)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#A8A29E' }} />
              <YAxis tick={{ fontSize: 12, fill: '#A8A29E' }} domain={[0, 1]} />
              <Bar dataKey="completos" fill={colors.bar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-4">Conquistas</h3>
        <div className="space-y-3">
          {[
            { label: 'Primeira semana concluída', done: totalWeeksCompleted >= 1, icon: '🌱' },
            { label: 'Fase 1 concluída — Recuperação', done: currentPhaseNumber > 1, icon: '🏅' },
            { label: 'Fase 2 concluída — Fortalecimento', done: currentPhaseNumber > 2, icon: '💪' },
            { label: 'Fase 3 concluída — Crescimento', done: currentPhaseNumber > 3, icon: '🚀' },
            { label: 'Jornada completa — Manutenção ativa', done: currentPhaseNumber === 4, icon: '🏆' },
          ].map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${a.done ? 'bg-emerald-50' : 'bg-stone-50'}`}>
              <span className="text-xl">{a.icon}</span>
              <span className={`text-sm font-medium flex-1 ${a.done ? 'text-emerald-700' : 'text-stone-400'}`}>{a.label}</span>
              {a.done && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Motivational link to plan */}
      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-center">
        <p className="text-sm text-stone-600 mb-3">Continue marcando as semanas no plano para avançar nas fases.</p>
        <Link to="/HairPlan" className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-stone-700 transition-colors">
          Ir para o plano
        </Link>
      </div>
    </div>
  );
}