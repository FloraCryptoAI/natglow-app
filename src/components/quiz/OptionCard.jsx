import React from 'react';
import { Check } from 'lucide-react';

export default function OptionCard({ label, description, selected, onClick, icon: Icon, multi }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? 'border-emerald-600 bg-emerald-50 shadow-sm'
          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            selected ? 'bg-emerald-100' : 'bg-stone-100'
          }`}>
            <Icon className={`w-5 h-5 ${selected ? 'text-emerald-700' : 'text-stone-500'}`} />
          </div>
        )}
        <div className="flex-1">
          <p className={`font-medium ${selected ? 'text-emerald-800' : 'text-stone-700'}`}>{label}</p>
          {description && <p className="text-sm text-stone-400 mt-0.5">{description}</p>}
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300'
        }`}>
          {selected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      </div>
    </button>
  );
}