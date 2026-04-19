import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Sun, Moon, Sparkles, Calendar, Trophy, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SkinProfile } from '@/entities/SkinProfile';
import { DailyProgress } from '@/entities/DailyProgress';

export default function Plan30Days() {
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['skinProfiles'],
    queryFn: () => SkinProfile.list('-created_date', 1),
  });

  const profile = profiles[0];
  const plan = profile?.generated_routine?.thirty_day_plan;

  const { data: progressData = [] } = useQuery({
    queryKey: ['dailyProgress', profile?.id],
    queryFn: () => DailyProgress.filter({ profile_id: profile?.id }),
    enabled: !!profile?.id,
  });

  const updateProgress = useMutation({
    mutationFn: async ({ dayNumber, field, value }) => {
      const existing = progressData.find(p => p.day_number === dayNumber);
      if (existing) {
        await DailyProgress.update(existing.id, { [field]: value });
      } else {
        await DailyProgress.create({
          profile_id: profile.id,
          day_number: dayNumber,
          date: format(addDays(new Date(profile.created_date), dayNumber - 1), 'yyyy-MM-dd'),
          [field]: value,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyProgress'] }),
  });

  const getProgress = (dayNumber) => progressData.find(p => p.day_number === dayNumber) || {};

  const completedDays = progressData.filter(p => p.morning_completed && p.night_completed).length;
  const streak = (() => {
    const sorted = [...progressData].sort((a, b) => b.day_number - a.day_number);
    let count = 0;
    for (const p of sorted) {
      if (p.morning_completed && p.night_completed) count++;
      else break;
    }
    return count;
  })();

  if (!profile || !plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Calendar className="w-12 h-12 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-800 mb-2">Plano de 30 Dias</h2>
        <p className="text-stone-500">Faça o quiz primeiro para gerar seu plano personalizado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 text-center">
          <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-stone-900">{completedDays}</p>
          <p className="text-xs text-stone-400">Dias Completos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200 text-center">
          <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-stone-900">{streak}</p>
          <p className="text-xs text-stone-400">Sequência</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200 text-center">
          <Sparkles className="w-5 h-5 text-brand mx-auto mb-1" />
          <p className="text-2xl font-bold text-stone-900">{Math.round((completedDays / 30) * 100)}%</p>
          <p className="text-xs text-stone-400">Progresso</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-800">Progresso Geral</h3>
          <span className="text-sm text-stone-400">{completedDays}/30 dias</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-brand to-brand-light h-3 rounded-full transition-all duration-500"
            style={{ width: `${(completedDays / 30) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Seu Plano Diário</h2>
        {plan.map((day) => {
          const progress = getProgress(day.day);
          const dayDate = addDays(new Date(profile.created_date), day.day - 1);
          const isToday = startOfDay(new Date()).getTime() === startOfDay(dayDate).getTime();
          const allDone = progress.morning_completed && progress.night_completed;

          return (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(day.day * 0.02, 0.4) }}
              className={`bg-white rounded-2xl p-5 border transition-all ${
                isToday ? 'border-brand-light ring-2 ring-brand-pale' :
                allDone ? 'border-green-200 bg-green-50/30' : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    allDone ? 'bg-green-100 text-green-700' :
                    isToday ? 'bg-brand text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {allDone ? <Check className="w-5 h-5" /> : day.day}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800">Dia {day.day}</p>
                    <p className="text-xs text-stone-400">
                      {format(dayDate, "d 'de' MMMM", { locale: ptBR })}
                      {isToday && <span className="ml-1 text-brand font-medium">• Hoje</span>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {day.morning_task && (
                  <button
                    onClick={() => updateProgress.mutate({ dayNumber: day.day, field: 'morning_completed', value: !progress.morning_completed })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      progress.morning_completed ? 'bg-amber-50' : 'bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      progress.morning_completed ? 'border-amber-500 bg-amber-500' : 'border-stone-300'
                    }`}>
                      {progress.morning_completed && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className={`text-sm ${progress.morning_completed ? 'line-through text-stone-400' : ''}`}>{day.morning_task}</span>
                  </button>
                )}
                {day.night_task && (
                  <button
                    onClick={() => updateProgress.mutate({ dayNumber: day.day, field: 'night_completed', value: !progress.night_completed })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      progress.night_completed ? 'bg-indigo-50' : 'bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      progress.night_completed ? 'border-indigo-500 bg-indigo-500' : 'border-stone-300'
                    }`}>
                      {progress.night_completed && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <Moon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className={`text-sm ${progress.night_completed ? 'line-through text-stone-400' : ''}`}>{day.night_task}</span>
                  </button>
                )}
                {day.special_task && (
                  <button
                    onClick={() => updateProgress.mutate({ dayNumber: day.day, field: 'weekly_task_completed', value: !progress.weekly_task_completed })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      progress.weekly_task_completed ? 'bg-green-50' : 'bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      progress.weekly_task_completed ? 'border-green-500 bg-green-500' : 'border-stone-300'
                    }`}>
                      {progress.weekly_task_completed && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className={`text-sm ${progress.weekly_task_completed ? 'line-through text-stone-400' : ''}`}>{day.special_task}</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}