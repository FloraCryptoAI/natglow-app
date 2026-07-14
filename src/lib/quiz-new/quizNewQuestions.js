// Single source of truth for the /quiz-new flow: the 12 real questions plus the
// 3 education screens, name and loading, in order. The orchestrator (QuizNew.jsx)
// walks FLOW; the progress bar counts only entries with kind === 'question'.

const HAIR_IMG = (f) => `/images/quiz-natglow/${f}.webp`

// key → question config. `field` is where the answer lands in QuizNewAnswers.
// type: 'single' (auto-advance) | 'multi' (needs Continuar, ≥1). `exclusive`
// options clear the others when picked (and are cleared by any other pick).
export const QUESTIONS = {
  goals: {
    field: 'goals', type: 'multi', layout: 'grid2',
    title: 'Vamos a organizar tu rutina según tus metas para las próximas semanas',
    subtitle: 'Elige todo lo que te gustaría priorizar.',
    cta: 'CONTINUAR CON MIS METAS →',
    options: [
      { value: 'frizz',      icon: '💧', label: 'Reducir la apariencia del frizz' },
      { value: 'brillo',     icon: '✨', label: 'Aumentar el brillo y movimiento' },
      { value: 'suavidad',   icon: '🌸', label: 'Sentir el cabello más suave' },
      { value: 'puntas',     icon: '✂️', label: 'Cuidar mejor las puntas' },
      { value: 'peinado',    icon: '🪮', label: 'Facilitar el peinado' },
      { value: 'definicion', icon: '➰', label: 'Definir ondas o rizos' },
      { value: 'constancia', icon: '📅', label: 'Mantener una rutina constante' },
      { value: 'largo',      icon: '🌱', label: 'Cuidar el largo mientras crece' },
    ],
  },

  profilePreference: {
    field: 'profilePreference', type: 'single', layout: 'list',
    title: '¿Con cuál opción te identificas?',
    note: 'Esta respuesta se usa para adaptar ejemplos y hábitos de cuidado. Las recomendaciones principales se basan en tu tipo de cabello y en tu rutina.',
    options: [
      { value: 'mujer',   icon: '👩', label: 'Mujer' },
      { value: 'hombre',  icon: '👨', label: 'Hombre' },
      { value: 'neutro',  icon: '🌿', label: 'Prefiero una guía neutra' },
    ],
  },

  hairType: {
    field: 'hairType', type: 'single', layout: 'grid2',
    title: '¿Cuál es tu tipo de cabello?',
    subtitle: 'Selecciona la opción que más se parece a tu cabello natural.',
    options: [
      { value: 'liso',      label: 'Liso',       image: HAIR_IMG('liso') },
      { value: 'ondulado',  label: 'Ondulado',   image: HAIR_IMG('ondulado') },
      { value: 'rizado',    label: 'Rizado',     image: HAIR_IMG('cacheado') },
      { value: 'muy_rizado',label: 'Muy rizado', image: HAIR_IMG('crespo') },
    ],
  },

  currentCondition: {
    field: 'currentCondition', type: 'multi', layout: 'list',
    title: '¿Cómo suele sentirse o verse tu cabello durante la semana?',
    subtitle: 'Puedes elegir más de una opción.',
    cta: 'CONTINUAR →',
    options: [
      { value: 'frizz',       label: 'Con frizz' },
      { value: 'poco_brillo', label: 'Con poco brillo' },
      { value: 'seco',        label: 'Seco al tacto' },
      { value: 'dificil',     label: 'Difícil de manejar' },
      { value: 'puntas',      label: 'Con puntas ásperas' },
      { value: 'pesado',      label: 'Pesado por productos' },
      { value: 'cambia',      label: 'Cambia mucho de un día a otro' },
      { value: 'bien',        label: 'En general se siente bien', exclusive: true },
    ],
  },

  washFrequency: {
    field: 'washFrequency', type: 'single', layout: 'list',
    title: '¿Con qué frecuencia lavas tu cabello?',
    subtitle: 'Usaremos esta respuesta para distribuir mejor los cuidados durante la semana.',
    options: [
      { value: 'diario', icon: '🚿', label: 'Todos los días',          hint: 'Forma parte de mi rutina diaria' },
      { value: '3_4',    icon: '📅', label: '3 a 4 veces por semana',  hint: 'La mayoría de los días de la semana' },
      { value: '1_2',    icon: '🌿', label: '1 a 2 veces por semana',  hint: 'En días específicos' },
      { value: 'menos',  icon: '🗓️', label: 'Menos de una vez por semana', hint: 'Prefiero espaciar más los lavados' },
    ],
  },

  waterTemperature: {
    field: 'waterTemperature', type: 'single', layout: 'list',
    title: '¿Qué temperatura usas normalmente al lavar tu cabello?',
    subtitle: 'Esta respuesta nos ayuda a adaptar recomendaciones simples de lavado.',
    options: [
      { value: 'caliente', icon: '🔥', label: 'Muy caliente',                hint: 'Prefiero el agua bastante caliente' },
      { value: 'tibia',    icon: '💧', label: 'Tibia',                       hint: 'Una temperatura agradable y moderada' },
      { value: 'fria',     icon: '❄️', label: 'Fría o termino con agua fría', hint: 'Uso agua fría al menos al final' },
    ],
  },

  heatUse: {
    field: 'heatUse', type: 'single', layout: 'list',
    title: '¿Con qué frecuencia usas plancha, secador o rizador?',
    subtitle: 'Esto nos ayuda a incluir cuidados compatibles con tus hábitos.',
    options: [
      { value: 'casi_diario', icon: '♨️', label: 'Casi todos los días',       hint: 'Es parte frecuente de mi rutina' },
      { value: 'algunas',     icon: '📅', label: 'Algunas veces por semana',  hint: 'Lo uso en determinados días' },
      { value: 'ocasional',   icon: '🌬️', label: 'Ocasionalmente',            hint: 'Solo en algunas ocasiones' },
      { value: 'no',          icon: '🌿', label: 'No suelo usar calor',       hint: 'Prefiero evitar estas herramientas' },
    ],
  },

  chemicalProcesses: {
    field: 'chemicalProcesses', type: 'multi', layout: 'list',
    title: '¿Tu cabello pasa por alguno de estos procesos?',
    subtitle: 'Puedes seleccionar todas las opciones que correspondan.',
    cta: 'CONTINUAR →',
    options: [
      { value: 'tinte',       icon: '🎨', label: 'Tinte' },
      { value: 'decoloracion',icon: '✨', label: 'Decoloración' },
      { value: 'alisado',     icon: '💇', label: 'Alisado, keratina o progresiva' },
      { value: 'permanente',  icon: '➰', label: 'Permanente' },
      { value: 'ninguno',     icon: '🌿', label: 'No uso procesos actualmente', exclusive: true },
    ],
  },

  hydrationFrequency: {
    field: 'hydrationFrequency', type: 'single', layout: 'list',
    title: '¿Con qué frecuencia incluyes un cuidado de hidratación más completo?',
    options: [
      { value: 'semanal',       icon: '✅', label: 'Una vez por semana',            hint: 'Ya forma parte de mi rutina' },
      { value: 'mensual',       icon: '🔄', label: 'Algunas veces al mes',          hint: 'Lo hago cuando recuerdo o tengo tiempo' },
      { value: 'cuando_siento', icon: '💧', label: 'Solo cuando siento que lo necesito', hint: 'No tengo una frecuencia definida' },
      { value: 'casi_nunca',    icon: '❌', label: 'Casi nunca',                    hint: 'Todavía no tengo este hábito' },
      { value: 'no_seguro',     icon: '❓', label: 'No estoy segura de cómo hacerlo', hint: 'Me gustaría tener una orientación más clara' },
    ],
  },

  availableTime: {
    field: 'availableTime', type: 'single', layout: 'list',
    title: '¿Cuánto tiempo te gustaría dedicar a cada cuidado?',
    subtitle: 'La rutina debe adaptarse a tu vida, no al revés.',
    options: [
      { value: '10',      icon: '⏱️', label: 'Hasta 10 minutos',            hint: 'Quiero una opción rápida' },
      { value: '15_20',   icon: '⏰', label: 'Entre 15 y 20 minutos',       hint: 'Puedo dedicar un poco más de tiempo' },
      { value: '30',      icon: '⌛', label: 'Hasta 30 minutos',            hint: 'Quiero una rutina más completa' },
      { value: 'fines',   icon: '📆', label: 'Puedo dedicar más tiempo los fines de semana', hint: 'Prefiero concentrar los cuidados en días específicos' },
    ],
  },

  hairLength: {
    field: 'hairLength', type: 'single', layout: 'grid2',
    title: '¿Cuál es el largo actual de tu cabello?',
    subtitle: 'Esto puede cambiar cantidades, tiempo de aplicación y forma de distribuir los cuidados.',
    options: [
      { value: 'corto',   icon: '💇‍♀️', label: 'Corto' },
      { value: 'hombros', icon: '💁‍♀️', label: 'Por los hombros' },
      { value: 'medio',   icon: '👩', label: 'Medio' },
      { value: 'largo',   icon: '👩‍🦰', label: 'Largo' },
    ],
  },

  routinePreference: {
    field: 'routinePreference', type: 'single', layout: 'list',
    title: '¿Qué tipo de rutina te resultaría más fácil seguir?',
    options: [
      { value: 'casa',     icon: '🏠', label: 'Principalmente con ingredientes que ya tengo en casa', hint: 'Quiero aprovechar lo que ya tengo' },
      { value: 'comprar',  icon: '🛒', label: 'Puedo comprar algunos ingredientes simples',           hint: 'No me importa completar una lista pequeña' },
      { value: 'combinar', icon: '🧴', label: 'Combinar cuidados caseros con productos comunes',       hint: 'Prefiero una rutina flexible' },
      { value: 'practico', icon: '⚡', label: 'La opción más práctica y rápida posible',               hint: 'Quiero reducir al máximo el tiempo y la preparación' },
    ],
  },
}

// Ordered flow. questionIndex is the 1..12 number shown in "PASO X DE 12".
export const FLOW = [
  { kind: 'question',  key: 'goals',             questionIndex: 1 },
  { kind: 'question',  key: 'profilePreference', questionIndex: 2 },
  { kind: 'question',  key: 'hairType',          questionIndex: 3 },
  { kind: 'education',  eduKey: 'edu1' },
  { kind: 'question',  key: 'currentCondition',  questionIndex: 4 },
  { kind: 'question',  key: 'washFrequency',     questionIndex: 5 },
  { kind: 'question',  key: 'waterTemperature',  questionIndex: 6 },
  { kind: 'question',  key: 'heatUse',           questionIndex: 7 },
  { kind: 'question',  key: 'chemicalProcesses', questionIndex: 8 },
  { kind: 'education',  eduKey: 'edu2' },
  { kind: 'question',  key: 'hydrationFrequency',questionIndex: 9 },
  { kind: 'question',  key: 'availableTime',     questionIndex: 10 },
  { kind: 'question',  key: 'hairLength',        questionIndex: 11 },
  { kind: 'question',  key: 'routinePreference', questionIndex: 12 },
  { kind: 'education',  eduKey: 'edu3' },
  { kind: 'name' },
  { kind: 'loading' },
]

export const FIRST_STEP = 0
export const LAST_STEP   = FLOW.length - 1
