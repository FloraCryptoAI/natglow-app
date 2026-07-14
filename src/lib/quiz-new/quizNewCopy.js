// Static Spanish copy + design tokens for the /quiz-new funnel. Question options
// live in quizNewQuestions.js; dynamic result sentences live in
// quizNewPersonalization.js. Everything here is intentionally Meta-safe:
// no detox / toxins / follicle / medical claims / guarantees / before-after.

// ── Design tokens (editorial green/yellow, NOT the pink brand) ──────────────
export const COLORS = {
  green:      '#1F944F',
  greenDark:  '#14783E',
  greenLight: '#EAF8EF',
  yellow:     '#FFE36E',
  yellowLight:'#FFF7C7',
  ink:        '#171717',
  textMuted:  '#77716D',
  bg:         '#FFFEFB',
  border:     '#EDE9E4',
  danger:     '#C2410C',
}

export const MAX_W = 512          // desktop max width — matches /quiz (max-w-lg)

export const PROGRESS_LABEL   = 'Cada respuesta importa' // shown as "PASO X DE 12 · ..."
export const EDUCATION_TAG    = 'INFORMACIÓN ÚTIL'
export const TOTAL_QUESTIONS  = 12

export const COPY = {
  footer: { terms: 'Términos', privacy: 'Privacidad', legal: 'Al continuar, aceptas nuestros' },

  landing: {
    tag: '🌿 EVALUACIÓN CAPILAR PERSONALIZADA',
    title: 'Descubre una rutina de cuidado pensada para tu cabello y tus metas',
    highlights: ['tu cabello', 'tus metas'],
    text: 'Responde unas preguntas sobre tus hábitos, el tiempo que tienes disponible y lo que quieres priorizar durante las próximas semanas.',
    cards: [
      { icon: '🎯', title: 'Recomendaciones según tu perfil', text: 'Tus respuestas ayudan a adaptar el enfoque de la rutina.' },
      { icon: '🪜', title: 'Pasos fáciles de seguir',          text: 'Una guía pensada para encajar mejor en tu día a día.' },
      { icon: '🏠', title: 'Cuidados que puedes hacer en casa', text: 'Con ingredientes simples y opciones prácticas.' },
    ],
    cta: 'COMENZAR MI EVALUACIÓN →',
    micro: 'Toma aproximadamente 2 minutos.',
  },

  // Education screens (3). `boxTone`: 'green' | 'yellow'.
  education: {
    edu1: {
      title: 'Tu tipo de cabello es solo una parte del resultado',
      text: 'La frecuencia de lavado, el uso de calor, los procesos de salón y el tiempo que tienes disponible también pueden influir en qué rutina resulta más práctica para ti.',
      cards: [
        { icon: '🚿', label: 'Frecuencia de lavado' },
        { icon: '♨️', label: 'Uso de calor' },
        { icon: '🎨', label: 'Procesos de salón' },
        { icon: '⏱️', label: 'Tiempo disponible' },
      ],
      boxTone: 'green',
      box: 'No existe una única rutina ideal para todas las personas. Las próximas respuestas nos ayudarán a organizar recomendaciones más compatibles contigo.',
      cta: 'CONTINUAR →',
    },
    edu2: {
      title: 'El objetivo no es hacer más, sino elegir mejor',
      text: 'Cuando una rutina considera tus hábitos reales, es más fácil saber qué hacer cada semana sin mezclar demasiados cuidados al mismo tiempo.',
      calendar: [
        { icon: '🌿', label: 'Día de cuidado principal' },
        { icon: '⚡', label: 'Día de cuidado rápido' },
        { icon: '☕', label: 'Día de pausa o mantenimiento' },
      ],
      boxTone: 'yellow',
      box: 'Una guía clara puede ayudarte a mantener la constancia sin convertir el cuidado del cabello en una tarea complicada.',
      cta: 'CONTINUAR →',
    },
    // edu3 is dynamic (shows chips from real answers) — see QuizNewEducation + personalization.
    edu3: {
      tag: 'TU GUÍA ESTÁ TOMANDO FORMA',
      title: '¡Buen trabajo! Ya tenemos lo esencial de tu cabello',
      text: 'Con tus metas, tus hábitos y el tiempo que tienes disponible, podemos organizar un punto de partida hecho a tu medida.',
      boxTone: 'green',
      box: 'En el siguiente paso verás qué conviene priorizar primero y cómo se organiza tu recomendación, paso a paso.',
      cta: 'VER MI RESULTADO →',
    },
  },

  name: {
    title: '¡Ya casi terminamos! ¿Cómo te llamas?',
    subtitle: 'Usaremos tu nombre para mostrarte el resumen que preparamos.',
    placeholder: 'Tu primer nombre',
    error: 'Escribe tu nombre (al menos 2 letras).',
    cta: 'PREPARAR MI RESULTADO →',
  },

  loading: {
    title: 'Estamos organizando tu recomendación personalizada…',
    steps: [
      'Revisando tus metas…',
      'Adaptando la frecuencia semanal…',
      'Seleccionando recomendaciones compatibles…',
      'Organizando tu resumen personalizado…',
    ],
    done: '¡Listo! Tu evaluación ya está preparada.',
  },

  results: {
    tag: '✅ TU EVALUACIÓN PERSONALIZADA ESTÁ LISTA',
    profileTitle: 'Tu perfil de cuidado',
    profileLabels: {
      hairType: 'Tipo de cabello',
      priority: 'Prioridad principal',
      wash: 'Frecuencia de lavado',
      time: 'Tiempo disponible',
    },
    secondaryPrefix: 'También quieres priorizar:',
    observationsTitle: 'Lo que consideramos al preparar tu recomendación',
    startingPointTitle: 'Tu punto de partida recomendado',
    miniPlanTitle: 'Así podría organizarse tu primera etapa',
    miniPlan: [
      { title: 'Cuidado principal',  text: 'Paso adaptado a tu objetivo y tipo de cabello' },
      { title: 'Cuidado rápido',     text: 'Una acción sencilla para mantener la rutina' },
      { title: 'Revisión semanal',   text: 'Observar cómo se siente el cabello y ajustar la frecuencia' },
    ],
    miniPlanNote: 'Esta es una vista resumida. En el plan completo encontrarás instrucciones, frecuencia, recetas y pasos organizados.',
    preparedTitle: 'Lo que preparamos a partir de tus respuestas',
    preparedText: 'Tu resultado será conectado a las herramientas disponibles dentro de la aplicación.',
    ctaTitle: 'Tu guía completa ya puede ser organizada dentro de la aplicación',
    ctaText: 'En la siguiente página podrás ver todo lo que incluye el acceso, cómo funciona el plan y las herramientas disponibles para acompañar tu rutina.',
    ctaButton: 'VER EL PLAN QUE PREPARAMOS PARA MÍ →',
    ctaMicro: 'Acceso desde el celular · Pago único · Sin mensualidades',
  },
}
