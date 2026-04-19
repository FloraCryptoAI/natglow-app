import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Calendar, Sparkles, Lightbulb, ArrowRight, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import RoutineCard from '../components/dashboard/RoutineCard';
import { Button } from '@/components/ui/button';
import { SkinProfile } from '@/entities/SkinProfile';

export default function Dashboard() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['skinProfiles'],
    queryFn: () => SkinProfile.list('-created_date', 1),
  });

  const profile = profiles[0];
  const routine = profile?.generated_routine;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || !routine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Crie Sua Rotina</h2>
        <p className="text-stone-500 mb-8 max-w-sm">
          Responda o quiz e receba uma rotina personalizada de skincare natural
        </p>
        <Link to="/Landing">
          <Button className="bg-emerald-700 hover:bg-emerald-800 rounded-full px-8 py-6 text-base">
            Começar Quiz
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  const skinTypeLabels = {
    dry: 'Seca', oily: 'Oleosa', combination: 'Mista', normal: 'Normal', sensitive: 'Sensível'
  };

  return (
    <div className="space-y-6 pb-8">
      <style>{`
        .bg-emerald-700 { background-color: #FB45A9 !important; }
        .bg-emerald-800 { background-color: #E03594 !important; }
        .bg-emerald-900 { background-color: #1A5A43 !important; }
        .bg-emerald-600 { background-color: #FFB3DD !important; }
        .hover\\:bg-emerald-800:hover { background-color: #E03594 !important; }
        .text-emerald-700 { color: #FB45A9 !important; }
        .text-emerald-600 { color: #FFB3DD !important; }
        .text-emerald-200 { color: #ffffff !important; }
        .border-emerald-600 { border-color: #FFB3DD !important; }
        .border-emerald-300 { border-color: #FFB3DD !important; }
        .border-emerald-100 { border-color: #FFE4F2 !important; }
        .bg-emerald-50 { background-color: #FFF5FA !important; }
        .bg-emerald-100 { background-color: #FFE4F2 !important; }
        .from-emerald-700 { --tw-gradient-from: #FB45A9 !important; }
        .to-emerald-900 { --tw-gradient-to: #FFB3DD !important; }
        .hover\\:bg-emerald-50\\/50:hover { background-color: rgba(239, 251, 246, 0.5) !important; }
        .border-t-emerald-600 { border-top-color: #FFB3DD !important; }
      `}</style>

      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-3xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-200 text-sm font-medium">Sua Rotina Personalizada</p>
            <h1 className="text-2xl font-bold mt-1">Olá! ✨</h1>
          </div>
          <Link
            to="/Landing"
            className="flex items-center gap-1 text-emerald-200 text-sm hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refazer Quiz
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-emerald-200 text-xs">Tipo de Pele</p>
            <p className="font-semibold mt-1">{skinTypeLabels[profile.skin_type] || profile.skin_type}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-emerald-200 text-xs">Idade da Pele</p>
            <p className="font-semibold mt-1">{profile.skin_age_score || '—'} anos</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-emerald-200 text-xs">Tempo Diário</p>
            <p className="font-semibold mt-1">{profile.daily_time || '—'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">Sua Rotina</h2>
        <RoutineCard title="Rotina da Manhã" icon={Sun} steps={routine.morning_routine} color="morning" />
        <RoutineCard title="Rotina da Noite" icon={Moon} steps={routine.night_routine} color="night" />
        <RoutineCard title="Tratamentos Semanais" icon={Calendar} steps={routine.weekly_treatments} color="weekly" />
      </div>

      {routine.tips && routine.tips.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-stone-800">Dicas para Você</h3>
          </div>
          <ul className="space-y-2">
            {routine.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {routine.expected_results && (
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <h3 className="font-semibold text-stone-800 mb-2">Resultados Esperados</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{routine.expected_results}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/Plan30Days" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all">
          <Calendar className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="font-medium text-stone-800 text-sm">Plano 30 Dias</p>
          <p className="text-xs text-stone-400 mt-1">Checklist diário</p>
        </Link>
        <Link to="/Recipes" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all">
          <Sparkles className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="font-medium text-stone-800 text-sm">Receitas</p>
          <p className="text-xs text-stone-400 mt-1">Biblioteca completa</p>
        </Link>
      </div>
    </div>
  );
}