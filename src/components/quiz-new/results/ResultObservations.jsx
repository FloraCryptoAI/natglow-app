import React from 'react'
import { Card } from '@/components/quiz-new/ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'
import { getHairTypeObservation, getHabitObservation, getPracticalityObservation } from '@/lib/quiz-new/quizNewPersonalization'

export default function ResultObservations({ answers }) {
  const cards = [
    { icon: '🧬', text: getHairTypeObservation(answers) },
    { icon: '🗓️', text: getHabitObservation(answers) },
    { icon: '⏱️', text: getPracticalityObservation(answers) },
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold" style={{ color: COLORS.ink }}>{COPY.results.observationsTitle}</h2>
      <div className="flex flex-col gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: COLORS.greenLight }} aria-hidden>{c.icon}</span>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{c.text}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
