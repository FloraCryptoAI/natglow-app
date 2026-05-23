import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)

  const fetchSubscription = useCallback(async (userId) => {
    if (!userId) {
      setSubscription(null)
      return
    }
    setSubscriptionLoading(true)
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      setSubscription(data)
    } catch (_) {
      setSubscription(null)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  useEffect(() => {
    // Resolve o auth imediatamente — não bloqueia em fetchSubscription
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      setAuthLoading(false)
      if (u) fetchSubscription(u.id)
    })

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        setAuthLoading(false)
        if (u) fetchSubscription(u.id)
        else setSubscription(null)
      }
    )

    return () => authListener.unsubscribe()
  }, [fetchSubscription])

  // Realtime: revoga acesso imediatamente quando o webhook muda o status da subscription
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`sub-status-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setSubscription(payload.new)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const signInWithGoogle = async (returnPath = '/Landing') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + returnPath },
    })
    if (error) throw error
  }

  const signInWithOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/HairDashboard' },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const isSubscribed = ['active', 'pending'].includes(subscription?.status)

  return (
    <AuthContext.Provider value={{
      user,
      loading: authLoading,
      subscriptionLoading,
      subscription,
      isSubscribed,
      fetchSubscription,
      signInWithGoogle,
      signInWithOtp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
