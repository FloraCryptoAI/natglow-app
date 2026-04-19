import React from 'react';

export default function MultiOptionCard({ label, description, icon: Icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
        selected
          ? 'border-emerald-600 bg-emerald-50'
          : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'bg-emerald-100' : 'bg-stone-100'
      }`}>
        <Icon className={`w-5 h-5 ${selected ? 'text-emerald-700' : 'text-stone-400'}`} />
      </div>
      <div className="flex-1">
        <p className={`font-semibold text-sm ${selected ? 'text-emerald-800' : 'text-stone-800'}`}>{label}</p>
        <p className="text-stone-400 text-xs mt-0.5">{description}</p>
      </div>
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'bg-emerald-600 border-emerald-600' : 'border-stone-300'
      }`}>
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}