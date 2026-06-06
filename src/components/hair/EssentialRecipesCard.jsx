import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTranslatedHairData } from '@/hooks/useTranslatedHairData'

// 3 main essentials + 1 optional (progresiva caseira). Optional renders
// with amber styling to differentiate from the regular efficacy recipes.
const ESSENTIAL_IDS = ['babosa-mel', 'tratamento-noturno-oleo', 'mel-de-babosa']
const OPTIONAL_ID = 'maizena-acucar'
const ESSENTIAL_EMOJIS = {
  'babosa-mel': '🌿',
  'tratamento-noturno-oleo': '🌙',
  'mel-de-babosa': '🍯',
  'maizena-acucar': '🌿',
}
const ESSENTIAL_STAR = { 'babosa-mel': true, 'mel-de-babosa': true }

function TagBadge({ tag, tagLabels }) {
  const data = tagLabels[tag]
  if (!data) return null
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${data.color}`}>
      {data.label}
    </span>
  )
}

export default function EssentialRecipesCard({ onSelectRecipe, variant = 'dashboard' }) {
  const { t } = useTranslation()
  const { tagLabels, getRecipeById } = useTranslatedHairData()
  const essentials = ESSENTIAL_IDS.map(id => getRecipeById(id)).filter(Boolean)
  const optional = getRecipeById(OPTIONAL_ID)
  const essentialDisplay = t('hairDashboard.essentialRecipes', { returnObjects: true })

  // Slight title size variation by where it's used
  const titleClass = variant === 'recipes'
    ? 'text-base font-bold text-stone-900'
    : 'text-lg font-bold text-stone-900'

  const subtitle = variant === 'recipes'
    ? t('hairRecipes.essentialSubtitle')
    : t('hairDashboard.essentialSubtitle')

  const sectionTitle = variant === 'recipes'
    ? t('hairRecipes.essentialTitle')
    : t('hairDashboard.essentialTitle')

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-brand-bg to-white border-b border-stone-100 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          <h2 className={titleClass}>{sectionTitle}</h2>
        </div>
        {variant === 'dashboard' && (
          <p className="text-xs font-semibold text-brand mb-1">{t('hairDashboard.essentialLabel')}</p>
        )}
        <p className="text-sm text-stone-500 leading-relaxed">{subtitle}</p>
      </div>

      <div className="divide-y divide-stone-100">
        {essentials.map(recipe => {
          const disp = essentialDisplay?.[recipe.id] || {}
          return (
            <button
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-full bg-brand-bg border border-brand-pale flex items-center justify-center text-xl flex-shrink-0">
                {ESSENTIAL_EMOJIS[recipe.id] || '🌿'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-bold text-stone-800 text-sm">{disp.shortName || recipe.name}</p>
                  <TagBadge tag={recipe.tag} tagLabels={tagLabels} />
                  {ESSENTIAL_STAR[recipe.id] && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-stone-400 leading-snug">{disp.shortDesc || recipe.description}</p>
              </div>
            </button>
          )
        })}

        {optional && (
          <button
            onClick={() => onSelectRecipe(optional)}
            className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-all text-left border-t-2 border-amber-200"
          >
            <div className="w-11 h-11 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center text-xl flex-shrink-0">
              {ESSENTIAL_EMOJIS[optional.id] || '🌿'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="font-bold text-stone-800 text-sm">{essentialDisplay?.[optional.id]?.shortName || optional.name}</p>
                <TagBadge tag="opcional" tagLabels={tagLabels} />
              </div>
              <p className="text-xs text-stone-500 leading-snug">{essentialDisplay?.[optional.id]?.shortDesc || optional.description}</p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
