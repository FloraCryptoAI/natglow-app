import { AlertCircle } from 'lucide-react'
import { ArrowClockwise } from '@phosphor-icons/react'

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-600 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 flex-shrink-0"
        >
          <ArrowClockwise size={14} weight="fill" /> Tentar novamente
        </button>
      )}
    </div>
  )
}
