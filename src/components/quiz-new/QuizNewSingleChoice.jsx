import React from 'react'
import { COLORS } from '@/lib/quiz-new/quizNewCopy'

/**
 * Single-choice question. Auto-advance is handled by the parent after onPick.
 * @param {{ question:object, value:string, onPick:(v:string)=>void }} props
 */
export default function QuizNewSingleChoice({ question, value, onPick }) {
  const grid = question.layout === 'grid2'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] leading-snug font-extrabold" style={{ color: COLORS.ink }}>{question.title}</h2>
        {question.subtitle && <p className="text-sm leading-relaxed" style={{ color: COLORS.textMuted }}>{question.subtitle}</p>}
      </div>

      <div className={grid ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        {question.options.map(opt => {
          const selected = value === opt.value
          const ring = selected ? COLORS.green : COLORS.border
          return (
            <button
              key={opt.value}
              onClick={() => onPick(opt.value)}
              aria-pressed={selected}
              className={`text-left rounded-2xl transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 ${grid ? 'p-3 flex flex-col items-center text-center gap-2' : 'p-4 flex items-center gap-3'}`}
              style={{ background: selected ? COLORS.greenLight : '#fff', border: `2px solid ${ring}`, boxShadow: '0 1px 3px rgba(23,23,23,0.04)' }}
            >
              {opt.image ? (
                <img src={opt.image} alt={opt.label} loading="lazy" className="w-full h-24 object-contain" style={{ mixBlendMode: 'multiply' }} />
              ) : opt.icon ? (
                <span className={grid ? 'text-3xl leading-none' : 'text-2xl leading-none flex-shrink-0'} aria-hidden>{opt.icon}</span>
              ) : null}
              <span className="flex flex-col">
                <span className="font-bold text-[15px]" style={{ color: COLORS.ink }}>{opt.label}</span>
                {opt.hint && <span className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{opt.hint}</span>}
              </span>
            </button>
          )
        })}
      </div>

      {question.note && (
        <p className="text-xs leading-relaxed rounded-xl p-3" style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
          {question.note}
        </p>
      )}
    </div>
  )
}
