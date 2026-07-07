import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'

const GREEN = '#27AE60'
const RED = '#C0392B'

export default function BeforeAfterTestimonialCarousel({ testimonials = [], verifiedBadgeTemplate = '🌿 RESULTADO EN {{duration}} · VERIFICADO', beforeLabel = 'ANTES', afterLabel = 'DESPUÉS', cardBorder = 'border-stone-200' }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!testimonials.length) return
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  if (!testimonials.length) return null
  const t = testimonials[index]
  const badge = verifiedBadgeTemplate.replace('{{duration}}', t.duration)

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
          className={`w-full rounded-2xl overflow-hidden bg-white border ${cardBorder} shadow-sm flex flex-col`}
        >
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-white text-lg" style={{ background: `linear-gradient(135deg, ${GREEN}, #1E8449)` }}>
              {t.name?.charAt(0) || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-stone-900 text-sm leading-tight">{t.name}</p>
              <p className="text-xs text-stone-500 leading-tight">{t.location}</p>
              <div className="flex items-center gap-0.5 mt-1">
                {[0,1,2,3,4].map(i => (
                  <Star key={i} className="w-3.5 h-3.5" style={{ color: '#F1C40F', fill: '#F1C40F' }} />
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 pb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider text-white" style={{ background: GREEN }}>
              {badge}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-0.5 bg-stone-100 mt-2">
            <div className="relative">
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-white text-[10px] font-extrabold z-10 max-w-[85%] leading-tight" style={{ background: RED }}>{beforeLabel}</span>
              <div className="bg-stone-200" style={{ aspectRatio: '3/4' }}>
                <img
                  src={t.antes}
                  alt="antes"
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-white text-[10px] font-extrabold z-10 max-w-[85%] leading-tight" style={{ background: GREEN }}>{afterLabel}</span>
              <div className="bg-stone-200" style={{ aspectRatio: '3/4' }}>
                <img
                  src={t.depois}
                  alt="después"
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm text-stone-700 leading-relaxed italic">"{t.text}"</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{ background: i === index ? GREEN : '#e7e5e4' }}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
