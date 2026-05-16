import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

// Handles Supabase magic link redirects.
// On success: Supabase client auto-processes the session from the URL hash
//             and onAuthStateChange fires → useAuth updates → redirects below.
// On error:  Supabase sends ?error=access_denied&error_description=... in the URL.
export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, subscriptionLoading, isSubscribed } = useAuth()

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search)
    const hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ''))

    const error       = params.get('error')      || hashParams.get('error')
    const description = params.get('error_description') || hashParams.get('error_description') || ''

    if (error) {
      const email      = params.get('email') || ''
      const emailQuery = email ? `&email=${encodeURIComponent(email)}` : ''

      if (description.toLowerCase().includes('expired') || description.toLowerCase().includes('otp')) {
        navigate(`/Login?expired=true${emailQuery}`, { replace: true })
      } else if (description.toLowerCase().includes('used') || description.toLowerCase().includes('already')) {
        navigate('/Login?used=true', { replace: true })
      } else {
        navigate('/Login?invalid=true', { replace: true })
      }
    }
    // No error: wait for onAuthStateChange to fire (handled in the next useEffect)
  }, [navigate])

  useEffect(() => {
    if (!user) return
    if (subscriptionLoading) return
    navigate(isSubscribed ? '/HairDashboard' : '/Upgrade', { replace: true })
  }, [user, isSubscribed, subscriptionLoading, navigate])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FB45A9' }} />
    </div>
  )
}
