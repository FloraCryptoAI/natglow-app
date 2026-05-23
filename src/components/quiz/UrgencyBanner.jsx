import { AlertTriangle } from 'lucide-react'

export default function UrgencyBanner({ text }) {
  return (
    <div className="w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-white font-extrabold text-sm tracking-wide" style={{ background: '#C0392B' }}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <span className="leading-tight">{text}</span>
    </div>
  )
}
