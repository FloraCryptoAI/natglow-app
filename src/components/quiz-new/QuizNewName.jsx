import React, { useState } from 'react'
import { PrimaryButton } from './ui'
import { COLORS, COPY } from '@/lib/quiz-new/quizNewCopy'

const isValidName = (v) => {
  const t = (v ?? '').trim()
  return t.length >= 2 && !/^\d+$/.test(t)   // ≥2 chars, not only digits
}

/**
 * @param {{ value:string, onChange:(v:string)=>void, onSubmit:()=>void }} props
 */
export default function QuizNewName({ value, onChange, onSubmit }) {
  const c = COPY.name
  const [touched, setTouched] = useState(false)
  const valid = isValidName(value)
  const showError = touched && !valid

  const submit = () => {
    if (!valid) { setTouched(true); return }
    onSubmit()
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="text-center flex flex-col gap-2">
        <div className="text-4xl" aria-hidden>🌿</div>
        <h2 className="text-[22px] leading-snug font-extrabold" style={{ color: COLORS.ink }}>{c.title}</h2>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>{c.subtitle}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          inputMode="text"
          autoComplete="given-name"
          aria-label="Tu primer nombre"
          placeholder={c.placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          className="w-full rounded-2xl px-4 py-3.5 text-[16px] outline-none focus:ring-2"
          style={{ border: `2px solid ${showError ? COLORS.danger : COLORS.border}`, color: COLORS.ink, background: '#fff' }}
        />
        {showError && <p className="text-xs pl-1" style={{ color: COLORS.danger }}>{c.error}</p>}
      </div>

      <PrimaryButton onClick={submit} disabled={!valid}>{c.cta}</PrimaryButton>
    </div>
  )
}
