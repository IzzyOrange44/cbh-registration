import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts'
import { useEffect } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileCompleted } = useAuth()
  const location = useLocation()
  
  useEffect(() => {
    // Log the current auth state for debugging
    console.log('ProtectedRoute - Auth State:', {
      user: user?.email,
      loading,
      profileCompleted,
      currentPath: location.pathname
    })
  }, [user, loading, profileCompleted, location.pathname])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    // Redirect to login, but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if profile is complete (except for the complete-profile page itself)
  if (!profileCompleted && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }
  
  // If we're on the complete-profile page but profile is already complete, redirect to dashboard
  if (profileCompleted && location.pathname === '/complete-profile') {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}