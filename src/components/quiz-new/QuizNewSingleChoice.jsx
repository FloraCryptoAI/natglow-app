import React from 'react'
import { OptionRow, ImgCard } from './ui'
import { COLORS } from '@/lib/quiz-new/quizNewCopy'

/**
 * Single-choice question body (title is rendered by StepHead). Auto-advance is
 * handled by the parent after onPick.
 * @param {{ question:object, value:string, onPick:(v:string)=>void }} props
 */
export default function QuizNewSingleChoice({ question, value, onPick }) {
  const { layout, options } = question

  // Image tiles (hair type, length): 2-col grid.
  if (layout === 'grid2') {
    return (
      <div className="grid grid-cols-2 gap-3 items-start">
        {options.map(opt => (
          <ImgCard key={opt.value} image={opt.image} emoji={opt.emoji} label={opt.label}
                   selected={value === opt.value} onClick={() => onPick(opt.value)} />
        ))}
      </div>
    )
  }

  // Profile: two image tiles (mujer/hombre) + full-width neutral option below.
  if (layout === 'profile') {
    const tiles = options.filter(o => !o.full)
    const full = options.filter(o => o.full)
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 items-start">
          {tiles.map(opt => (
            <ImgCard key={opt.value} image={opt.image} emoji={opt.emoji} label={opt.label}
                     selected={value === opt.value} onClick={() => onPick(opt.value)} />
          ))}
        </div>
        {full.map(opt => (
          <OptionRow key={opt.value} emoji={opt.icon} label={opt.label}
                     selected={value === opt.value} onClick={() => onPick(opt.value)} />
        ))}
        {question.note && (
          <p className="text-xs leading-relaxed rounded-xl p-3 mt-1" style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
            {question.note}
          </p>
        )}
      </div>
    )
  }

  // Default list: /quiz card-option rows.
  return (
    <div className="flex flex-col gap-3">
      {options.map(opt => (
        <OptionRow key={opt.value} emoji={opt.icon} label={opt.label} desc={opt.hint}
                   selected={value === opt.value} onClick={() => onPick(opt.value)} />
      ))}
      {question.note && (
        <p className="text-xs leading-relaxed rounded-xl p-3 mt-1" style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
          {question.note}
        </p>
      )}
    </div>
  )
}
