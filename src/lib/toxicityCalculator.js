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

export function getToxicityLevel(score) {
  if (score >= 85) return { label: 'CRÍTICO', color: '#C0392B', bg: '#FDEDEC' }
  if (score >= 70) return { label: 'ALTO', color: '#E67E22', bg: '#FEF5E7' }
  return { label: 'MODERADO', color: '#F39C12', bg: '#FEF9E7' }
}
