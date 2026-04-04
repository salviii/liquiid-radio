import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    configured: isSupabaseConfigured(),
  })

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
      }))
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(s => ({
          ...s,
          session,
          user: session?.user ?? null,
          loading: false,
        }))
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signInWithMagicLink,
    signOut,
  }
}
