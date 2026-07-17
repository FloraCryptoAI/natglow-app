// Personalization for the /quiz-cabello results page.
//
// This funnel is the "recetas caseras" angle: shorter, simpler, focused on the
// 3 starting recipes. Unlike /quiz's results — which score the 26-recipe library
// against the answers — this page always shows the app's 3 essential recipes
// (see ESSENTIAL_CARDS in ResultsCabello.jsx), so there is no picker here.
//
//   hairType     liso | ondulado | cacheado | crespo
//   hairTone     oscuro | castano | claro | rojizo | canas
//   goals[]      frizz | brillo | quiebre | crecimiento | suavidad | ondas | puntas
//   washFreq     daily | 3_4 | 1_2
//   concerns[]   frizz | brillo | seco | puntas | volumen | quiebre | grasa |
//                largo | peinar | definicion            (this funnel only)
//
// Language is possibility-based (Meta-safe): no diagnosis, no damage claims,
// no guarantees, no "exclusivo/científico/clínico".

import { primaryGoal, displayName } from '@/lib/resultsNatglow'

export { primaryGoal, displayName }

const GOAL_SHORT = {
  frizz: 'Menos frizz', brillo: 'Más brillo', quiebre: 'Menos quiebre',
  crecimiento: 'Crecimiento saludable', suavidad: 'Más suavidad',
  ondas: 'Ondas definidas', puntas: 'Puntas cuidadas',
}
// Step 16 — "¿Qué aspectos de tu cabello te preocupan más hoy?"
const CONCERN_CHIP = {
  frizz: 'Frizz', brillo: 'Poco brillo', seco: 'Se siente seco',
  puntas: 'Puntas resecas', volumen: 'Poco volumen', quiebre: 'Se quiebra con facilidad',
  grasa: 'Raíz con grasa', largo: 'Cuesta mantener el largo',
  peinar: 'Difícil de peinar', definicion: 'Poca definición',
}

/** Main concern = first selected concern we have a label for. */
export function primaryConcern(a) {
  const list = Array.isArray(a?.concerns) ? a.concerns : []
  return list.find(c => CONCERN_CHIP[c]) ?? ''
}

// Value labels for the answer table (bare values — the row carries the label).
const HAIR_TYPE_VALUE = { liso: 'Liso', ondulado: 'Ondulado', cacheado: 'Rizado', crespo: 'Muy rizado' }
const TONE_VALUE = { oscuro: 'Oscuro', castano: 'Castaño', claro: 'Claro', rojizo: 'Rojizo', canas: 'Con canas' }
const LENGTH_VALUE = { corto: 'Corto', hombros: 'Por los hombros', medio: 'Medio', largo: 'Largo' }
const WASH_VALUE = { daily: 'Todos los días', '3_4': '3 a 4 veces por semana', '1_2': '1 a 2 veces por semana' }
const HEAT_VALUE = { daily: 'Todos los días', few: 'Algunos días', rarely: 'Casi nunca' }
const CHEM_VALUE = { frecuente: 'Con frecuencia', aveces: 'A veces', no: 'No uso' }

/**
 * Rows for the answer table: [label, value]. Only rows we actually have an
 * answer for are returned, so the table never shows a blank cell.
 * @param {object} a answers
 * @returns {Array<{ label: string, value: string }>}
 */
export function getAnswerRows(a) {
  const concern = primaryConcern(a)
  const goalKey = primaryGoal(a)
  const rows = [
    { label: 'Tipo de cabello',    value: HAIR_TYPE_VALUE[a?.hairType] },
    { label: 'Tono',               value: TONE_VALUE[a?.hairTone] },
    { label: 'Largo',              value: LENGTH_VALUE[a?.hairLength] },
    { label: 'Principal molestia', value: concern ? CONCERN_CHIP[concern] : undefined },
    { label: 'Meta principal',     value: GOAL_SHORT[goalKey] },
    { label: 'Lavado',             value: WASH_VALUE[a?.washFreq] },
    { label: 'Uso de calor',       value: HEAT_VALUE[a?.heatTools] },
    { label: 'Procesos químicos',  value: CHEM_VALUE[a?.chemProducts] },
  ]
  return rows.filter(r => !!r.value)
}

// "🌿 Tu punto de partida" — one sentence per main goal.
const STARTING_POINT = {
  frizz:       'Tu selección inicial debe priorizar hidratación ligera y cuidados fáciles de distribuir durante la semana.',
  brillo:      'Tu selección inicial debe priorizar cuidados ligeros que acompañen el brillo y el movimiento.',
  quiebre:     'Tu selección inicial debe priorizar manejo suave y cuidados que ayuden a proteger el largo.',
  crecimiento: 'Tu selección inicial debe priorizar constancia y más atención a las puntas.',
  suavidad:    'Tu selección inicial debe priorizar hidratación gradual y una sensación más suave al tacto.',
  ondas:       'Tu selección inicial debe equilibrar hidratación y definición.',
  puntas:      'Tu selección inicial debe dar más atención a las puntas y a la cantidad utilizada.',
}
export const getStartingPointText = (a) =>
  STARTING_POINT[primaryGoal(a)] ?? 'Tu selección inicial debe ser sencilla, organizada y fácil de mantener.'

// ── Habits section ──────────────────────────────────────────────────────────
// Derived from real answers only. Possibility-based wording ("pueden estar
// afectando"), never a diagnosis or a damage claim.
const HABIT_BY_ANSWER = [
  { when: a => a?.waterTemp === 'hot',        text: 'Lavar el cabello con agua muy caliente' },
  { when: a => a?.heatTools === 'daily',      text: 'Uso diario de plancha, secador o rizador' },
  { when: a => a?.heatTools === 'few',        text: 'Uso frecuente de herramientas de calor' },
  { when: a => a?.washFreq === 'daily',       text: 'Lavado diario del cabello' },
  { when: a => a?.chemProducts === 'frecuente', text: 'Procesos químicos frecuentes (tinte, decoloración o alisado)' },
  { when: a => a?.chemProducts === 'aveces',  text: 'Procesos químicos ocasionales sin cuidados de apoyo' },
  { when: a => a?.hesitation === 'despues',   text: 'Dejar los cuidados para después y perder la constancia' },
  { when: a => a?.hesitation === 'cual',      text: 'Probar recetas sin saber cuál encaja con tu cabello' },
  { when: a => a?.recipeExperience === 'ninguna', text: 'Cuidar el cabello sin una rutina definida' },
  { when: a => a?.feeling === 'mejorar',      text: 'Probar cosas diferentes sin seguir un orden' },
]
// Shown only to top the list up to 3 — generic but still true for the funnel's
// audience, so the section is never thin or empty.
const HABIT_FALLBACK = [
  'Cambiar de producto sin una frecuencia definida',
  'Aplicar cuidados sin considerar tu tipo de cabello',
  'Usar más cantidad de producto de la necesaria',
]

/**
 * Habits from the answers that may be working against the person's goals.
 * Always returns at least 3 items (topped up with generic ones), max 5.
 * @param {object} a answers
 * @returns {string[]}
 */
export function getRiskyHabits(a) {
  const found = HABIT_BY_ANSWER.filter(h => h.when(a)).map(h => h.text)
  for (const f of HABIT_FALLBACK) {
    if (found.length >= 3) break
    if (!found.includes(f)) found.push(f)
  }
  return found.slice(0, 5)
}
