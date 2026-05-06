// steps: Array<{ label, count, color }>
// maxDropIdx: index of step with biggest drop (shows ⚠️ and ring) — pass -1 to disable
// showTotal: show "X% do total" alongside the count
export default function FunnelBars({ steps = [], maxDropIdx = -1, showTotal = false }) {
  const first = steps[0]?.count ?? 0

  function dropColor(pct) {
    if (pct <= 20) return 'text-emerald-600 bg-emerald-50'
    if (pct <= 40) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  if (!steps.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Nenhum evento registrado no período selecionado.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const count    = step.count ?? 0
        const widthPct = first > 0 ? Math.max((count / first) * 100, 0) : 0
        const prevCount = i > 0 ? (steps[i - 1]?.count ?? 0) : count
        const fromPrev = prevCount > 0 ? (count / prevCount) * 100 : 0
        const dropPct  = 100 - fromPrev
        const fromTotal = first > 0 ? (count / first) * 100 : 0
        const isBiggestDrop = i === maxDropIdx

        return (
          <div key={step.label + i}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-2 px-1">
                <div className="w-0.5 h-6 bg-gray-200 ml-2 flex-shrink-0" />
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isBiggestDrop
                      ? 'text-red-600 bg-red-50 ring-1 ring-red-200'
                      : dropColor(dropPct)
                  }`}
                >
                  {isBiggestDrop && '⚠️ '}
                  -{dropPct.toFixed(1)}% (−{(prevCount - count).toLocaleString()} usuárias)
                  {isBiggestDrop && ' maior queda'}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{step.label}</span>
                <div className="flex items-center gap-3">
                  {showTotal && (
                    <span className="text-xs text-gray-400">{fromTotal.toFixed(1)}% do total</span>
                  )}
                  <span className="text-base font-extrabold text-gray-900 tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-8 bg-gray-100 rounded-xl overflow-hidden">
                <div
                  className="h-full rounded-xl transition-all duration-700"
                  style={{
                    width: `${Math.max(widthPct, count > 0 ? 2 : 0)}%`,
                    background: step.color,
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}

      {first === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhum evento registrado no período selecionado.
        </p>
      )}
    </div>
  )
}
