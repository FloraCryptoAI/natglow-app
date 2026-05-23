import { AlertTriangle } from 'lucide-react'

export default function ScientificCard({ badge, body, imageUrl, imageAlt }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border-2" style={{ borderColor: '#C0392B', background: '#FDEDEC' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#C0392B', color: '#fff' }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="font-extrabold text-sm tracking-wide">{badge}</span>
      </div>
      <div className="p-4 flex gap-3 items-start">
        <p className="text-sm text-stone-800 leading-snug flex-1">{body}</p>
        {imageUrl && (
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
            <img
              src={imageUrl}
              alt={imageAlt || ''}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
