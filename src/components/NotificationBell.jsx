import React, { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import NotificationDrawer from './NotificationDrawer'

export default function NotificationBell() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userId, setUserId] = useState(null)
  const channelRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      loadNotifications(user.id)
      subscribeRealtime(user.id)
    })
    return () => {
      channelRef.current?.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadNotifications(uid) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data)
  }

  function subscribeRealtime(uid) {
    channelRef.current = supabase
      .channel(`notifications:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          )
        }
      )
      .subscribe()
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  async function markAsRead(id) {
    const now = new Date().toISOString()
    await supabase.from('notifications').update({ read_at: now }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
    )
  }

  async function markAllAsRead() {
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id)
    if (!ids.length) return
    const now = new Date().toISOString()
    await supabase.from('notifications').update({ read_at: now }).in('id', ids)
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })))
  }

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="relative p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-xl hover:bg-stone-100"
        aria-label={t('notifications.bell.tooltip')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-brand text-white text-[10px] font-bold rounded-full px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  )
}
