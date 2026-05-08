import React from 'react'
import { Drawer } from 'vaul'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'

function getLocale(lang) {
  return lang === 'es' ? es : enUS
}

function relativeTime(dateStr, lang) {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: getLocale(lang),
    })
  } catch {
    return ''
  }
}

function NotificationItem({ notification, lang, onMarkAsRead, onClose }) {
  const navigate = useNavigate()
  const isUnread = !notification.read_at
  const title = lang === 'es' ? notification.title_es : notification.title_en
  const body = lang === 'es' ? notification.body_es : notification.body_en

  const handleClick = () => {
    if (isUnread) onMarkAsRead(notification.id)
    if (notification.url) {
      onClose()
      navigate(notification.url)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 ${
        isUnread ? 'bg-brand-bg/40' : ''
      }`}
    >
      <div className={`mt-0.5 w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
        isUnread ? 'bg-brand/10' : 'bg-stone-100'
      }`}>
        <Bell className={`w-4 h-4 ${isUnread ? 'text-brand' : 'text-stone-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-sm leading-snug flex-1 ${isUnread ? 'font-semibold text-stone-800' : 'font-medium text-stone-600'}`}>
            {title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-brand rounded-full" />
          )}
        </div>
        <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{body}</p>
        <p className="text-[11px] text-stone-400 mt-1">
          {relativeTime(notification.created_at, lang)}
        </p>
      </div>
    </button>
  )
}

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'es' ? 'es' : 'en'
  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Drawer.Content className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-sm bg-white shadow-2xl outline-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-stone-100">
            <div>
              <p className="font-semibold text-stone-800">{t('notifications.title')}</p>
              {unreadCount > 0 && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {unreadCount} {unreadCount === 1 ? 'new' : 'new'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-600">{t('notifications.empty')}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{t('notifications.emptySubtitle')}</p>
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  lang={lang}
                  onMarkAsRead={onMarkAsRead}
                  onClose={onClose}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-stone-100">
            <Link
              to="/HairSettings"
              onClick={onClose}
              className="text-xs text-stone-400 hover:text-brand transition-colors"
            >
              {t('notifications.settingsLink')} →
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
