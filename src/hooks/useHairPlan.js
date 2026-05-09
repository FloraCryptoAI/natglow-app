import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/api/supabaseClient'
import { useAuth } from '@/lib/AuthContext'

const LS_KEY = 'hairPlanState'
const DEFAULT = { phase: 1, completedWeeks: [] }
const CACHE_TTL = 5 * 60 * 1000

// Module-level cache — persists across React remounts within the same browser session
let _cache = { state: null, uid: null, ts: 0 }

function fromLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? DEFAULT }
  catch { return DEFAULT }
}
function toLS(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state))
}

async function saveToSupabase(userId, state) {
  const { error } = await supabase.from('hair_plan_state').upsert({
    user_id: userId,
    phase: state.phase,
    completed_weeks: state.completedWeeks,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('[useHairPlan] save error:', error)
}

export function useHairPlan() {
  const { user } = useAuth()

  const hasFreshCache = _cache.uid === user?.id && _cache.state !== null && (Date.now() - _cache.ts) < CACHE_TTL

  const [planState, setPlanState] = useState(() => _cache.state ?? fromLS())
  const [loading, setLoading] = useState(!!user && !hasFreshCache)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    if (hasFreshCache) return

    setLoading(true)
    supabase
      .from('hair_plan_state')
      .select('phase, completed_weeks')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[useHairPlan] fetch error:', error)
        if (data) {
          const state = { phase: data.phase, completedWeeks: data.completed_weeks ?? [] }
          setPlanState(state)
          toLS(state)
          _cache = { state, uid: user.id, ts: Date.now() }
        } else {
          const local = fromLS()
          if (local.phase > 1 || local.completedWeeks.length > 0) {
            saveToSupabase(user.id, local)
          }
          _cache = { state: local, uid: user.id, ts: Date.now() }
        }
      })
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const updatePlanState = useCallback((newState) => {
    setPlanState(newState)
    toLS(newState)
    _cache = { state: newState, uid: user?.id ?? null, ts: Date.now() }
    if (user) saveToSupabase(user.id, newState)
  }, [user])

  return { planState, updatePlanState, loading }
}
