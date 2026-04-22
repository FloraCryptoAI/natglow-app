import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/api/supabaseClient'
import { useAuth } from '@/lib/AuthContext'

const LS_KEY = 'hairPlanState'
const DEFAULT = { phase: 1, completedWeeks: [] }

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
  const [planState, setPlanState] = useState(fromLS)
  const [loading, setLoading] = useState(!!user)

  useEffect(() => {
    if (!user) { setLoading(false); return }

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
        } else {
          // Migração: se localStorage tem progresso, sobe para o Supabase
          const local = fromLS()
          if (local.phase > 1 || local.completedWeeks.length > 0) {
            saveToSupabase(user.id, local)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const updatePlanState = useCallback((newState) => {
    setPlanState(newState)
    toLS(newState)
    if (user) saveToSupabase(user.id, newState)
  }, [user])

  return { planState, updatePlanState, loading }
}
