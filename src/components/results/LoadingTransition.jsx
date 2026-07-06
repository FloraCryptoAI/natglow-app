import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const DEFAULT_STEPS = [
  'Analizando tu nivel de toxicidad',
  'Cruzando con +12.480 casos similares',
  'Generando tu protocolo personalizado',
]

export default function LoadingTransition({
  onDone,
  durationMs = 1800,
  title = 'Generando tu protocolo personalizado...',
  steps = DEFAULT_STEPS,
  emoji = '🌿',
  accentColor = '#27AE60',
  barGradient = 'linear-gradient(90deg, #27AE60, #1E8449)',
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepMs = durationMs / 3
    const timers = [
      setTimeout(() => setProgress(34), stepMs * 0.4),
      setTimeout(() => setProgress(70), stepMs * 1.4),
      setTimeout(() => setProgress(100), stepMs * 2.4),
    ]
    const done = setTimeout(() => onDone?.(), durationMs)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [durationMs, onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 bg-stone-50">
      <div className="max-w-sm w-full flex flex-col items-center gap-8">
        <div className="text-5xl">{emoji}</div>

        <h2 className="text-xl font-extrabold text-stone-900 text-center leading-tight">
          {title}
        </h2>

        <div className="w-full flex flex-col gap-3">
          {steps.map((label, i) => {
            const threshold = (i + 1) * 33
            const done = progress >= threshold
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                  style={{ background: done ? accentColor : '#e7e5e4' }}
                >
                  {done && <Check className="w-3 h-3 text-white" />}
                </div>
                <p className={`text-sm transition-colors duration-500 ${done ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>

        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-2 rounded-full"
            style={{ background: barGradient }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  )
}
