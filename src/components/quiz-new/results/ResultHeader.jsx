import React from 'react'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { headerTitle, headerText } from '@/lib/quiz-new/quizNewPersonalization'

export default function ResultHeader({ answers }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold tracking-wider uppercase self-start rounded-full px-3 py-1.5"
            style={{ background: COLORS.greenLight, color: COLORS.greenDark }}>
        {COPY.results.tag}
      </span>
      <h1 className="text-[24px] leading-tight font-extrabold" style={{ color: COLORS.ink }}>{headerTitle(answers)}</h1>
      <p className="text-[15px] leading-relaxed" style={{ color: COLORS.textMuted }}>{headerText(answers)}</p>
    </div>
  )
}
