import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function ToxicityGauge({ score, levelLabel, levelColor }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1400
    const steps = 60
    const increment = score / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        current = score
        clearInterval(timer)
      }
      setDisplayValue(Math.round(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [score])

  // Semi-circle gauge using SVG
  const radius = 90
  const circumference = Math.PI * radius
  const offset = circumference - (displayValue / 100) * circumference

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 240, height: 140 }}>
        <svg width="240" height="140" viewBox="0 0 240 140">
          {/* Background arc */}
          <path
            d="M 30 120 A 90 90 0 0 1 210 120"
            stroke="#e7e5e4"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <motion.path
            d="M 30 120 A 90 90 0 0 1 210 120"
            stroke={levelColor}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-5xl font-extrabold tabular-nums" style={{ color: levelColor }}>
            {displayValue}%
          </span>
        </div>
      </div>
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wider text-white"
        style={{ background: levelColor }}
      >
        NIVEL {levelLabel}
      </span>
    </div>
  )
}
