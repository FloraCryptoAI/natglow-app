import React from 'react'
import { Check } from 'lucide-react'
import { PrimaryButton } from './ui'
import { COLORS } from '@/lib/quiz-new/quizNewCopy'

/**
 * Multiple-choice question. Needs the Continue button; disabled until ≥1 pick.
 * Exclusivity between options is handled by the parent (toggleMulti in storage).
 * @param {{ question:object, values:string[], onToggle:(v:string)=>void, onContinue:()=>void }} props
 */
export default function QuizNewMultiChoice({ question, values, onToggle, onContinue }) {
  const grid = question.layout === 'grid2'
  const selected = Array.isArray(values) ? values : []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] leading-snug font-extrabold" style={{ color: COLORS.ink }}>{question.title}</h2>
        {question.subtitle && <p className="text-sm leading-relaxed" style={{ color: COLORS.textMuted }}>{question.subtitle}</p>}
      </div>

      <div className={grid ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2.5'}>
        {question.options.map(opt => {
          const isOn = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              aria-pressed={isOn}
              className={`text-left rounded-2xl transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 flex items-center gap-3 ${grid ? 'p-3' : 'p-3.5'}`}
              style={{ background: isOn ? COLORS.greenLight : '#fff', border: `2px solid ${isOn ? COLORS.green : COLORS.border}` }}
            >
              {opt.icon && <span className="text-xl leading-none flex-shrink-0" aria-hidden>{opt.icon}</span>}
              <span className="font-semibold text-[15px] flex-1" style={{ color: COLORS.ink }}>{opt.label}</span>
              <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: isOn ? COLORS.green : '#fff', border: `2px solid ${isOn ? COLORS.green : COLORS.border}` }}>
                {isOn && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="pt-1">
        <PrimaryButton onClick={onContinue} disabled={selected.length === 0}>
          {question.cta ?? 'CONTINUAR →'}
        </PrimaryButton>
      </div>
    </div>
  )
}
