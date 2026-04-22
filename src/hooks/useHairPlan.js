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

export function useHairPlan() {
  const { user } = useAuth()
  const [planState, setPlanState] = useState(fromLS)
  const [loading, setLoading] = useState(!!user)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('hair_plan_state')
      .select('phase, completed_weeks')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const state = { phase: data.phase, completedWeeks: data.completed_weeks ?? [] }
          setPlanState(state)
          toLS(state)
        } else {
          // Migração: sobe localStorage para o Supabase se tiver progresso
          const local = fromLS()
          if (local.phase > 1 || local.completedWeeks.length > 0) {
            supabase.from('hair_plan_state').upsert({
              user_id: user.id,
              phase: local.phase,
              completed_weeks: local.completedWeeks,
              updated_at: new Date().toISOString(),
            })
          }
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const updatePlanState = useCallback((newState) => {
    setPlanState(newState)
    toLS(newState)

    if (user) {
      supabase.from('hair_plan_state').upsert({
        user_id: user.id,
        phase: newState.phase,
        completed_weeks: newState.completedWeeks,
        updated_at: new Date().toISOString(),
      })
    }
  }, [user])

  return { planState, updatePlanState, loading }
}
