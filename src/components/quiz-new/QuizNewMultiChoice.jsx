import React from 'react'
import { OptionRow, PrimaryButton } from './ui'

/**
 * Multiple-choice question body (title rendered by StepHead). Needs the Continue
 * button; disabled until ≥1 pick. Exclusivity is handled by the parent.
 * @param {{ question:object, values:string[], onToggle:(v:string)=>void, onContinue:()=>void }} props
 */
export default function QuizNewMultiChoice({ question, values, onToggle, onContinue }) {
  const selected = Array.isArray(values) ? values : []
  return (
    <div className="flex flex-col gap-3">
      {question.options.map(opt => (
        <OptionRow key={opt.value} emoji={opt.icon} label={opt.label}
                   selected={selected.includes(opt.value)} onClick={() => onToggle(opt.value)} />
      ))}
      <div className="pt-2">
        <PrimaryButton onClick={onContinue} disabled={selected.length === 0}>
          {question.cta ?? 'CONTINUAR →'}
        </PrimaryButton>
      </div>
    </div>
  )
}
