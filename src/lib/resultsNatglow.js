// Personalization for the /quiz (natglow) results page.
//
// Mapped to THIS funnel's answer vocabulary:
//   hairType     liso | ondulado | cacheado | crespo
//   goals[]      frizz | brillo | quiebre | crecimiento | suavidad | ondas | puntas
//   washFreq     daily | 3_4 | 1_2
//   waterTemp    hot | warm | cold
//   heatTools    daily | few | rarely      (no "never" option in this quiz)
//   chemProducts frecuente | aveces | no
//   timeAvailable 10 | 20 | 30
//   hairLength   corto | hombros | medio | largo
//   profilePreference mujer | hombre | neutro
//
// Every function is pure with a safe fallback — never `undefined`, never a
// broken sentence, never a raw key. Language is possibility-based (Meta-safe):
// no diagnosis, damage claims, guarantees, follicles/toxins/detox.

// ── Base labels ─────────────────────────────────────────────────────────────
const HAIR_TYPE_LABEL = { liso: 'liso', ondulado: 'ondulado', cacheado: 'rizado', crespo: 'muy rizado' }
const GOAL_SHORT = {
  frizz: 'Menos frizz', brillo: 'Más brillo', quiebre: 'Menos quiebre',
  crecimiento: 'Crecimiento saludable', suavidad: 'Más suavidad',
  ondas: 'Ondas definidas', puntas: 'Puntas cuidadas',
}
const GOAL_SECONDARY = {
  frizz: 'menos frizz', brillo: 'más brillo', quiebre: 'menos quiebre',
  crecimiento: 'crecimiento saludable', suavidad: 'más suavidad',
  ondas: 'ondas definidas', puntas: 'puntas cuidadas',
}
const WASH_CHIP = { daily: 'Lavado diario', '3_4': '3 a 4 lavados por semana', '1_2': '1 a 2 lavados por semana' }
const TIME_CHIP = { '10': '10 minutos', '20': '20 minutos', '30': '30 minutos o más' }
const LENGTH_CHIP = { corto: 'Cabello corto', hombros: 'Cabello por los hombros', medio: 'Cabello medio', largo: 'Cabello largo' }
const WATER_CHIP = { hot: 'Agua muy caliente', warm: 'Agua tibia', cold: 'Agua fría' }
const TONE_CHIP  = { oscuro: 'Tono oscuro', castano: 'Tono castaño', claro: 'Tono claro', rojizo: 'Tono rojizo', canas: 'Con canas' }

export const toneLabel = (a) => TONE_CHIP[a?.hairTone] ?? null

export const hairTypeLabel = (a) => HAIR_TYPE_LABEL[a?.hairType] ?? 'natural'
export const primaryGoal   = (a) => (Array.isArray(a?.goals) && a.goals[0]) || a?.hairGoal || ''

export function displayName(a) {
  const raw = (a?.name ?? '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// ── Habit helpers ───────────────────────────────────────────────────────────
export const usesHeatOften  = (a) => a?.heatTools === 'daily' || a?.heatTools === 'few'
export const hasProcesses   = (a) => a?.chemProducts === 'frecuente' || a?.chemProducts === 'aveces'

// ── Section 1 · headline ────────────────────────────────────────────────────
const MAIN_CONCLUSION = {
  frizz:       'el control del frizz sin sobrecargar tu cabello',
  brillo:      'más brillo y movimiento con cuidados ligeros',
  quiebre:     'cuidados más suaves para ayudar a proteger el largo',
  crecimiento: 'la constancia y el cuidado del largo mientras crece',
  suavidad:    'una sensación más suave y fácil de mantener',
  ondas:       'hidratación y definición sin perder movimiento',
  puntas:      'más atención a las puntas y a la distribución de los productos',
}
export const getMainConclusion = (a) =>
  MAIN_CONCLUSION[primaryGoal(a)] ?? 'una rutina más organizada y compatible con tu día a día'

const ROUTINE_STYLE = { '10': 'breve y práctica', '20': 'equilibrada', '30': 'más completa' }
export const getRoutineStyle = (a) => ROUTINE_STYLE[a?.timeAvailable] ?? 'simple y organizada'

const WEEKLY_MOMENTS = {
  daily: 'tres momentos principales durante la semana',
  '3_4': 'dos o tres momentos durante la semana',
  '1_2': 'uno o dos momentos durante la semana',
}
export const getWeeklyMoments = (a) => WEEKLY_MOMENTS[a?.washFreq] ?? 'pocos momentos durante la semana'

const TIME_LABEL = { '10': 'unos 10 minutos', '20': 'unos 20 minutos', '30': '30 minutos o más' }
export const getTimeLabel = (a) => TIME_LABEL[a?.timeAvailable] ?? 'el tiempo que tienes disponible'

export function getHeadline(a) {
  const name = displayName(a)
  return name
    ? `${name}, tu rutina debería priorizar ${getMainConclusion(a)}`
    : `Tu rutina debería priorizar ${getMainConclusion(a)}`
}
export function getHeadlineSupport(a) {
  // Only append "de cuidado" when we have a real duration ("unos 20 minutos de
  // cuidado"); the generic fallback already reads as a full clause on its own.
  const known = !!TIME_LABEL[a?.timeAvailable]
  const timeClause = known ? `${getTimeLabel(a)} de cuidado` : 'el tiempo que tienes disponible'
  return `Según tus respuestas, una rutina ${getRoutineStyle(a)}, distribuida en ${getWeeklyMoments(a)} y compatible con ${timeClause} puede encajar mejor contigo.`
}

// ── Section 1 · chips (5, real answers) ─────────────────────────────────────
// 5th chip priority: frequent heat → salon process → length → water temp.
export function getChips(a) {
  const chips = []
  if (a?.hairType)      chips.push(`Cabello ${hairTypeLabel(a)}`)
  if (TONE_CHIP[a?.hairTone])     chips.push(TONE_CHIP[a.hairTone])
  if (GOAL_SHORT[primaryGoal(a)]) chips.push(GOAL_SHORT[primaryGoal(a)])
  if (WASH_CHIP[a?.washFreq])     chips.push(WASH_CHIP[a.washFreq])
  if (TIME_CHIP[a?.timeAvailable]) chips.push(TIME_CHIP[a.timeAvailable])

  let extra = null
  if (usesHeatOften(a))                 extra = 'Uso frecuente de calor'
  else if (hasProcesses(a))             extra = 'Proceso de salón'
  else if (LENGTH_CHIP[a?.hairLength])  extra = LENGTH_CHIP[a.hairLength]
  else if (WATER_CHIP[a?.waterTemp])    extra = WATER_CHIP[a.waterTemp]
  if (extra) chips.push(extra)

  return chips
}

// "También quieres priorizar: a, b y c." — max 3, never repeats the main goal.
export function getSecondaryGoalsSentence(a) {
  const main = primaryGoal(a)
  const list = (Array.isArray(a?.goals) ? a.goals : [])
    .filter(g => g !== main)
    .map(g => GOAL_SECONDARY[g])
    .filter(Boolean)
    .slice(0, 3)
  if (list.length === 0) return null
  const text = list.length === 1
    ? list[0]
    : `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
  return `También quieres priorizar: ${text}.`
}

// ── Section 1 · initial focus card ──────────────────────────────────────────
const INITIAL_FOCUS = {
  frizz:       'hidratación ligera, una aplicación más uniforme y menos exceso de productos',
  brillo:      'cuidados ligeros, constancia y una distribución más equilibrada de los productos',
  quiebre:     'manejo suave, menos manipulación y cuidados que ayuden a proteger el largo',
  crecimiento: 'constancia, cuidado de las puntas y hábitos que faciliten mantener el largo',
  suavidad:    'hidratación gradual y cuidados que aporten una sensación más suave al tacto',
  ondas:       'un equilibrio entre hidratación, definición y ligereza',
  puntas:      'más atención a las puntas, cantidades adecuadas y menor acumulación de productos',
}
export function getInitialFocusText(a) {
  const focus = INITIAL_FOCUS[primaryGoal(a)] ?? 'una secuencia sencilla de limpieza, hidratación y mantenimiento'
  let text = `Para comenzar, conviene priorizar ${focus}. La idea no es hacer más cosas, sino distribuir mejor los cuidados según tu tipo de cabello, tus hábitos y el tiempo que tienes disponible.`
  if (usesHeatOften(a)) text += ' También consideramos cuidados antes y después del uso de calor.'
  if (hasProcesses(a))  text += ' Además, la rutina debe avanzar de forma gradual por los procesos que seleccionaste.'
  return text
}

// ── Section 2 · three reason cards ──────────────────────────────────────────
const HAIR_TYPE_REASON = {
  liso:     'El cabello liso suele sentirse mejor con cuidados ligeros y bien distribuidos, evitando una sensación pesada por exceso de productos.',
  ondulado: 'El cabello ondulado puede beneficiarse de un equilibrio entre hidratación, ligereza y cuidados que acompañen su movimiento natural.',
  cacheado: 'El cabello rizado suele pedir hidratación, definición y una manipulación más suave durante la semana.',
  crespo:   'El cabello muy rizado puede beneficiarse de hidratación gradual, manejo suave y cuidados que faciliten el desenredo.',
}
export const getHairTypeReason = (a) =>
  HAIR_TYPE_REASON[a?.hairType] ?? 'Tu tipo de cabello será considerado al organizar la frecuencia, la aplicación y las cantidades sugeridas.'

export function getHabitReason(a) {
  if (a?.heatTools === 'daily')      return 'Como utilizas herramientas de calor con frecuencia, incluiremos una distribución que considere cuidados antes y después de su uso.'
  if (a?.heatTools === 'few')        return 'Como utilizas calor en determinados días, la guía puede organizar cuidados compatibles con esos momentos.'
  if (a?.chemProducts === 'frecuente') return 'Como tu cabello pasa por procesos de salón, conviene avanzar con una rutina más gradual y fácil de acompañar.'
  if (a?.washFreq === 'daily')       return 'Como lavas tu cabello todos los días, conviene distribuir cuidados ligeros sin concentrar todo en un solo momento.'
  // This quiz's lowest heat option is "Raramente" (there's no "never"), so the
  // copy says "casi no" — claiming "no utilizas" would state something the
  // person didn't actually answer.
  if (a?.heatTools === 'rarely' && a?.chemProducts === 'no') return 'Como casi no utilizas calor ni procesos actualmente, podremos concentrar la rutina en tus metas principales.'
  return 'Tus hábitos actuales ayudan a definir la frecuencia y el orden de los cuidados.'
}

const TIME_REASON = {
  '10': 'Tu rutina debe ser breve, objetiva y fácil de repetir incluso en días ocupados.',
  '20': 'Puedes combinar cuidados rápidos con uno o dos momentos más completos durante la semana.',
  '30': 'Tu tiempo permite incluir etapas más completas sin necesidad de hacer todo en el mismo día.',
}
export const getTimeReason = (a) =>
  TIME_REASON[a?.timeAvailable] ?? 'La rutina será organizada para que sea posible mantenerla dentro de tu día a día.'

// ── Section 3 · first stage (moment 2 text) ─────────────────────────────────
const FIRST_STAGE_CARE = {
  frizz:       'Incluir un cuidado principal con foco en hidratación ligera y manejo.',
  brillo:      'Combinar un cuidado ligero con pasos que favorezcan brillo y movimiento.',
  quiebre:     'Priorizar manejo suave y cuidados que ayuden a proteger el largo.',
  crecimiento: 'Organizar cuidados para mantener las puntas y el largo mientras crece.',
  suavidad:    'Incluir un cuidado que aporte una sensación más suave al tacto.',
  ondas:       'Equilibrar hidratación y definición según la forma natural del cabello.',
  puntas:      'Dar más atención a las puntas y a la distribución de los productos.',
}
export const getFirstStageCareText = (a) =>
  FIRST_STAGE_CARE[primaryGoal(a)] ?? 'Incluir un cuidado principal compatible con tu objetivo.'

// ── Section 4 · community copy by profile ───────────────────────────────────
export function getCommunityCopy(a) {
  return a?.profilePreference === 'mujer'
    ? 'Un espacio para compartir publicaciones, experiencias y comentarios con otras usuarias.'
    : 'Un espacio para compartir publicaciones, experiencias y comentarios con otras personas de la comunidad.'
}

// ── Recipe pick (3 real recipes from the 26-recipe library) ─────────────────
// Maps this quiz's goals onto the recipe `problems` vocabulary in hairData.js
// (dry | frizz | breakage | hair_loss | no_growth).
const GOAL_PROBLEMS = {
  frizz:       ['frizz'],
  brillo:      ['dry'],
  quiebre:     ['breakage'],
  crecimiento: ['no_growth', 'hair_loss'],
  suavidad:    ['dry'],
  ondas:       ['frizz', 'dry'],
  puntas:      ['breakage', 'dry'],
}

// Some natural ingredients shift colour (coffee/cocoa darken, lemon lightens).
// We only DE-PRIORITISE them for tones where that's unwanted — never hard-exclude,
// so there are always 3 recipes to show.
const TONE_PENALTY = {
  claro:  ['cafe-estimulo'],                   // coffee can darken light hair
  canas:  ['cafe-estimulo'],                   // coffee can stain greys
  oscuro: ['aloe-limoneno'],                   // lemon can lighten dark hair
}

const TAG_BONUS = { ultra: 2, eficiente: 1, complementar: 0, opcional: -1 }

/**
 * Pick 3 recipes that best match the answers.
 * @param {object} a answers
 * @param {Array}  recipes translated recipe list (from useTranslatedHairData)
 */
export function pickRecipes(a, recipes) {
  if (!Array.isArray(recipes) || recipes.length === 0) return []

  const main = primaryGoal(a)
  const mainProblems = GOAL_PROBLEMS[main] ?? []
  const secondaryProblems = (Array.isArray(a?.goals) ? a.goals.slice(1) : [])
    .flatMap(g => GOAL_PROBLEMS[g] ?? [])
  const penalised = TONE_PENALTY[a?.hairTone] ?? []

  const scored = recipes.map((r, i) => {
    const problems = Array.isArray(r.problems) ? r.problems : []
    let score = 0
    for (const p of mainProblems)      if (problems.includes(p)) score += 4
    for (const p of secondaryProblems) if (problems.includes(p)) score += 1
    score += TAG_BONUS[r.tag] ?? 0
    if (penalised.includes(r.id)) score -= 5
    return { r, score, i }
  })

  // Stable sort: score desc, then original order (keeps output deterministic).
  scored.sort((x, y) => (y.score - x.score) || (x.i - y.i))

  // Prefer variety: avoid 3 recipes from the same category when possible.
  const picked = []
  const usedCategories = new Set()
  for (const { r } of scored) {
    if (picked.length >= 3) break
    if (usedCategories.has(r.category)) continue
    picked.push(r)
    usedCategories.add(r.category)
  }
  for (const { r } of scored) {           // top up if categories ran out
    if (picked.length >= 3) break
    if (!picked.includes(r)) picked.push(r)
  }
  return picked.slice(0, 3)
}

// Tone worded to fit the subtitle sentence ("…y tus canas" reads right, while
// "…y tu con canas" would not).
const TONE_PHRASE = {
  oscuro: 'tu tono oscuro', castano: 'tu tono castaño', claro: 'tu tono claro',
  rojizo: 'tu tono rojizo', canas: 'tus canas',
}

// Subtitle for the recipes section — mentions the tone only when we have it.
export function getRecipesSubtitle(a) {
  const tone = TONE_PHRASE[a?.hairTone]
  const base = `Seleccionadas dentro de la biblioteca de 26 recetas, según tu cabello ${hairTypeLabel(a)}`
  return tone ? `${base} y ${tone}.` : `${base} y tu meta principal.`
}
