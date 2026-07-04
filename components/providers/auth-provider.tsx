'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isAuthRateLimitError } from '@/lib/utils/auth-errors'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  rateLimited: boolean
  retrySession: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  rateLimited: false,
  retrySession: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rateLimited, setRateLimited] = useState(false)
  const supabase = createClient()

  const loadSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      if (error && isAuthRateLimitError(error)) {
        setRateLimited(true)
        return
      }
      setRateLimited(false)
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
    } catch (err) {
      if (isAuthRateLimitError(err)) {
        setRateLimited(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setRateLimited(false)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadSession, supabase])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        rateLimited,
        retrySession: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
