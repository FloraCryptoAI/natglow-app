import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoutineCard({ title, icon: Icon, steps, color }) {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  const colorClasses = {
    morning: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
    night: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
    weekly: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  };

  const c = colorClasses[color] || colorClasses.morning;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-stone-800">{title}</h3>
            <p className="text-sm text-stone-500">{steps.length} passos</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-800 text-sm">{step.name || step.step}</span>
                    {step.duration_minutes && (
                      <span className={`text-xs px-2 py-1 rounded-full ${c.badge} flex items-center gap-1`}>
                        <Clock className="w-3 h-3" />
                        {step.duration_minutes} min
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 leading-relaxed">{step.description}</p>
                  {step.recipe && (
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      {step.recipe.ingredients && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {step.recipe.ingredients.map((ing, j) => (
                            <span key={j} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full flex items-center gap-1">
                              <Leaf className="w-2.5 h-2.5" />
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                      {step.recipe.instructions && (
                        <p className="text-xs text-stone-400 leading-relaxed">{step.recipe.instructions}</p>
                      )}
                    </div>
                  )}
                  {step.frequency && (
                    <p className="text-xs text-stone-400 mt-2">Frequência: {step.frequency}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}