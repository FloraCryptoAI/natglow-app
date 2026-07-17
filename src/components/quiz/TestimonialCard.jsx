import { Star } from 'lucide-react'

export default function TestimonialCard({
  avatarUrl,
  name,
  location,
  text,
  beforeUrl,
  afterUrl,
  beforeLabel = 'ANTES',
  afterLabel = 'DESPUÉS',
  showLabels = true,
  showStars = true,
  cardBorder = 'border-stone-200',
}) {
  return (
    <div className={`w-full rounded-2xl overflow-hidden border ${cardBorder} bg-white shadow-sm flex flex-col`}>
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 flex-shrink-0">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-stone-900">{name}</p>
          <p className="text-xs text-stone-500">{location}</p>
          {showStars && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[0,1,2,3,4].map(i => (
                <Star key={i} className="w-3.5 h-3.5" style={{ color: '#F1C40F', fill: '#F1C40F' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {(beforeUrl || afterUrl) && (
        <div className="grid grid-cols-2 gap-0.5 bg-stone-100">
          <div className="relative">
            {showLabels && <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-white text-xs font-extrabold z-10" style={{ background: '#C0392B' }}>{beforeLabel}</span>}
            <div className="bg-stone-200" style={{ aspectRatio: '3/4' }}>
              {beforeUrl && (
                <img
                  src={beforeUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}
            </div>
          </div>
          <div className="relative">
            {showLabels && <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-white text-xs font-extrabold z-10" style={{ background: '#27AE60' }}>{afterLabel}</span>}
            <div className="bg-stone-200" style={{ aspectRatio: '3/4' }}>
              {afterUrl && (
                <img
                  src={afterUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        <p className="text-sm text-stone-700 leading-relaxed italic">"{text}"</p>
      </div>
    </div>
  )
}
