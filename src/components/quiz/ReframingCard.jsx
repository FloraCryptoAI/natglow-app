export default function ReframingCard({ explanation, denials = [], affirmation, borderColor = '#27AE60', bgColor = '#E8F8F0' }) {
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="rounded-2xl p-4 border-2" style={{ borderColor, background: bgColor }}>
        <p className="text-sm text-stone-800 leading-snug font-medium text-center">{explanation}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {denials.map((text, i) => (
          <li key={i} className="flex items-center gap-3 text-base text-stone-700">
            <span className="text-lg flex-shrink-0">❌</span>
            <span>{text}</span>
          </li>
        ))}
        {affirmation && (
          <li className="flex items-center gap-3 text-base font-bold text-stone-900">
            <span className="text-lg flex-shrink-0">✅</span>
            <span>{affirmation}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
