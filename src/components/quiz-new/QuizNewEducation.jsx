import React from 'react'
import { PrimaryButton, Card } from './ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { getAnswerChips } from '@/lib/quiz-new/quizNewPersonalization'

/**
 * @param {{ eduKey:'edu1'|'edu2'|'edu3', answers:object, onContinue:()=>void }} props
 */
export default function QuizNewEducation({ eduKey, answers, onContinue }) {
  const c = COPY.education[eduKey]
  const chips = eduKey === 'edu3' ? getAnswerChips(answers) : []
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] leading-snug font-extrabold" style={{ color: COLORS.ink }}>{c.title}</h2>
        {c.text && <p className="text-[15px] leading-relaxed" style={{ color: COLORS.textMuted }}>{c.text}</p>}
      </div>

      {/* edu1 — four small cards */}
      {eduKey === 'edu1' && (
        <div className="grid grid-cols-2 gap-3">
          {c.cards.map((card, i) => (
            <Card key={i} className="flex items-center gap-2.5">
              <span className="text-xl leading-none" aria-hidden>{card.icon}</span>
              <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>{card.label}</span>
            </Card>
          ))}
        </div>
      )}

      {/* edu2 — simple calendar demo */}
      {eduKey === 'edu2' && (
        <div className="flex flex-col gap-2.5">
          {c.calendar.map((row, i) => (
            <Card key={i} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: COLORS.greenLight }} aria-hidden>{row.icon}</span>
              <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>{row.label}</span>
            </Card>
          ))}
        </div>
      )}

      {/* edu3 — dynamic chips from real answers */}
      {eduKey === 'edu3' && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <span key={i} className="text-sm font-semibold rounded-full px-3 py-1.5" style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      <Card tone={c.boxTone}>
        <p className="text-sm leading-relaxed font-medium" style={{ color: c.boxTone === 'yellow' ? '#7A5A00' : COLORS.greenDark }}>{c.box}</p>
      </Card>

      <PrimaryButton onClick={onContinue}>{c.cta}</PrimaryButton>
    </div>
  )
}
