import React, { createContext, useContext, useState, useCallback } from 'react'

const AdminAuthContext = createContext(null)

const SESSION_KEY = 'admin_session_v1'

function decodeJWTPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
    return JSON.parse(atob(b64 + pad))
  } catch {
    return null
  }
}

function isTokenValid(token) {
  if (!token) return false
  const payload = decodeJWTPayload(token)
  if (!payload?.exp || payload.role !== 'admin') return false
  return Math.floor(Date.now() / 1000) < payload.exp
}

export function AdminAuthProvider({ children }) {
  const [adminToken, setAdminTokenState] = useState(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored && isTokenValid(stored) ? stored : null
  })

  const setAdminToken = useCallback((token) => {
    sessionStorage.setItem(SESSION_KEY, token)
    setAdminTokenState(token)
  }, [])

  const clearAdminToken = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setAdminTokenState(null)
  }, [])

  const isAdmin = isTokenValid(adminToken)

  return (
    <AdminAuthContext.Provider value={{ adminToken, isAdmin, setAdminToken, clearAdminToken }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
