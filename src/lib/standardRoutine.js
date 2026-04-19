// Plano padrão de cuidados capilares — sem personalização dinâmica
// Focado nos principais problemas gerais: ressecamento, frizz, quebra, queda leve

export const STANDARD_ROUTINE = {
  focus: 'Recuperação e hidratação profunda',
  description: 'Plano estruturado para restaurar a saúde dos fios, controlar o frizz e prevenir a quebra com ingredientes naturais.',

  bath_routine: [
    {
      name: 'Molhar bem os fios',
      description: 'Use água morna ou fria. Água quente abre as cutículas e resseca o cabelo ao longo do tempo.',
      tip: 'Finalize sempre com água fria para selar a cutícula e aumentar o brilho.',
    },
    {
      name: 'Shampoo apenas no couro cabeludo',
      description: 'Aplique shampoo no couro cabeludo com movimentos suaves. Deixe o produto escorrer pelas pontas ao enxaguar.',
      tip: 'Evite esfregar as pontas — elas já estão mais fragilizadas.',
    },
    {
      name: 'Condicionador do meio às pontas',
      description: 'Aplique o condicionador do meio ao comprimento, com foco nas pontas. Deixe agir por 2–3 minutos antes de enxaguar.',
      tip: 'Nunca aplique condicionador direto na raiz — pode deixar o cabelo oleoso.',
    },
    {
      name: 'Enxágue completo',
      description: 'Enxágue bem para não deixar resíduo, que pode pesar o cabelo e irritar o couro cabeludo.',
      tip: 'Um enxágue final com água fria ajuda a reduzir o frizz.',
    },
  ],

  weekly_masks: [
    {
      name: 'Máscara de Babosa e Mel',
      frequency: '1x por semana',
      description: 'Hidratação profunda para fios secos e com frizz. Babosa restaura a umidade e mel sela a cutícula.',
      recipe: {
        ingredients: ['3 colheres de sopa de gel de babosa', '1 colher de sopa de mel', '1 colher de sopa de óleo de coco'],
        instructions: 'Misture todos os ingredientes. Aplique no cabelo úmido do meio às pontas. Cubra com touca e deixe agir por 20–30 minutos. Enxágue bem.',
        time: '30 min',
      },
      benefits: ['Hidratação intensa', 'Controle do frizz', 'Brilho', 'Maciez'],
    },
    {
      name: 'Nutrição com Óleo de Coco',
      frequency: '1x por semana (alternando)',
      description: 'Fortalece os fios por dentro, reduz a quebra e protege contra o calor do dia a dia.',
      recipe: {
        ingredients: ['2 colheres de sopa de óleo de coco extravirgem', '1 gema de ovo (opcional, para fios muito fracos)'],
        instructions: 'Aqueça levemente o óleo de coco. Aplique nos fios secos ou úmidos. Deixe agir por 20 minutos com touca. Lave normalmente com shampoo.',
        time: '25 min',
      },
      benefits: ['Fortalecimento', 'Redução de quebra', 'Proteção térmica natural', 'Nutrição profunda'],
    },
  ],

  special_recipe: {
    name: 'Tônico para couro cabeludo com vinagre de maçã',
    description: 'Equilibra o pH, remove resíduos de produtos e estimula a circulação para um crescimento mais saudável.',
    ingredients: ['2 colheres de sopa de vinagre de maçã orgânico', '200ml de água', '5 gotas de óleo essencial de alecrim (opcional)'],
    instructions: 'Misture o vinagre na água. Após lavar o cabelo, aplique no couro cabeludo com massagem leve. Deixe agir 2 minutos e enxágue.',
    frequency: 'A cada 15 dias',
    benefits: ['Equilíbrio do pH', 'Redução de oleosidade', 'Estímulo ao crescimento', 'Couro cabeludo saudável'],
  },

  daily_habits: [
    'Use água morna ou fria para lavar o cabelo',
    'Proteja o cabelo com protetor térmico antes de usar calor',
    'Durma com fronha de cetim ou seda para reduzir o atrito',
    'Hidrate-se bem — o cabelo reflete a saúde interna do corpo',
    'Penteie com cuidado, sempre de baixo para cima, sem puxar',
    'Evite prender o cabelo molhado — causa quebra',
  ],

  habits_to_avoid: [
    'Água quente no banho — resseca os fios e abre a cutícula',
    'Uso diário de secador ou chapinha sem proteção térmica',
    'Escovar o cabelo molhado com força — é quando ele está mais fraco',
    'Excesso de produtos químicos sem hidratação compensatória',
    'Prender muito apertado com elásticos de borracha',
  ],

  expected_results: 'Em 21 dias seguindo a rotina, você deve notar redução visível do frizz, mais brilho e maciez, e menos quebra ao escovar. A chave é a constância — pequenos hábitos certos todos os dias fazem mais diferença do que tratamentos intensos feitos sem regularidade.',
};