import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User, AuthError } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  profileCompleted: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileCompleted, setProfileCompleted] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        checkProfileStatus(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        checkProfileStatus(session.user.id)
      } else {
        setProfileCompleted(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkProfileStatus = async (userId: string, userEmail?: string) => {
  try {
    // Use upsert to avoid conflicts
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: userEmail || user?.email || '',
        profile_completed: false,
        account_type: 'guardian'
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      })
    
    if (upsertError) {
      console.error('Error upserting profile:', upsertError)
    }
    
    // Now fetch the profile
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_completed')
      .eq('id', userId)
      .single()
    
    if (!error && data) {
      setProfileCompleted(data.profile_completed || false)
    } else {
      setProfileCompleted(false)
    }
  } catch (err) {
    console.error('Unexpected error in checkProfileStatus:', err)
    setProfileCompleted(false)
  }
}

// Update the useEffect to pass email
useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setUser(session?.user ?? null)
    if (session?.user) {
      checkProfileStatus(session.user.id, session.user.email)
    }
    setLoading(false)
  })

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
    setUser(session?.user ?? null)
    if (session?.user) {
      checkProfileStatus(session.user.id, session.user.email)
    } else {
      setProfileCompleted(false)
    }
  })

  return () => subscription.unsubscribe()
}, [])
  const signUp = async (email: string, password: string) => {
    const result = await supabase.auth.signUp({ email, password })
    return { error: result.error }
  }

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    return { error: result.error }
  }

  const signOut = async () => {
    const result = await supabase.auth.signOut()
    return { error: result.error }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      profileCompleted 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}