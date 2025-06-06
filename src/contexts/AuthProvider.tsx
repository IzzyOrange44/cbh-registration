
import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  ready: boolean
  signUp: (email: string, password: string, accountType?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  profileCompleted: boolean | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null)

  const fetchAndSetProfileStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', userId)
        .single()

      if (profile && !error) {
        setProfileCompleted(profile.profile_completed ?? false)
      } else {
        console.warn("Could not fetch profile_completed:", error)
        setProfileCompleted(false)
      }
    } catch (err) {
      console.error("Unexpected error in fetchAndSetProfileStatus:", err)
      setProfileCompleted(false)
    }
  }

  const fetchSessionAndProfile = async (session: Session | null) => {
    if (session?.user) {
      setSession(session)
      setUser(session.user)
      await fetchAndSetProfileStatus(session.user.id)
    } else {
      setSession(null)
      setUser(null)
      setProfileCompleted(false)
    }
    setLoading(false)
    setReady(true)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn("Auth loading timed out – forcing ready state.")
      setLoading(false)
      setReady(true)
    }, 8000)

    supabase.auth.getSession().then(({ data }) => {
      fetchSessionAndProfile(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionAndProfile(session)
    })

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signUp = async (email: string, password: string, accountType: string = "guardian") => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) {
      return { error: error as Error }
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      account_type: accountType,
      profile_completed: false
    })

    if (insertError && insertError.code !== '23505') {
      console.error('Error creating profile during signup:', insertError)
      return { error: insertError as Error }
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error as Error | null }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, ready, signUp, signIn, signOut, profileCompleted }}>
      {children}
    </AuthContext.Provider>
  )
}
