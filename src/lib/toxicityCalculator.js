// Calculates a personalized toxicity score (65-96%) from quiz answers
// + diagnostic factor list to display on the diagnosis page.
//
// Score baseline 50, then adds points per answer. Floor 65, ceiling 96
// — every user always gets a "high" reading (psychologically: never reassure
// the user they're fine), but never 100% (avoids feeling fake).

export function calculateToxicityScore(answers = {}) {
  let score = 50

  const ageScore = { '18_29': 5, '30_39': 8, '40_49': 12, '50_plus': 15 }
  score += ageScore[answers.age] ?? 8

  const washScore = { daily: 10, '3_4': 6, '1_2': 2 }
  score += washScore[answers.washFreq] ?? 5

  const waterScore = { hot: 8, warm: 4, cold: 0 }
  score += waterScore[answers.waterTemp] ?? 4

  const heatScore = { daily: 8, few: 4, rarely: 0 }
  score += heatScore[answers.heatTools] ?? 3

  const hydroScore = { regularly: 0, sometimes: 3, never: 6 }
  score += hydroScore[answers.hydration] ?? 3

  const chemScore = { yes_heavy: 15, yes_mild: 8, no: 0 }
  score += chemScore[answers.chemProducts] ?? 5

  if (answers.symptomsIntensity === 'years') score += 5
  else if (answers.symptomsIntensity === 'months') score += 2

  return Math.max(65, Math.min(96, score))
}

// Average toxicity for comparison bar (slightly lower than typical user)
export const AVERAGE_TOXICITY = 62

const AGE_LABELS = {
  '18_29': '18-29',
  '30_39': '30-39',
  '40_49': '40-49',
  '50_plus': '50+',
}

export function getDiagnosticFactors(answers = {}) {
  const factors = []

  if (answers.age) {
    factors.push({
      icon: '📅',
      label: `Edad: ${AGE_LABELS[answers.age] ?? '—'} años`,
      detail: 'Años de exposición acumulada a químicos cosméticos en el cuero cabelludo',
    })
  }

  if (answers.chemProducts === 'yes_heavy') {
    factors.push({
      icon: '⚗️',
      label: 'Alisado, decoloración o tintes',
      detail: 'Los químicos más agresivos para el folículo capilar — alta carga tóxica',
    })
  } else if (answers.chemProducts === 'yes_mild') {
    factors.push({
      icon: '🧴',
      label: 'Productos químicos suaves',
      detail: 'Acumulación moderada pero constante en el cuero cabelludo',
    })
  }

  if (answers.washFreq === 'daily') {
    factors.push({
      icon: '🚿',
      label: 'Lavado diario con productos comerciales',
      detail: 'Exposición continua a sulfatos y parabenos que se depositan en la raíz',
    })
  } else if (answers.washFreq === '3_4') {
    factors.push({
      icon: '🚿',
      label: 'Lavado 3-4 veces por semana',
      detail: 'Acumulación constante de residuos químicos',
    })
  }

  if (answers.waterTemp === 'hot') {
    factors.push({
      icon: '🔥',
      label: 'Agua caliente al lavar',
      detail: 'Abre los poros del cuero cabelludo y deja entrar más químicos al folículo',
    })
  }

  if (answers.heatTools === 'daily') {
    factors.push({
      icon: '💨',
      label: 'Plancha o secador diario',
      detail: 'El calor sella los químicos dentro del folículo, agravando la acumulación',
    })
  } else if (answers.heatTools === 'few') {
    factors.push({
      icon: '💨',
      label: 'Uso frecuente de calor (plancha/secador)',
      detail: 'El calor sella los químicos dentro del folículo',
    })
  }

  if (answers.hydration === 'never') {
    factors.push({
      icon: '💧',
      label: 'Sin hidratación capilar profunda',
      detail: 'Sin hidratación natural, los químicos no se eliminan del folículo',
    })
  } else if (answers.hydration === 'sometimes') {
    factors.push({
      icon: '💧',
      label: 'Hidratación irregular',
      detail: 'Hidratación insuficiente para eliminar la acumulación tóxica',
    })
  }

  return factors
}

// Meta/FB-safe factor list for the /quiz-natglow funnel. Mirrors the answers of
// getDiagnosticFactors but uses neutral, non-medical language (no "tóxico",
// "folículo", "daño", "químicos dentro del folículo"). Always returns the same
// set of cards echoing the user's own answers, so nothing reads as a diagnosis.
const SAFE_AGE_LABELS = {
  '18_29': '18 a 29 años',
  '30_39': '30 a 39 años',
  '40_49': '40 a 49 años',
  '50_plus': '50 años o más',
}
const SAFE_HAIRTYPE_LABELS = {
  liso: 'Liso',
  ondulado: 'Ondulado',
  cacheado: 'Rizado',
  crespo: 'Muy rizado',
  no_segura: 'Aún por definir',
}
const SAFE_WASH_LABELS = {
  daily: 'Todos los días',
  '3_4': '3 a 4 veces por semana',
  '1_2': '1 a 2 veces por semana',
  variable: 'Según la semana',
}
const SAFE_HEAT_LABELS = {
  daily: 'Uso frecuente',
  few: 'Algunas veces',
  rarely: 'Uso ocasional',
  none: 'No usa calor',
}
const SAFE_HYDRATION_LABELS = {
  regularly: 'Hidratación regular',
  sometimes: 'Hidratación ocasional',
  never: 'Sin hábito de hidratación aún',
}
const SAFE_GOAL_LABELS = {
  hidratacion: 'Más hidratación y suavidad',
  brillo: 'Más brillo y movimiento',
  frizz: 'Menos frizz visual',
  puntas: 'Puntas con mejor apariencia',
  rutina: 'Rutina más natural y organizada',
  procesos: 'Cuidado después de calor o procesos',
  movimiento: 'Más movimiento',
  resequedad: 'Sensación de resequedad',
  oleosidad: 'Sensación de oleosidad',
  volumen: 'Más volumen',
  cuero: 'Cuidado del cuero cabelludo',
}
const SAFE_ROUTINE_LABELS = {
  basicos: 'Productos básicos, sin rutina fija',
  internet: 'Recetas de internet de vez en cuando',
  aveces: 'Hidratación de vez en cuando',
  organizar: 'Con cuidados, buscando organizar',
  sinrutina: 'Casi sin rutina definida',
}
const SAFE_TIME_LABELS = {
  '10': '10 minutos',
  '20': '20 minutos',
  '30': '30 minutos o más',
  flexible: 'Algo flexible',
}

export function getSafeDiagnosticFactors(answers = {}) {
  const factors = []

  if (answers.age) {
    factors.push({
      icon: '📅',
      label: 'Edad',
      detail: SAFE_AGE_LABELS[answers.age] ?? '—',
    })
  }

  if (answers.hairType) {
    factors.push({
      icon: '💇',
      label: 'Tipo de cabello informado',
      detail: SAFE_HAIRTYPE_LABELS[answers.hairType] ?? '—',
    })
  }

  if (answers.hairGoal) {
    factors.push({
      icon: '🎯',
      label: 'Objetivo capilar principal',
      detail: SAFE_GOAL_LABELS[answers.hairGoal] ?? '—',
    })
  }

  if (answers.currentRoutine) {
    factors.push({
      icon: '🧴',
      label: 'Rutina actual',
      detail: SAFE_ROUTINE_LABELS[answers.currentRoutine] ?? '—',
    })
  }

  if (answers.washFreq) {
    factors.push({
      icon: '🚿',
      label: 'Frecuencia de lavado',
      detail: SAFE_WASH_LABELS[answers.washFreq] ?? '—',
    })
  }

  if (answers.heatTools) {
    factors.push({
      icon: '💨',
      label: 'Uso de calor en la rutina',
      detail: SAFE_HEAT_LABELS[answers.heatTools] ?? '—',
    })
  }

  if (answers.timeAvailable) {
    factors.push({
      icon: '⏰',
      label: 'Tiempo disponible para la rutina',
      detail: SAFE_TIME_LABELS[answers.timeAvailable] ?? '—',
    })
  }

  // Legacy key kept for backward-compat (older sessions / other funnels).
  if (answers.hydration) {
    factors.push({
      icon: '💧',
      label: 'Nivel de hidratación informado',
      detail: SAFE_HYDRATION_LABELS[answers.hydration] ?? '—',
    })
  }

  return factors
}

export function getToxicityLevel(score) {
  if (score >= 85) return { label: 'CRÍTICO', color: '#C0392B', bg: '#FDEDEC' }
  if (score >= 70) return { label: 'ALTO', color: '#E67E22', bg: '#FEF5E7' }
  return { label: 'MODERADO', color: '#F39C12', bg: '#FEF9E7' }
}
