export default function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {prefix}{p.value}
        </p>
      ))}
    </div>
  )
}
