import React from 'react'
import { PrimaryButton, Card } from '@/components/quiz-new/ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'

export default function ResultCTA({ onCta }) {
  const c = COPY.results
  return (
    <Card tone="yellow" className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold" style={{ color: '#7A5A00' }}>{c.ctaTitle}</h2>
      <p className="text-sm leading-relaxed" style={{ color: '#7A5A00' }}>{c.ctaText}</p>
      <PrimaryButton onClick={onCta} ariaLabel="Ver el plan que preparamos">{c.ctaButton}</PrimaryButton>
      <p className="text-center text-xs font-medium" style={{ color: COLORS.textMuted }}>{c.ctaMicro}</p>
    </Card>
  )
}
