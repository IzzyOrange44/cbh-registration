import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User, AuthError } from '@supabase/supabase-js'

export type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, accountType?: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  profileCompleted: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileCompleted, setProfileCompleted] = useState(false)

  const checkProfileStatus = async (userId: string, userEmail?: string) => {
    console.log('Checking profile status for user:', userId)
    try {
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching profile:', fetchError)
        setProfileCompleted(false)
        return
      }
      
      // Only create profile if it doesn't exist
      if (!existingProfile) {
        console.log('Profile does not exist, creating...')
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail || '',
            profile_completed: false
          })
        
        if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
          console.error('Error creating profile:', insertError)
        }
        
        // For new profiles, we know it's not completed
        setProfileCompleted(false)
        return
      }
      
      // Profile exists, check completion status
      console.log('Profile exists, completed:', existingProfile.profile_completed)
      setProfileCompleted(existingProfile.profile_completed || false)
    } catch (err) {
      console.error('Unexpected error in checkProfileStatus:', err)
      setProfileCompleted(false)
    }
  }

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await checkProfileStatus(session.user.id, session.user.email)
          }
          
          setLoading(false)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        console.log('Auth state changed:', _event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await checkProfileStatus(session.user.id, session.user.email)
        } else {
          setProfileCompleted(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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