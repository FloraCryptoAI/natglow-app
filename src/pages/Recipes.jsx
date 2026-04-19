import React, { useState } from 'react';
import { Search, Leaf, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import RecipeDetail from '../components/recipes/RecipeDetail';

const INGREDIENT_LIST = [
  { name: 'Babosa (Aloe Vera)', emoji: '🪴', benefits: ['Hidratação', 'Regeneração', 'Anti-inflamação'] },
  { name: 'Mel', emoji: '🍯', benefits: ['Antibacteriano', 'Hidratação', 'Cicatrização'] },
  { name: 'Aveia', emoji: '🌾', benefits: ['Esfoliação suave', 'Calmante', 'Limpeza'] },
  { name: 'Café', emoji: '☕', benefits: ['Esfoliação', 'Circulação', 'Anti-celulite'] },
  { name: 'Chá Verde', emoji: '🍵', benefits: ['Antioxidante', 'Anti-idade', 'Tonificante'] },
  { name: 'Óleo de Coco', emoji: '🥥', benefits: ['Hidratação profunda', 'Proteção', 'Nutrição'] },
  { name: 'Pepino', emoji: '🥒', benefits: ['Refrescante', 'Anti-olheiras', 'Hidratação'] },
  { name: 'Iogurte Natural', emoji: '🥛', benefits: ['Ácido lático', 'Clareamento', 'Hidratação'] },
  { name: 'Limão', emoji: '🍋', benefits: ['Vitamina C', 'Clareamento', 'Tonificante'] },
  { name: 'Arroz', emoji: '🍚', benefits: ['Clareamento', 'Anti-idade', 'Firmeza'] },
  { name: 'Açafrão', emoji: '🟡', benefits: ['Anti-inflamação', 'Luminosidade', 'Antioxidante'] },
  { name: 'Banana', emoji: '🍌', benefits: ['Hidratação', 'Nutrição', 'Suavização'] },
];

const ALL_RECIPES = [
  {
    name: 'Máscara Hidratante de Mel e Aveia',
    category: 'Máscara Facial',
    description: 'Receita nutritiva ideal para pele seca e sensível. Hidrata profundamente e suaviza a textura.',
    ingredients: ['Mel', 'Aveia'],
    instructions: '1. Misture 1 colher de sopa de mel com 2 colheres de aveia fina.\n2. Adicione algumas gotas de água morna se necessário para uma textura pastosa.\n3. Aplique no rosto limpo em movimentos circulares suaves.\n4. Deixe agir por 15 a 20 minutos.\n5. Enxágue com água morna em movimentos circulares — a aveia também esfoliará levemente.',
    duration_minutes: 20,
    benefits: ['Hidratação profunda', 'Esfoliação suave', 'Suavização', 'Nutrição'],
    frequency: '2x por semana',
    skin_types: ['seca', 'sensível', 'normal'],
    tips: 'Para peles muito secas, adicione meia colher de chá de óleo de coco à mistura.',
  },
  {
    name: 'Tônico Refrescante de Pepino',
    category: 'Tônico',
    description: 'Tônico leve e refrescante que hidrata, tonifica e reduz olheiras. Perfeito para uso diário.',
    ingredients: ['Pepino'],
    instructions: '1. Descasque e processe metade de um pepino gelado no liquidificador.\n2. Coe bem para obter apenas o líquido.\n3. Transfira para um frasco e refrigere.\n4. Aplique diariamente com algodão após a limpeza, como tônico facial.\n5. Conserve na geladeira por até 3 dias.',
    duration_minutes: 5,
    benefits: ['Refrescante', 'Anti-olheiras', 'Tonificante', 'Hidratação'],
    frequency: 'Diário',
    skin_types: ['todos os tipos'],
    tips: 'Pode ser aplicado nos olhos com algodão por 10 minutos para reduzir olheiras e inchaço.',
  },
  {
    name: 'Esfoliante Energizante de Café',
    category: 'Esfoliante',
    description: 'Esfoliante potente que estimula a circulação, combate a celulite e deixa a pele radiante.',
    ingredients: ['Café', 'Óleo de Coco'],
    instructions: '1. Misture 3 colheres de sopa de café moído com 2 colheres de óleo de coco.\n2. Adicione 1 colher de sopa de mel se desejar.\n3. Aplique no corpo úmido com movimentos circulares firmes.\n4. Massageie por 3-5 minutos nas áreas desejadas.\n5. Enxágue bem com água morna.\n6. Não use no rosto — a granulometria é muito grossa.',
    duration_minutes: 15,
    benefits: ['Esfoliação intensa', 'Circulação', 'Anti-celulite', 'Suavização'],
    frequency: '2x por semana',
    skin_types: ['todos os tipos — apenas para o corpo'],
    tips: 'Use o café recém-passado para aproveitar a cafeína ainda ativa, que é mais eficaz na circulação.',
  },
  {
    name: 'Máscara Clareadora de Iogurte e Limão',
    category: 'Máscara Facial',
    description: 'Combina o ácido lático do iogurte com a vitamina C do limão para clarear manchas e uniformizar o tom.',
    ingredients: ['Iogurte Natural', 'Limão'],
    instructions: '1. Misture 2 colheres de iogurte natural com algumas gotas de suco de limão.\n2. Aplique na pele limpa evitando a área dos olhos.\n3. Deixe agir por 10-15 minutos.\n4. Enxágue com água fria.\n5. Evite exposição solar nas 2 horas após o uso.',
    duration_minutes: 20,
    benefits: ['Clareamento', 'Uniformização do tom', 'Ácido lático', 'Vitamina C'],
    frequency: '1x por semana',
    skin_types: ['oleosa', 'mista', 'normal'],
    tips: 'Não use em pele sensível ou com feridas abertas. Sempre proteja do sol após o uso.',
  },
  {
    name: 'Hidratante Natural de Babosa e Mel',
    category: 'Hidratante',
    description: 'Gel hidratante leve e eficaz, ideal para uso diário. Hidrata sem pesar e acalma peles irritadas.',
    ingredients: ['Babosa (Aloe Vera)', 'Mel'],
    instructions: '1. Extraia o gel de uma folha fresca de babosa com uma colher.\n2. Bata o gel no liquidificador até ficar uniforme.\n3. Adicione 1 colher de chá de mel e misture bem.\n4. Aplique no rosto limpo após o tônico.\n5. Deixe absorver completamente antes de continuar a rotina.',
    duration_minutes: 5,
    benefits: ['Hidratação intensa', 'Calmante', 'Anti-inflamatório', 'Cicatrizante'],
    frequency: 'Diário',
    skin_types: ['todos os tipos'],
    tips: 'Pode ser armazenado na geladeira por até 1 semana. O gel gelado é especialmente calmante.',
  },
  {
    name: 'Água Micelar de Arroz',
    category: 'Limpeza',
    description: 'Tradicional ritual asiático que clareia, firma e suaviza a pele com água de arroz fermentada.',
    ingredients: ['Arroz'],
    instructions: '1. Lave 1/2 xícara de arroz cru.\n2. Deixe de molho em 1 copo de água por 30 minutos.\n3. Agite bem e coe. Use essa água como limpeza facial ou tônico.\n4. Para fermentação (mais poderosa): deixe em temperatura ambiente por 24h antes de usar.\n5. Aplique com algodão ou diretamente no rosto.\n6. Refrigere e use em até 1 semana.',
    duration_minutes: 5,
    benefits: ['Clareamento', 'Anti-idade', 'Firmeza', 'Suavização'],
    frequency: 'Diário',
    skin_types: ['todos os tipos'],
    tips: 'A água de arroz fermentada é mais potente que a fresca. O cheiro levemente azedo é normal.',
  },
  {
    name: 'Máscara Anti-idade de Banana e Mel',
    category: 'Máscara Facial',
    description: 'Rica em nutrientes que combatem o envelhecimento precoce e devolvem a luminosidade à pele.',
    ingredients: ['Banana', 'Mel'],
    instructions: '1. Amasse meia banana madura até obter uma pasta completamente lisa.\n2. Adicione 1 colher de sopa de mel e 1 colher de iogurte (opcional).\n3. Aplique no rosto limpo com uma camada generosa.\n4. Deixe agir por 20 minutos.\n5. Enxágue com água morna.',
    duration_minutes: 25,
    benefits: ['Anti-idade', 'Nutrição', 'Luminosidade', 'Hidratação'],
    frequency: '2x por semana',
    skin_types: ['seca', 'normal', 'madura'],
    tips: 'Use banana bem madura — quanto mais escura, mais rica em antioxidantes.',
  },
  {
    name: 'Sérum Antioxidante de Chá Verde',
    category: 'Sérum',
    description: 'Sérum caseiro poderoso contra radicais livres. Protege a pele dos danos do ambiente e do envelhecimento.',
    ingredients: ['Chá Verde'],
    instructions: '1. Prepare um chá verde forte: 2 sachês em 100ml de água quente por 10 min.\n2. Deixe esfriar completamente e refrigere.\n3. Aplique diariamente como tônico após a limpeza.\n4. Para sérum mais concentrado: ferva reduzindo o chá à metade do volume.\n5. Conserve na geladeira por até 1 semana.',
    duration_minutes: 5,
    benefits: ['Antioxidante', 'Anti-idade', 'Proteção', 'Tonificante'],
    frequency: 'Diário',
    skin_types: ['todos os tipos'],
    tips: 'O chá verde gelado tem efeito tensor imediato e ajuda a fechar os poros.',
  },
  {
    name: 'Máscara Luminosa de Açafrão e Iogurte',
    category: 'Máscara Facial',
    description: 'Tradicional na medicina ayurvédica, o açafrão ilumina o tom da pele e combate manchas com poderosos antioxidantes.',
    ingredients: ['Açafrão', 'Iogurte Natural', 'Mel'],
    instructions: '1. Misture 1/4 colher de chá de açafrão em pó com 2 colheres de iogurte.\n2. Adicione 1 colher de mel para suavizar.\n3. Aplique no rosto limpo evitando os olhos.\n4. Aguarde 15 minutos.\n5. Enxágue bem com água morna — pode manchar toalhas, use uma antiga.',
    duration_minutes: 20,
    benefits: ['Luminosidade', 'Anti-inflamatório', 'Uniformização', 'Antioxidante'],
    frequency: '1x por semana',
    skin_types: ['todos os tipos'],
    tips: 'O açafrão pode tingir levemente a pele de quem tem pele muito clara. Isso passa em horas.',
  },
  {
    name: 'Demaquilante com Óleo de Coco',
    category: 'Limpeza',
    description: 'Método OCM (Oil Cleansing Method): dissolve maquiagem e impurezas enquanto nutre a pele profundamente.',
    ingredients: ['Óleo de Coco'],
    instructions: '1. Coloque uma quantidade de óleo de coco do tamanho de uma moeda nas palmas.\n2. Aqueça levemente entre as mãos.\n3. Massageie no rosto seco, inclusive na maquiagem, por 1-2 minutos.\n4. Umedeça as mãos e continue massageando para emulsionar o óleo.\n5. Enxágue completamente com água morna. Pode enxaguar 2x se necessário.',
    duration_minutes: 5,
    benefits: ['Remoção de maquiagem', 'Nutrição', 'Hidratação profunda', 'Limpeza'],
    frequency: 'Diário (noturno)',
    skin_types: ['seca', 'normal', 'mista'],
    tips: 'Para pele oleosa, use em menor quantidade apenas para remover maquiagem, seguido de limpeza suave.',
  },
  {
    name: 'Esfoliante Suave de Aveia e Limão',
    category: 'Esfoliante',
    description: 'Esfoliante para o rosto que remove células mortas, clareia e deixa a pele vibrante.',
    ingredients: ['Aveia', 'Limão', 'Mel'],
    instructions: '1. Misture 2 colheres de aveia fina com 1 colher de mel.\n2. Adicione algumas gotas de suco de limão (máx. 1/4 limão).\n3. Aplique no rosto com movimentos circulares suaves por 2 minutos.\n4. Deixe agir por mais 5 minutos como máscara.\n5. Enxágue bem com água morna.',
    duration_minutes: 15,
    benefits: ['Esfoliação', 'Clareamento', 'Renovação celular', 'Luminosidade'],
    frequency: '1x por semana',
    skin_types: ['normal', 'mista', 'oleosa'],
    tips: 'Evite em pele muito sensível. Após o uso, proteja-se do sol pois o limão fotossensibiliza.',
  },
  {
    name: 'Máscara Calmante de Aveia e Babosa',
    category: 'Máscara Facial',
    description: 'Receita ideal para peles irritadas, com vermelhidão ou reativas. Acalma e restaura a barreira cutânea.',
    ingredients: ['Aveia', 'Babosa (Aloe Vera)'],
    instructions: '1. Processe 2 colheres de aveia até obter farinha fina.\n2. Misture com 2 colheres de gel de babosa fresco.\n3. A textura deve ser pastosa — adicione água morna se necessário.\n4. Aplique delicadamente no rosto sem esfregar.\n5. Deixe agir por 20 minutos.\n6. Enxágue com água fria com movimentos suaves.',
    duration_minutes: 25,
    benefits: ['Calmante', 'Anti-inflamatório', 'Hidratação', 'Restauração da barreira cutânea'],
    frequency: '2x por semana',
    skin_types: ['sensível', 'reativa', 'seca'],
    tips: 'Guarde na geladeira e aplique fria para efeito ainda mais calmante.',
  },
];

export default function Recipes() {
  const [search, setSearch] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [generatedRecipes, setGeneratedRecipes] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const toggleIngredient = (name) => {
    setSelectedIngredients(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const findRecipes = () => {
    if (selectedIngredients.length === 0) {
      setGeneratedRecipes(ALL_RECIPES);
      return;
    }
    const matching = ALL_RECIPES.filter(r =>
      r.ingredients.some(ing => selectedIngredients.includes(ing))
    );
    setGeneratedRecipes(matching.length > 0 ? matching : ALL_RECIPES);
  };

  const filteredIngredients = INGREDIENT_LIST.filter(ing =>
    ing.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <style>{`
        .bg-emerald-700 { background-color: #FB45A9 !important; }
        .bg-emerald-800 { background-color: #E03594 !important; }
        .hover\\:bg-emerald-800:hover { background-color: #E03594 !important; }
        .text-emerald-600 { color: #FFB3DD !important; }
        .text-emerald-700 { color: #FB45A9 !important; }
        .text-emerald-800 { color: #E03594 !important; }
        .border-emerald-500 { border-color: #FB45A9 !important; }
        .border-emerald-300 { border-color: #FFB3DD !important; }
        .bg-emerald-50 { background-color: #FFF5FA !important; }
      `}</style>

      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Receitas Naturais</h1>
        <p className="text-stone-500 mt-1">Selecione seus ingredientes e descubra tratamentos</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          placeholder="Buscar ingrediente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 rounded-xl bg-white border-stone-200 h-12"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Selecione o que você tem em casa
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredIngredients.map((ing) => (
            <button
              key={ing.name}
              onClick={() => toggleIngredient(ing.name)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                selectedIngredients.includes(ing.name)
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <span className="text-lg">{ing.emoji}</span>
              <div>
                <p className={`text-sm font-medium ${
                  selectedIngredients.includes(ing.name) ? 'text-emerald-800' : 'text-stone-700'
                }`}>
                  {ing.name}
                </p>
                <p className="text-xs text-stone-400 hidden sm:block">{ing.benefits[0]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={findRecipes}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl p-4 font-semibold transition-all flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {selectedIngredients.length > 0
          ? `Ver Receitas com ${selectedIngredients.length} ingrediente${selectedIngredients.length > 1 ? 's' : ''}`
          : 'Ver Todas as Receitas'}
      </button>

      {generatedRecipes && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-800">
            {generatedRecipes.length} Receitas Encontradas
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {generatedRecipes.map((recipe, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedRecipe(recipe)}
                className="bg-white rounded-2xl p-5 border border-stone-200 text-left hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">
                      {recipe.category}
                    </p>
                    <h3 className="font-semibold text-stone-800 mb-2">{recipe.name}</h3>
                    <p className="text-sm text-stone-500 line-clamp-2">{recipe.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0 ml-2" />
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Leaf className="w-3 h-3" />
                    {recipe.ingredients?.length} ingredientes
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}