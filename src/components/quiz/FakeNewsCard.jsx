export default function FakeNewsCard({ logoLabel, headline, subheadline, credit, imageUrl, imageAlt }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm">
      {imageUrl && (
        <div className="w-full bg-stone-100" style={{ aspectRatio: '16/9' }}>
          <img
            src={imageUrl}
            alt={imageAlt || ''}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      )}
      <div className="px-4 py-4 flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 self-start px-2.5 py-1 rounded text-white font-extrabold text-xs tracking-wider" style={{ background: '#C0392B' }}>
          {logoLabel}
        </div>
        <h3 className="text-base font-extrabold text-stone-900 leading-snug">{headline}</h3>
        {subheadline && <p className="text-sm text-stone-600 leading-snug">{subheadline}</p>}
        {credit && <p className="text-xs text-stone-400 mt-1">{credit}</p>}
      </div>
    </div>
  )
}
