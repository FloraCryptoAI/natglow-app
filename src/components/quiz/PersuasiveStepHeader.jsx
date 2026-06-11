import { motion } from 'framer-motion'

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5">
      <motion.div
        className="h-1.5 rounded-full"
        style={{ background: 'linear-gradient(90deg, #27AE60, #1E8449)' }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  )
}

export default function PersuasiveStepHeader({ current, total, title, subtitle, t, accentColor = '#1E8449', badgeText }) {
  // `context` prop is intentionally ignored — the red warning subtitles below
  // each question title were removed for ads policy compliance (FB flags
  // medical-sounding urgency claims). Kept the prop signature to avoid
  // breaking callers, but the field no longer renders.
  const badge = badgeText || t('quizBold.stepBadge', { current, total })
  return (
    <div className="flex flex-col gap-3">
      <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-extrabold tracking-wider" style={{ background: accentColor }}>
        {badge}
      </span>
      <ProgressBar current={current} total={total} />
      <div className="text-center flex flex-col gap-1.5">
        <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-stone-400">{subtitle}</p>}
      </div>
    </div>
  )
}
