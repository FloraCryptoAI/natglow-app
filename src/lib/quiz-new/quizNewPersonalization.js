// Result personalization for /quiz-new. Every function is pure and has a safe
// fallback so a missing answer never produces a broken/empty sentence. Language
// is always possibility-based — never damage/disease/guarantee (Meta-safe).

// ── Labels ──────────────────────────────────────────────────────────────────
const HAIR_TYPE_LABEL = { liso: 'liso', ondulado: 'ondulado', rizado: 'rizado', muy_rizado: 'muy rizado' }

const PRIMARY_GOAL_LABEL = {
  frizz: 'reducir el frizz',
  brillo: 'más brillo y movimiento',
  suavidad: 'una sensación más suave',
  puntas: 'el cuidado de las puntas',
  peinado: 'facilitar el peinado',
  definicion: 'definir ondas o rizos',
  constancia: 'mantener una rutina constante',
  largo: 'cuidar el largo mientras crece',
}

const SECONDARY_GOAL_LABEL = {
  frizz: 'menos frizz', brillo: 'más brillo', suavidad: 'más suavidad',
  puntas: 'puntas cuidadas', peinado: 'facilidad al peinar', definicion: 'definición',
  constancia: 'constancia', largo: 'cuidado del largo',
}

const WASH_LABEL = {
  diario: 'todos los días', '3_4': '3 a 4 veces por semana',
  '1_2': '1 a 2 veces por semana', menos: 'menos de una vez por semana',
}
const WASH_SHORT = {
  diario: 'Lavado diario', '3_4': '3 a 4 lavados por semana',
  '1_2': '1 a 2 lavados por semana', menos: 'Lavados espaciados',
}

const TIME_LABEL = {
  '10': 'hasta 10 minutos', '15_20': 'entre 15 y 20 minutos',
  '30': 'hasta 30 minutos', fines: 'más tiempo los fines de semana',
}

const HEAT_CHIP = {
  casi_diario: 'Uso frecuente de calor', algunas: 'Uso de calor algunos días',
  ocasional: 'Uso ocasional de calor', no: 'Sin uso de calor',
}

export const hairTypeLabel      = (a) => HAIR_TYPE_LABEL[a?.hairType] ?? 'natural'
export const primaryGoal        = (a) => (Array.isArray(a?.goals) ? a.goals[0] : '') || ''
export const primaryGoalLabel   = (a) => PRIMARY_GOAL_LABEL[primaryGoal(a)] ?? 'tus metas de cuidado'
export const washFrequencyLabel = (a) => WASH_LABEL[a?.washFrequency] ?? 'con tu frecuencia habitual'
export const availableTimeLabel = (a) => TIME_LABEL[a?.availableTime] ?? 'el tiempo que tienes disponible'

export function secondaryGoals(a) {
  const goals = Array.isArray(a?.goals) ? a.goals.slice(1) : []
  return goals.map(g => SECONDARY_GOAL_LABEL[g]).filter(Boolean)
}

export function displayName(a) {
  const raw = (a?.name ?? '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// ── Habit helpers ───────────────────────────────────────────────────────────
const usesHeat        = (a) => a?.heatUse && a.heatUse !== 'no'
const usesHeatOften   = (a) => a?.heatUse === 'casi_diario' || a?.heatUse === 'algunas'
const hasProcesses    = (a) => Array.isArray(a?.chemicalProcesses) && a.chemicalProcesses.some(v => v && v !== 'ninguno')

export { usesHeat, hasProcesses }

// ── Result header ───────────────────────────────────────────────────────────
export function headerTitle(a) {
  const name = displayName(a) || 'Hola'
  return `${name}, organizamos una rutina pensada para tu cabello ${hairTypeLabel(a)} y tus metas`
}
export function headerText(a) {
  return `Considerando que quieres priorizar ${primaryGoalLabel(a)}, lavas tu cabello ${washFrequencyLabel(a)} y dispones de ${availableTimeLabel(a)}, preparamos un punto de partida compatible con tu rutina actual.`
}

// ── Observation card 1: hair type ───────────────────────────────────────────
const HAIR_OBS = {
  liso: 'Tu cabello liso puede beneficiarse de cuidados ligeros y bien distribuidos, evitando una sensación pesada por exceso de productos.',
  ondulado: 'En el cabello ondulado, el equilibrio entre hidratación y ligereza puede ayudar a mantener el movimiento y facilitar la definición.',
  rizado: 'El cabello rizado suele pedir una rutina que combine hidratación, definición y menor manipulación durante la semana.',
  muy_rizado: 'Una rutina para cabello muy rizado puede priorizar hidratación, manejo suave y cuidados que faciliten el desenredo.',
}
export function getHairTypeObservation(a) {
  return HAIR_OBS[a?.hairType] ?? 'Adaptamos las recomendaciones a tu tipo de cabello para que la rutina resulte más compatible contigo.'
}

// ── Observation card 2: habits ──────────────────────────────────────────────
export function getHabitObservation(a) {
  if (usesHeatOften(a)) return 'Como utilizas herramientas de calor con frecuencia, incluiremos recomendaciones para organizar mejor los cuidados antes y después de su uso.'
  if (hasProcesses(a))  return 'Como tu cabello pasa por procesos de salón, priorizaremos una rutina más gradual y fácil de acompañar.'
  if (a?.washFrequency === 'diario') return 'Como lavas tu cabello todos los días, la recomendación debe distribuir cuidados ligeros sin concentrar todo en un solo momento.'
  if (a?.heatUse === 'no' && !hasProcesses(a)) return 'Como no utilizas calor ni procesos actualmente, podremos concentrar la guía en tus metas principales y en la constancia semanal.'
  return 'Consideramos tus hábitos de lavado y cuidado para organizar una rutina más fácil de mantener durante la semana.'
}

// ── Observation card 3: time / practicality ─────────────────────────────────
const PRACTICALITY = {
  '10': 'Tu guía debe ser breve y objetiva, con pasos que puedas realizar incluso en días ocupados.',
  '15_20': 'Tu tiempo disponible permite combinar cuidados rápidos con uno o dos momentos más completos durante la semana.',
  '30': 'Tu tiempo disponible permite incluir etapas más completas sin necesidad de realizar todo en el mismo día.',
  fines: 'Podemos concentrar los cuidados principales en días específicos y mantener pasos más simples durante la semana.',
}
export function getPracticalityObservation(a) {
  return PRACTICALITY[a?.availableTime] ?? 'Organizamos los cuidados para que se adapten al tiempo que tienes disponible.'
}

// ── Starting point ──────────────────────────────────────────────────────────
const ROUTINE_INTENSITY = { '10': 'breve y práctica', '15_20': 'equilibrada', '30': 'más completa', fines: 'concentrada en días específicos' }
const RECOMMENDED_FREQ = {
  diario: '3 momentos de cuidado por semana', '3_4': '2 o 3 momentos de cuidado por semana',
  '1_2': '2 momentos de cuidado por semana', menos: '1 o 2 momentos de cuidado por semana',
}
const INITIAL_FOCUS = {
  frizz: 'organizar hidratación, aplicación y manejo para reducir la apariencia del frizz',
  brillo: 'combinar cuidados ligeros que favorezcan brillo y movimiento',
  suavidad: 'priorizar cuidados que aporten una sensación más suave al tacto',
  puntas: 'dar más atención a las puntas y a la distribución de los productos',
  peinado: 'simplificar el manejo y facilitar el peinado durante la semana',
  definicion: 'equilibrar hidratación y definición sin sobrecargar el cabello',
  constancia: 'crear una secuencia fácil de repetir semana a semana',
  largo: 'cuidar el largo y mantener una rutina constante mientras el cabello crece',
}
export const getRoutineIntensity   = (a) => ROUTINE_INTENSITY[a?.availableTime] ?? 'equilibrada'
export const getRecommendedFrequency = (a) => RECOMMENDED_FREQ[a?.washFrequency] ?? '2 momentos de cuidado por semana'
export const getInitialFocus       = (a) => INITIAL_FOCUS[primaryGoal(a)] ?? 'crear una secuencia fácil de repetir semana a semana'

export function getStartingPointText(a) {
  return `Para empezar, te conviene una rutina ${getRoutineIntensity(a)} distribuida en aproximadamente ${getRecommendedFrequency(a)}, con cuidados de ${availableTimeLabel(a)}. El enfoque inicial será ${getInitialFocus(a)}.`
}

// ── Profile language (community wording) ────────────────────────────────────
export function getProfileLanguage(a) {
  const neutral = a?.profilePreference === 'hombre' || a?.profilePreference === 'neutro'
  return { communityAudience: neutral ? 'otras personas de la comunidad' : 'otras usuarias' }
}

// ── Prepared-content cards (some conditional) ───────────────────────────────
export function getPreparedContentBlocks(a) {
  const { communityAudience } = getProfileLanguage(a)
  const blocks = [
    { icon: '📅', title: 'Plan semanal personalizado', text: 'Una secuencia organizada según tus hábitos y tiempo disponible.' },
    { icon: '📖', title: 'Selección dentro de una biblioteca de 26 recetas', text: 'Recetas y cuidados organizados para que encuentres opciones compatibles con tus preferencias.' },
    { icon: '🛒', title: 'Ingredientes y alternativas', text: 'Opciones simples para adaptar la rutina a lo que tienes disponible.' },
  ]
  if (usesHeat(a)) blocks.push({ icon: '♨️', title: 'Recomendaciones para el uso de calor', text: 'Orientaciones para organizar cuidados antes y después de usar plancha, secador o rizador.' })
  if (hasProcesses(a)) blocks.push({ icon: '🎨', title: 'Recomendaciones para cabello con procesos', text: 'Sugerencias para mantener una rutina gradual y fácil de acompañar.' })
  blocks.push({ icon: '💬', title: 'Comunidad dentro de la aplicación', text: `Un espacio para compartir experiencias, publicaciones y comentarios con ${communityAudience}.` })
  blocks.push({ icon: '📊', title: 'Acompañamiento del progreso', text: 'Visualiza las etapas del plan y acompaña tu avance dentro de la aplicación.' })
  return blocks
}

// ── Dynamic chips (edu3 + loading) ──────────────────────────────────────────
export function getAnswerChips(a) {
  const chips = []
  if (a?.hairType) chips.push(`Cabello ${hairTypeLabel(a)}`)
  if (primaryGoal(a)) chips.push(`Meta: ${SECONDARY_GOAL_LABEL[primaryGoal(a)] ?? primaryGoalLabel(a)}`)
  if (a?.washFrequency) chips.push(WASH_SHORT[a.washFrequency])
  if (a?.availableTime) chips.push(TIME_LABEL[a.availableTime] ? TIME_LABEL[a.availableTime].charAt(0).toUpperCase() + TIME_LABEL[a.availableTime].slice(1) : null)
  if (a?.heatUse) chips.push(HEAT_CHIP[a.heatUse])
  return chips.filter(Boolean)
}

// Profile summary rows for ResultProfileSummary
export function getProfileSummary(a) {
  return [
    { label: 'Tipo de cabello',       value: cap(hairTypeLabel(a)) },
    { label: 'Prioridad principal',   value: cap(primaryGoalLabel(a)) },
    { label: 'Frecuencia de lavado',  value: cap(washFrequencyLabel(a)) },
    { label: 'Tiempo disponible',     value: cap(availableTimeLabel(a)) },
  ]
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
