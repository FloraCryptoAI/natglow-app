const P_DARK = '#E03594'

/**
 * "Tus respuestas" table — the person's real answers, labelled.
 *
 * Shared by the /quiz-cabello analysis screen and its results page so the two
 * can't drift apart. Renders nothing when there are no answers to show, and
 * getAnswerRows() already drops rows without a value, so there is never a
 * blank cell.
 *
 * @param {{ rows: Array<{ label: string, value: string }>, title?: string }} props
 */
export default function AnswerTable({ rows, title = 'Tus respuestas' }) {
  if (!rows?.length) return null
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: '#f0eeec', background: '#fff', boxShadow: '0 1px 3px rgba(23,23,23,0.04)' }}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-wider px-4 pt-3.5 pb-2" style={{ color: P_DARK }}>
        {title}
      </p>
      <dl className="flex flex-col">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-4 px-4 py-2.5"
            style={{ borderTop: '1px solid #f5f2f0', background: i % 2 ? '#fdfcfc' : '#fff' }}
          >
            <dt className="text-[13px] text-stone-500 flex-shrink-0">{r.label}</dt>
            <dd className="text-[13px] font-bold text-stone-800 text-right">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
