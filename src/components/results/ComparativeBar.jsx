import { motion } from 'framer-motion'

export default function ComparativeBar({ userScore, averageScore, userColor = '#C0392B' }) {
  return (
    <div className="w-full bg-white rounded-2xl p-5 border border-stone-200">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 text-center">
        Comparado con otras mujeres latinas
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-extrabold" style={{ color: userColor }}>TU NIVEL</span>
            <span className="font-extrabold tabular-nums" style={{ color: userColor }}>{userScore}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: userColor }}
              initial={{ width: 0 }}
              animate={{ width: `${userScore}%` }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-stone-500">Promedio</span>
            <span className="font-bold text-stone-500 tabular-nums">{averageScore}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-stone-400"
              initial={{ width: 0 }}
              animate={{ width: `${averageScore}%` }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.6 }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-500 leading-snug mt-4 text-center italic">
        Tu nivel está {userScore - averageScore} puntos por encima del promedio
      </p>
    </div>
  )
}
