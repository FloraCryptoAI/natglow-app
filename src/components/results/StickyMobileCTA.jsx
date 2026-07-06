import { motion } from 'framer-motion'

export default function StickyMobileCTA({ price, label, onClick, loading = false, gradient = 'linear-gradient(135deg, #27AE60, #1E8449)', shadow = 'rgba(39,174,96,0.4)', pulse = false }) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-3 bg-white border-t border-stone-200 md:hidden"
      style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}
    >
      <motion.button
        onClick={onClick}
        disabled={loading}
        animate={pulse && !loading ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full py-4 text-white font-extrabold rounded-full flex items-center justify-center gap-2.5 text-sm"
        style={{
          background: gradient,
          boxShadow: `0 4px 16px ${shadow}`,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <span className="uppercase tracking-wide">{label}</span>
        {price && <span className="opacity-90">· ${price}</span>}
      </motion.button>
    </motion.div>
  )
}
