import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  ready: boolean
  signUp: (email: string, password: string, accountType?: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  profileCompleted: boolean | null
  refreshProfileStatus: () => Promise<void>
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
      console.log('Checking profile status for user:', userId)
      
      // Check if user_profile exists at all
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, phone, role')
        .eq('id', userId)
        .single()

      console.log('Profile data:', profile, 'Error:', profileError)

      if (profileError && profileError.code === 'PGRST116') {
        // User doesn't exist in user_profiles table - create a basic record
        console.log('No profile found, creating basic profile record')
        
        const { data: user } = await supabase.auth.getUser()
        if (user.user) {
          const basicProfile = {
            id: userId,
            email: user.user.email,
            first_name: user.user.user_metadata?.first_name || '',
            last_name: user.user.user_metadata?.last_name || '',
            role: user.user.user_metadata?.role || 'participant'
          }

          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert(basicProfile)

          if (insertError) {
            console.error('Failed to create basic profile:', insertError)
            setProfileCompleted(false)
            return
          }

          console.log('Basic profile created, but needs completion')
          setProfileCompleted(false) // Profile exists but needs completion (missing phone, etc.)
        }
      } else if (profile) {
        // Profile exists - check if it's "complete"
        // Consider complete if they have phone number (required in completion form)
        if (profile.phone && profile.phone.trim()) {
          console.log('Profile completed - has required info')
          setProfileCompleted(true)
        } else {
          console.log('Profile exists but needs completion - missing phone')
          setProfileCompleted(false)
        }
      } else {
        console.log('Profile check failed')
        setProfileCompleted(false)
      }
    } catch (err) {
      console.error("Unexpected error in fetchAndSetProfileStatus:", err)
      setProfileCompleted(false)
    }
  }

  const fetchSessionAndProfile = async (session: Session | null) => {
    console.log('fetchSessionAndProfile called with session:', session?.user?.email)
    
    if (session?.user) {
      console.log('Setting user and session')
      setSession(session)
      setUser(session.user)
      await fetchAndSetProfileStatus(session.user.id)
    } else {
      console.log('No session, clearing user state')
      setSession(null)
      setUser(null)
      setProfileCompleted(null)
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

    console.log('Getting initial session...')
    supabase.auth.getSession().then(({ data }) => {
      console.log('Initial session:', data.session?.user?.email)
      fetchSessionAndProfile(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session user:', session?.user?.email)
      
      // Handle email confirmation
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        console.log('Email confirmed, user signed in')
        
        // Give a small delay to ensure the trigger has run
        setTimeout(async () => {
          console.log('Checking for user profile after email confirmation...')
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name')
            .eq('id', session.user.id)
            .single()

          console.log('Profile check result:', existingProfile)
          
          if (!existingProfile) {
            console.log('No profile found, redirecting to dashboard for profile creation')
            // No profile found, let the normal flow handle it
          }
        }, 1000) // 1 second delay to let trigger complete
      }
      
      fetchSessionAndProfile(session)
    })

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const refreshProfileStatus = async () => {
    if (user?.id) {
      console.log('Manually refreshing profile status for:', user.id)
      await fetchAndSetProfileStatus(user.id)
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    accountType: string = "participant",
    firstName?: string,
    lastName?: string
  ) => {
    console.log('SignUp called with:', { email, accountType, firstName, lastName })
    
    // Map accountType to the new user_role enum
    const roleMapping: Record<string, string> = {
      'participant': 'participant',
      'parent_guardian': 'parent_guardian',
      'coach': 'coach',
      'volunteer': 'volunteer'
    }
  
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          account_type: accountType,
          role: roleMapping[accountType] || 'participant',
          first_name: firstName || '',
          last_name: lastName || ''
        }
      }
    })

    console.log('SignUp result:', { data: data?.user?.email, error })
  
    if (error) {
      return { error: error as Error }
    }
  
    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    try {
      console.log('Starting sign out process...')
      
      // Clear local state immediately to prevent infinite loading
      setLoading(true)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase sign out error:', error)
        // Even if there's an error, clear the local state
      }
      
      // Force clear all auth state
      setUser(null)
      setSession(null)
      setProfileCompleted(null)
      setLoading(false)
      setReady(true)
      
      console.log('Sign out completed, state cleared')
      
      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/login' // or wherever you want to redirect
      }, 100)
      
      return { error: error as Error | null }
    } catch (err) {
      console.error('Sign out error:', err)
      
      // Force clear state even on error
      setUser(null)
      setSession(null)
      setProfileCompleted(null)
      setLoading(false)
      setReady(true)
      
      // Still redirect on error
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
      
      return { error: err as Error }
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, ready, signUp, signIn, signOut, profileCompleted, refreshProfileStatus }}>
      {children}
    </AuthContext.Provider>
  )
}