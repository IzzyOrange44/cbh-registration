// components/ProtectedRoute.tsx
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: ReactNode
  requiresProfileCompletion?: boolean
  allowedRoles?: string[]
}

export function ProtectedRoute({ 
  children, 
  requiresProfileCompletion = false, 
  allowedRoles = []
}: ProtectedRouteProps) {
  const { user, loading, profileCompleted, ready } = useAuth()
  const location = useLocation()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    console.log('ProtectedRoute - Auth State:', {
      user: user?.email,
      loading,
      profileCompleted,
      ready,
      currentPath: location.pathname,
      requiresProfileCompletion,
      allowedRoles,
      userRole
    })
  }, [user, loading, profileCompleted, ready, location.pathname, requiresProfileCompletion, allowedRoles, userRole])

  // Fetch user role from database when user is available
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setRoleLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setUserRole(data.role)
        } else {
          console.error('Error fetching user role:', error)
          setUserRole(null)
        }
      } catch (err) {
        console.error('Error fetching user role:', err)
        setUserRole(null)
      } finally {
        setRoleLoading(false)
      }
    }

    if (user && ready) {
      fetchUserRole()
    } else {
      setRoleLoading(false)
    }
  }, [user, ready])

  // Show loading while auth is initializing OR while fetching role
  if (!ready || profileCompleted === null || roleLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access using database role
  if (allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log(`Access denied. User role: ${userRole}, Required roles:`, allowedRoles)
      return <Navigate to="/dashboard" replace />
    }
  }

  // Check profile completion requirement
  if (requiresProfileCompletion && !profileCompleted) {
    console.log('Profile completion required, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Specific route protection components for cleaner usage

export function AuthRequired({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  )
}

export function ProfileRequired({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiresProfileCompletion={true}>
      {children}
    </ProtectedRoute>
  )
}

export function ParentGuardianRequired({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute 
      requiresProfileCompletion={true} 
      allowedRoles={['parent_guardian']}
    >
      {children}
    </ProtectedRoute>
  )
}

export function AdminRequired({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute 
      requiresProfileCompletion={true} 
      allowedRoles={['admin']}
    >
      {children}
    </ProtectedRoute>
  )
}