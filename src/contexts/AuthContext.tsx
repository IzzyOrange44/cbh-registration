import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User, AuthError } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, accountType?: string) => Promise<{ error: AuthError | null }>
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

  const checkProfileStatus = async (userId: string, userEmail?: string) => {
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      // Only create profile if it doesn't exist
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail || user?.email || '',
            profile_completed: false
            // Don't set account_type here - let SignUpPage handle it
          })
        
        if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
          console.error('Error creating profile:', insertError)
        }
      }
      
      // Now fetch the profile to check completion status
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

  const signUp = async (email: string, password: string, accountType?: string) => {
    const result = await supabase.auth.signUp({ email, password })
    
    // If signup successful and we have an account type, update the profile
    if (!result.error && result.data.user && accountType) {
      await supabase
        .from('profiles')
        .update({ account_type: accountType })
        .eq('id', result.data.user.id)
    }
    
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