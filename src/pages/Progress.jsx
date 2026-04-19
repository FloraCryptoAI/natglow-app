import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Flame, Target, TrendingUp, Calendar, CheckCircle2, Sun, Moon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SkinProfile } from '@/entities/SkinProfile';
import { DailyProgress } from '@/entities/DailyProgress';

export default function Progress() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['skinProfiles'],
    queryFn: () => SkinProfile.list('-created_date', 1),
  });

  const profile = profiles[0];

  const { data: progressData = [] } = useQuery({
    queryKey: ['dailyProgress', profile?.id],
    queryFn: () => DailyProgress.filter({ profile_id: profile?.id }),
    enabled: !!profile?.id,
  });

  const completedDays = progressData.filter(p => p.morning_completed && p.night_completed).length;
  const morningCount = progressData.filter(p => p.morning_completed).length;
  const nightCount = progressData.filter(p => p.night_completed).length;

  const streak = (() => {
    const sorted = [...progressData].sort((a, b) => b.day_number - a.day_number);
    let count = 0;
    for (const p of sorted) {
      if (p.morning_completed && p.night_completed) count++;
      else break;
    }
    return count;
  })();

  const weeklyData = [];
  for (let w = 0; w < 5; w++) {
    const weekDays = progressData.filter(p => p.day_number > w * 7 && p.day_number <= (w + 1) * 7);
    weeklyData.push({
      name: `Sem ${w + 1}`,
      completos: weekDays.filter(p => p.morning_completed && p.night_completed).length,
    });
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <TrendingUp className="w-12 h-12 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-800 mb-2">Progresso</h2>
        <p className="text-stone-500">Faça o quiz e comece sua rotina para ver seu progresso.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Seu Progresso</h1>
        <p className="text-stone-500 mt-1">Acompanhe sua jornada de cuidados</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-brand-light to-brand rounded-2xl p-5 text-white">
          <Trophy className="w-6 h-6 text-white mb-2" />
          <p className="text-3xl font-bold">{completedDays}</p>
          <p className="text-white/80 text-sm">Dias Completos</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <Flame className="w-6 h-6 text-orange-200 mb-2" />
          <p className="text-3xl font-bold">{streak}</p>
          <p className="text-orange-200 text-sm">Dias Seguidos</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <Sun className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-3xl font-bold text-stone-900">{morningCount}</p>
          <p className="text-stone-400 text-sm">Manhãs</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <Moon className="w-6 h-6 text-indigo-500 mb-2" />
          <p className="text-3xl font-bold text-stone-900">{nightCount}</p>
          <p className="text-stone-400 text-sm">Noites</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-4">Progresso por Semana</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#A8A29E' }} />
              <YAxis tick={{ fontSize: 12, fill: '#A8A29E' }} />
              <Bar dataKey="completos" fill="#FB45A9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <h3 className="font-semibold text-stone-800 mb-4">Conquistas</h3>
        <div className="space-y-3">
          {[
            { label: 'Primeiro dia completo', done: completedDays >= 1, icon: '🌱' },
            { label: '7 dias seguidos', done: streak >= 7, icon: '🔥' },
            { label: '14 dias completos', done: completedDays >= 14, icon: '⭐' },
            { label: '30 dias — Jornada completa!', done: completedDays >= 30, icon: '🏆' },
          ].map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${a.done ? 'bg-green-50' : 'bg-stone-50'}`}>
              <span className="text-xl">{a.icon}</span>
              <span className={`text-sm font-medium ${a.done ? 'text-green-700' : 'text-stone-400'}`}>{a.label}</span>
              {a.done && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />}
            </div>
          ))}
        </div>
      </div>

      {profile.skin_age_score && (
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-5 text-white">
          <p className="text-stone-400 text-sm mb-1">Idade estimada da sua pele</p>
          <p className="text-4xl font-bold">{profile.skin_age_score} anos</p>
          <p className="text-stone-400 text-sm mt-2">
            Continue sua rotina para ajudar a melhorar a aparência da sua pele 💚
          </p>
        </div>
      )}
    </div>
  );
}