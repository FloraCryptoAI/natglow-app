import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, TrendingDown } from 'lucide-react';
import { SkinProfile } from '@/entities/SkinProfile';
import { Button } from '@/components/ui/button';

function calculateSkinAge(profile) {
  const ageMap = { '25-34': 30, '35-44': 40, '45-54': 50, '55-64': 60, '65+': 70 };
  let base = ageMap[profile.age_range] || 45;
  let modifier = 0;
  if (profile.current_routine === 'none') modifier += 5;
  if (profile.current_routine === 'basic') modifier += 2;
  if (profile.concerns?.length > 3) modifier += 3;
  if (profile.concerns?.includes('wrinkles')) modifier += 2;
  if (profile.concerns?.includes('dark_spots')) modifier += 2;
  if (profile.skin_type === 'dry') modifier += 1;
  if (profile.climate === 'dry' || profile.climate === 'tropical') modifier += 1;
  if (profile.daily_time === '5min') modifier += 1;
  return base + modifier;
}

function generateRoutineFromProfile(profile) {
  const { skin_type = 'normal' } = profile;

  const routines = {
    dry: {
      morning_routine: [
        { step: '1', name: 'Limpeza Suave com Mel', description: 'Limpa sem remover os óleos naturais essenciais da pele seca.', duration_minutes: 2, recipe: { ingredients: ['Mel'], instructions: 'Dilua 1 colher de chá de mel em meio copo de água morna. Aplique no rosto e enxágue.' } },
        { step: '2', name: 'Tônico de Pepino', description: 'Tonifica e prepara a pele para receber a hidratação.', duration_minutes: 1, recipe: { ingredients: ['Pepino'], instructions: 'Processe meio pepino, coe e aplique a água gelada com algodão.' } },
        { step: '3', name: 'Hidratação com Babosa', description: 'Sela a hidratação e protege durante o dia.', duration_minutes: 2, recipe: { ingredients: ['Babosa (Aloe Vera)'], instructions: 'Extraia o gel de uma folha de babosa e aplique no rosto limpo em movimentos suaves.' } },
      ],
      night_routine: [
        { step: '1', name: 'Demaquilante com Óleo de Coco', description: 'Remove impurezas enquanto nutre a pele ressecada.', duration_minutes: 3, recipe: { ingredients: ['Óleo de Coco'], instructions: 'Massageie o óleo de coco no rosto por 2 minutos e enxágue com água morna.' } },
        { step: '2', name: 'Máscara de Banana', description: 'Nutre profundamente e amacia a pele durante a noite.', duration_minutes: 15, recipe: { ingredients: ['Banana'], instructions: 'Amasse meia banana madura até obter pasta lisa. Aplique no rosto por 15 min e enxágue.' } },
        { step: '3', name: 'Vedação com Mel', description: 'Cria uma barreira de hidratação enquanto você dorme.', duration_minutes: 1, recipe: { ingredients: ['Mel'], instructions: 'Aplique uma camada muito fina de mel puro e deixe agir a noite toda.' } },
      ],
      weekly_treatments: [
        { name: 'Esfoliação Suave de Aveia', frequency: '1x por semana', description: 'Remove células mortas sem agredir a pele seca.', duration_minutes: 10, recipe: { ingredients: ['Aveia', 'Mel'], instructions: 'Misture 2 colheres de aveia fina com 1 colher de mel. Massageie suavemente por 2 min e enxágue.', benefits: ['Esfoliação suave', 'Hidratação', 'Suavização'] } },
        { name: 'Máscara de Mel e Iogurte', frequency: '1x por semana', description: 'Hidratação intensa para peles muito ressecadas.', duration_minutes: 20, recipe: { ingredients: ['Mel', 'Iogurte Natural'], instructions: 'Misture 1 colher de mel com 2 de iogurte natural. Aplique por 20 min.', benefits: ['Hidratação profunda', 'Ácido lático', 'Nutrição'] } },
      ],
      tips: [
        'Beba pelo menos 2 litros de água por dia.',
        'Evite banhos muito quentes — ressecam ainda mais a pele.',
        'Aplique a babosa logo após lavar o rosto, com a pele ainda levemente úmida.',
        'O mel em camada fina é um excelente hidratante noturno.',
      ],
      expected_results: 'Após 30 dias, você notará uma pele visivelmente mais hidratada, suave e luminosa. A sensação de tensão e ressecamento deve diminuir já na primeira semana.',
    },
    oily: {
      morning_routine: [
        { step: '1', name: 'Limpeza com Iogurte', description: 'O ácido lático do iogurte limpa sem ressecar nem estimular mais oleosidade.', duration_minutes: 3, recipe: { ingredients: ['Iogurte Natural'], instructions: 'Aplique 1 colher de iogurte natural, massageie por 1 min e enxágue com água fria.' } },
        { step: '2', name: 'Tônico de Chá Verde', description: 'Antioxidante que reduz a oleosidade e fecha os poros.', duration_minutes: 1, recipe: { ingredients: ['Chá Verde'], instructions: 'Prepare chá verde forte, resfrie e aplique com algodão como tônico.' } },
        { step: '3', name: 'Hidratação Leve com Babosa', description: 'Hidrata sem deixar resíduo oleoso.', duration_minutes: 1, recipe: { ingredients: ['Babosa (Aloe Vera)'], instructions: 'Aplique gel de babosa em camada fina e deixe absorver completamente.' } },
      ],
      night_routine: [
        { step: '1', name: 'Limpeza com Limão Diluído', description: 'Controla a oleosidade e clarea manchas levemente.', duration_minutes: 2, recipe: { ingredients: ['Limão'], instructions: 'Dilua suco de 1/4 limão em meia xícara de água. Aplique com algodão e enxágue após 2 min.' } },
        { step: '2', name: 'Máscara de Aveia', description: 'Absorve excesso de óleo e suaviza a textura da pele.', duration_minutes: 15, recipe: { ingredients: ['Aveia', 'Iogurte Natural'], instructions: 'Misture 2 colheres de aveia com 1 de iogurte. Aplique por 15 min.' } },
        { step: '3', name: 'Finalização com Babosa', description: 'Hidratação leve para equilibrar a produção de sebo.', duration_minutes: 1, recipe: { ingredients: ['Babosa (Aloe Vera)'], instructions: 'Aplique pequena quantidade de gel de babosa como hidratante noturno.' } },
      ],
      weekly_treatments: [
        { name: 'Máscara Purificante de Mel', frequency: '2x por semana', description: 'Propriedades antibacterianas para controlar acne e oleosidade.', duration_minutes: 15, recipe: { ingredients: ['Mel'], instructions: 'Aplique mel puro no rosto com foco nas áreas mais oleosas. Aguarde 15 min.', benefits: ['Antibacteriano', 'Controle de oleosidade', 'Cicatrização'] } },
        { name: 'Esfoliação de Café', frequency: '1x por semana', description: 'Estimula circulação e remove células mortas com eficiência.', duration_minutes: 10, recipe: { ingredients: ['Café', 'Mel'], instructions: 'Misture 1 colher de café moído com 1 colher de mel. Esfregue suavemente por 2 min.', benefits: ['Esfoliação', 'Circulação', 'Controle de oleosidade'] } },
      ],
      tips: [
        'Não lave o rosto mais de 2x por dia — exagerar estimula mais produção de sebo.',
        'Chá verde gelado como tônico é ótimo para controlar o brilho.',
        'Limão sempre diluído — nunca puro na pele.',
        'Aveia é sua aliada: absorve óleo e acalma ao mesmo tempo.',
      ],
      expected_results: 'Com rotina consistente, a oleosidade excessiva diminui em 2 semanas. Os poros aparecerão mais fechados e a pele mais uniforme após 30 dias.',
    },
    combination: {
      morning_routine: [
        { step: '1', name: 'Limpeza com Pasta de Aveia', description: 'Equilibra as diferentes zonas da pele mista.', duration_minutes: 3, recipe: { ingredients: ['Aveia'], instructions: 'Misture 1 colher de aveia fina com água suficiente para pasta. Massageie e enxágue.' } },
        { step: '2', name: 'Tônico de Pepino', description: 'Hidrata as áreas secas e refresca as oleosas.', duration_minutes: 1, recipe: { ingredients: ['Pepino'], instructions: 'Processe meio pepino, coe e aplique a água gelada em todo o rosto com algodão.' } },
        { step: '3', name: 'Hidratação Zoneada', description: 'Babosa em toda a pele, com reforço nas bochechas mais secas.', duration_minutes: 2, recipe: { ingredients: ['Babosa (Aloe Vera)', 'Óleo de Coco'], instructions: 'Aplique gel de babosa em todo o rosto. Nas bochechas, adicione 1 gota de óleo de coco.' } },
      ],
      night_routine: [
        { step: '1', name: 'Limpeza Dupla Zoneada', description: 'Cada zona recebe o que precisa.', duration_minutes: 4, recipe: { ingredients: ['Óleo de Coco', 'Iogurte Natural'], instructions: 'Zona T: óleo de coco. Bochechas: iogurte natural. Massageie cada área e enxágue.' } },
        { step: '2', name: 'Máscara Equilibrante', description: 'Mel e aveia criam equilíbrio para todos os tipos de pele.', duration_minutes: 15, recipe: { ingredients: ['Mel', 'Aveia'], instructions: 'Misture 1 colher de mel com 2 de aveia. Aplique em todo o rosto por 15 min.' } },
        { step: '3', name: 'Hidratação Noturna', description: 'Babosa como hidratante leve para fechar a rotina.', duration_minutes: 1, recipe: { ingredients: ['Babosa (Aloe Vera)'], instructions: 'Aplique gel de babosa em todo o rosto como hidratante noturno.' } },
      ],
      weekly_treatments: [
        { name: 'Máscara Zoneada Dupla', frequency: '1x por semana', description: 'Tratamento específico para cada área do rosto.', duration_minutes: 20, recipe: { ingredients: ['Aveia', 'Iogurte Natural', 'Mel'], instructions: 'Zona T: pasta de aveia com iogurte. Bochechas: mel puro. Aplique 20 min e enxágue.', benefits: ['Equilíbrio', 'Hidratação nas bochechas', 'Controle na zona T'] } },
      ],
      tips: [
        'Trate cada região do rosto com o que ela precisa — são diferentes.',
        'Evite produtos muito oleosos na zona T e adstringentes fortes nas bochechas.',
        'O pepino é ideal: hidratante e levemente adstringente ao mesmo tempo.',
      ],
      expected_results: 'A pele mista encontrará seu equilíbrio após 3 semanas. A zona T ficará menos brilhosa e as bochechas menos ressecadas, com textura mais uniforme.',
    },
    normal: {
      morning_routine: [
        { step: '1', name: 'Limpeza Suave com Mel', description: 'Mantém a pele saudável sem desequilibrar.', duration_minutes: 2, recipe: { ingredients: ['Mel'], instructions: 'Dilua 1 colher de chá de mel em água morna. Aplique e enxágue suavemente.' } },
        { step: '2', name: 'Tônico Antioxidante de Chá Verde', description: 'Protege a pele normal dos danos do dia a dia.', duration_minutes: 1, recipe: { ingredients: ['Chá Verde'], instructions: 'Prepare chá verde forte, deixe esfriar e aplique com algodão.' } },
        { step: '3', name: 'Hidratação Preventiva', description: 'Babosa mantém a pele jovem e hidratada.', duration_minutes: 1, recipe: { ingredients: ['Babosa (Aloe Vera)'], instructions: 'Aplique gel de babosa fresco no rosto como hidratante matinal.' } },
      ],
      night_routine: [
        { step: '1', name: 'Limpeza com Aveia', description: 'Remove as impurezas do dia suavemente.', duration_minutes: 3, recipe: { ingredients: ['Aveia'], instructions: 'Faça pasta de aveia com água morna e massageie o rosto por 1 min.' } },
        { step: '2', name: 'Máscara Nutritiva Noturna', description: 'Banana e mel nutrem enquanto você dorme.', duration_minutes: 15, recipe: { ingredients: ['Banana', 'Mel'], instructions: 'Amasse meia banana com 1 colher de mel. Aplique por 15 min.' } },
        { step: '3', name: 'Finalização com Iogurte', description: 'Levemente ácido, mantém o pH e a hidratação.', duration_minutes: 1, recipe: { ingredients: ['Iogurte Natural'], instructions: 'Aplique camada fina de iogurte por 10 min e enxágue.' } },
      ],
      weekly_treatments: [
        { name: 'Esfoliação de Aveia e Mel', frequency: '1x por semana', description: 'Mantém a pele renovada e luminosa.', duration_minutes: 10, recipe: { ingredients: ['Aveia', 'Mel'], instructions: 'Misture aveia e mel em partes iguais. Massageie e enxágue.', benefits: ['Renovação celular', 'Luminosidade', 'Hidratação'] } },
      ],
      tips: [
        'Pele normal ainda precisa de cuidados consistentes para se manter.',
        'Aproveite para focar em prevenção — antioxidantes e proteção solar natural.',
        'A hidratação com babosa é leve e perfeita para o dia a dia.',
      ],
      expected_results: 'Sua pele normal ficará mais luminosa e protegida. A rotina preventiva ajudará a retardar o surgimento de rugas e manchas.',
    },
    sensitive: {
      morning_routine: [
        { step: '1', name: 'Água de Aveia Calmante', description: 'A aveia cria uma película protetora que acalma a pele sensível.', duration_minutes: 3, recipe: { ingredients: ['Aveia'], instructions: 'Deixe 3 colheres de aveia de molho em 1 copo de água por 10 min. Coe e use a água para lavar.' } },
        { step: '2', name: 'Tônico de Pepino Gelado', description: 'Refresca e acalma sem irritar peles reativas.', duration_minutes: 1, recipe: { ingredients: ['Pepino'], instructions: 'Processe meio pepino gelado e aplique a água com algodão suave.' } },
        { step: '3', name: 'Babosa Anti-inflamatória', description: 'Reduz a vermelhidão e fortalece a barreira cutânea.', duration_minutes: 2, recipe: { ingredients: ['Babosa (Aloe Vera)'], instructions: 'Aplique gel de babosa puro delicadamente, sem esfregar.' } },
      ],
      night_routine: [
        { step: '1', name: 'Limpeza com Iogurte Frio', description: 'Remove impurezas sem agredir a pele reativa.', duration_minutes: 3, recipe: { ingredients: ['Iogurte Natural'], instructions: 'Aplique iogurte natural frio com movimentos delicados. Enxágue com água fria.' } },
        { step: '2', name: 'Máscara de Banana Calmante', description: 'Nutre e acalma peles sensíveis e reativas.', duration_minutes: 15, recipe: { ingredients: ['Banana'], instructions: 'Amasse uma banana madura. Aplique no rosto e aguarde 15 min. Enxágue com água fria.' } },
        { step: '3', name: 'Mel como Protetor Noturno', description: 'Camada fina de mel protege e hidrata durante a noite.', duration_minutes: 1, recipe: { ingredients: ['Mel'], instructions: 'Aplique camada muito fina de mel puro. Não enxague.' } },
      ],
      weekly_treatments: [
        { name: 'Máscara Calmante de Aveia', frequency: '2x por semana', description: 'Alivia vermelhidão e irritação da pele sensível.', duration_minutes: 20, recipe: { ingredients: ['Aveia', 'Iogurte Natural'], instructions: 'Misture aveia fina com iogurte. Aplique delicadamente sem pressão por 20 min.', benefits: ['Calmante', 'Anti-inflamatório', 'Hidratação'] } },
      ],
      tips: [
        'Sempre use movimentos suaves, sem esfregar.',
        'Teste qualquer ingrediente novo no interior do braço antes do rosto.',
        'Água fria para enxágue acalma e reduz vermelhidão.',
        'Evite limão e ingredientes ácidos na pele sensível.',
      ],
      expected_results: 'A pele sensível responde bem a cuidados suaves e constantes. Em 2 semanas, a vermelhidão e reatividade diminuem. Com 30 dias, a pele estará mais resistente e equilibrada.',
    },
  };

  const base = routines[skin_type] || routines.normal;

  const thirty_day_plan = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isWeeklyDay = day % 7 === 0;
    const weekIndex = Math.floor(i / 7);
    return {
      day,
      morning_task: base.morning_routine[i % base.morning_routine.length].name,
      night_task: base.night_routine[i % base.night_routine.length].name,
      special_task: isWeeklyDay ? base.weekly_treatments[weekIndex % base.weekly_treatments.length]?.name : null,
    };
  });

  return { ...base, thirty_day_plan };
}

export default function SkinAge() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [skinAge, setSkinAge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animatedAge, setAnimatedAge] = useState(0);
  const [generating, setGenerating] = useState(false);

  const profileId = new URLSearchParams(window.location.search).get('profileId');

  useEffect(() => {
    async function load() {
      const profiles = await SkinProfile.list();
      const found = profiles.find(p => p.id === profileId);
      if (found) {
        setProfile(found);
        const age = calculateSkinAge(found);
        setSkinAge(age);
        await SkinProfile.update(found.id, { skin_age_score: age });
      }
      setLoading(false);
    }
    if (profileId) load();
    else setLoading(false);
  }, [profileId]);

  useEffect(() => {
    if (skinAge !== null) {
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        setAnimatedAge(current);
        if (current >= skinAge) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [skinAge]);

  const handleGenerateRoutine = async () => {
    setGenerating(true);
    const routine = generateRoutineFromProfile(profile);
    await SkinProfile.update(profile.id, { generated_routine: routine });
    navigate('/Dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">Perfil não encontrado. Refaça o quiz.</p>
      </div>
    );
  }

  const ageMap = { '25-34': 30, '35-44': 40, '45-54': 50, '55-64': 60, '65+': 70 };
  const realAge = ageMap[profile.age_range] || 45;
  const ageDiff = skinAge - realAge;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-brand-bg/30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 overflow-hidden">
          <div className="bg-gradient-to-br from-brand to-brand-light p-8 text-center text-white">
            <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">Resultado da Análise</p>
            <h1 className="text-3xl font-bold">Idade da Sua Pele</h1>
          </div>

          <div className="p-8 text-center">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#E7E5E4" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="#FB45A9" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedAge / 100) * 283} 283`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-stone-900">{animatedAge}</span>
                <span className="text-sm text-stone-400">anos</span>
              </div>
            </div>

            {ageDiff > 0 && (
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                Sua pele aparenta {ageDiff} anos a mais
              </div>
            )}

            <p className="text-stone-500 text-sm leading-relaxed mb-6">
              Com base no seu perfil, sua pele aparenta <strong>{skinAge} anos</strong>.
              {ageDiff > 0 && (
                <> Com nossa rotina personalizada, é possível reduzir esses sinais e melhorar a aparência da sua pele.</>
              )}
            </p>

            <div className="bg-brand-bg rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 text-brand font-medium text-sm mb-2">
                <TrendingDown className="w-4 h-4" />
                <span>Potencial de melhora com rotina natural</span>
              </div>
              <p className="text-stone-600 text-sm">
                Seguindo uma rotina consistente por 30 dias, sua pele pode apresentar melhorias visíveis em hidratação, textura e luminosidade.
              </p>
            </div>

            <Button
              onClick={handleGenerateRoutine}
              disabled={generating}
              className="w-full bg-brand hover:bg-brand-dark rounded-full py-6 text-base font-semibold"
            >
              {generating ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando sua rotina personalizada...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Desbloquear Minha Rotina
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}