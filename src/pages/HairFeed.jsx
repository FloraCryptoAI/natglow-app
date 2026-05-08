import React from 'react'
import { Newspaper } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function HairFeed() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
        <Newspaper className="w-8 h-8 text-brand" />
      </div>
      <h1 className="text-xl font-bold text-stone-800 mb-2">{t('feed.comingSoonTitle')}</h1>
      <p className="text-sm text-stone-400 max-w-xs leading-relaxed">{t('feed.comingSoonDesc')}</p>
    </div>
  )
}
