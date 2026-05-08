import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/AdminAuthContext'

export function useAdminFetch() {
  const { adminToken, clearAdminToken } = useAdminAuth()
  const navigate = useNavigate()

  const headers = useMemo(() => ({
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-admin-token': adminToken,
    'Content-Type': 'application/json',
  }), [adminToken])

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } })
    if (res.status === 401 || res.status === 403) {
      clearAdminToken()
      navigate('/admin/login', { replace: true })
      return null
    }
    const data = await res.json()
    if (data?.error) throw new Error(data.error)
    return data
  }, [headers, clearAdminToken, navigate, baseUrl])

  return { apiFetch }
}
