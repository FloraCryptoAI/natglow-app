import { Lock } from 'lucide-react'
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData'
import { ESSENTIAL_CARDS, RECIPE_TAG, maskText } from '@/lib/cabelloRecipes'
import { getRiskyHabits } from '@/lib/resultsCabello'

// Locked recipe + habits cards, shared by the results page and the offer's
// "El comienzo ideal" section so the two can't drift apart. Every blurred value
// is rendered through maskText — the real words never reach the DOM.

const PL2 = '#FFE4F2'
const P_DARK = '#E03594'

// White card with the same soft border/shadow both pages already use.
function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ borderColor: '#f0eeec', background: '#fff', boxShadow: '0 1px 3px rgba(23,23,23,0.04)' }}
    >
      {children}
    </div>
  )
}

/** The 3 starting recipes, ingredients blurred. Renders nothing until the
 *  recipe library resolves. */
export function LockedRecipeCards({ answers }) { // eslint-disable-line no-unused-vars
  const { recipes } = useTranslatedHairData()
  const cards = ESSENTIAL_CARDS
    .map(c => ({ ...c, recipe: recipes?.find(r => r.id === c.id) }))
    .filter(c => c.recipe)
  if (cards.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {cards.map(c => (
        <Card key={c.id} className="p-4 flex flex-col gap-3">
          <span className="self-start text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded" style={{ background: PL2, color: P_DARK }}>
            {RECIPE_TAG}
          </span>

          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: PL2 }} aria-hidden>{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] text-stone-800 leading-snug" aria-label="Receta disponible en tu acceso">
                {c.nameParts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && ' '}
                    {part.b
                      ? <span className="select-none align-baseline" style={{ filter: 'blur(5px)' }} aria-hidden="true">{part.b}</span>
                      : part.t}
                  </span>
                ))}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: PL2, color: P_DARK }}>
                  {c.recipe.category}
                </span>
                {c.recipe.duration_minutes && (
                  <span className="text-[11px] text-stone-400">⏱️ {c.recipe.duration_minutes} min</span>
                )}
              </div>
              <p className="text-sm text-stone-500 leading-snug mt-1.5">{c.desc}</p>
            </div>
          </div>

          {/* Ingredients — visually locked until access. */}
          <div className="relative overflow-hidden rounded-xl" style={{ background: '#faf7f8' }}>
            <p className="text-sm text-stone-600 p-3 select-none" style={{ filter: 'blur(5px)' }} aria-hidden="true">
              {maskText((c.recipe.ingredients ?? []).join(' · ')) || 'xxxxxxxxxxx xxxxxxxxx'}
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white"
                    style={{ color: P_DARK, border: '1px solid #FFB3DD' }}>
                <Lock className="w-3 h-3" /> Ingredientes en tu acceso
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/** The "N hábitos en tu acceso" card — habit list blurred. */
export function LockedHabitsCard({ answers }) {
  const habits = getRiskyHabits(answers)
  return (
    <Card className="p-4">
      <div className="relative overflow-hidden rounded-xl">
        <div className="flex flex-col gap-2.5 p-1 select-none" style={{ filter: 'blur(5px)' }} aria-hidden="true">
          {habits.map((h, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: '#FFD6EE' }} />
              <p className="text-sm text-stone-600 leading-snug">{maskText(h)}</p>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white"
                style={{ color: P_DARK, border: '1px solid #FFB3DD' }}>
            <Lock className="w-3 h-3" /> {habits.length} hábitos en tu acceso
          </span>
        </div>
      </div>
    </Card>
  )
}
