import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HairRoutineCard({ title, icon: Icon, steps }) {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-stone-800">{title}</h3>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-stone-50">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 pt-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="font-medium text-stone-800 text-sm">{step.name || step.step}</p>
                {step.description && <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{step.description}</p>}
                {step.tip && (
                  <p className="text-emerald-700 text-xs mt-1 bg-emerald-50 rounded-lg px-2 py-1 inline-block">
                    💡 {step.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}