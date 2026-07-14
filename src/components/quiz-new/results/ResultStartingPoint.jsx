import React from 'react'
import { Card } from '@/components/quiz-new/ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { getStartingPointText } from '@/lib/quiz-new/quizNewPersonalization'

export default function ResultStartingPoint({ answers }) {
  return (
    <Card tone="green" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>🌿</span>
        <h2 className="text-lg font-extrabold" style={{ color: COLORS.greenDark }}>{COPY.results.startingPointTitle}</h2>
      </div>
      <p className="text-sm leading-relaxed font-medium" style={{ color: COLORS.greenDark }}>{getStartingPointText(answers)}</p>
    </Card>
  )
}
